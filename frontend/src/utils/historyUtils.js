// src/utils/historyUtils.js
// 简历历史记录管理工具

const HISTORY_STORAGE_KEY = 'resume_history';
const AUTO_SAVE_INTERVAL = 30000; // 30秒自动保存
const MAX_HISTORY_ITEMS = 50; // 最大历史记录数量

// 历史记录数据结构
export const createHistoryItem = (content, config, resumeData, action = 'manual') => ({
  id: Date.now().toString(),
  timestamp: new Date().toISOString(),
  content: content,
  config: { ...config },
  resumeData: resumeData ? { ...resumeData } : null,
  action: action, // 'upload', 'form', 'edit', 'ai_polish', 'ai_expand', 'ai_contract', 'manual'
  title: generateTitle(action, content),
  preview: generatePreview(content)
});

// 生成历史记录标题（之后改）
const generateTitle = (action, content) => {
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const actionMap = {
    'upload': '上传简历',
    'form': '填写简历',
    'edit': '编辑简历',
    'ai_polish': 'AI优化',
    'ai_expand': 'AI扩展',
    'ai_contract': 'AI压缩',
    'manual': '手动保存'
  };
  
  const actionName = actionMap[action] || '操作';
  const name = extractNameFromContent(content);
  return `${name} (${timeStr})`;
  // return `${actionName} - ${name} (${timeStr})`;
};

// 从内容中提取姓名
const extractNameFromContent = (content) => {
  if (!content) return '未命名';
  
  // 尝试从markdown内容中提取姓名
  const nameMatch = content.match(/^#\s*(.+)$/m) || 
                   content.match(/^姓名[：:]\s*(.+)$/m) ||
                   content.match(/^Name[：:]\s*(.+)$/m);
  
  return nameMatch ? nameMatch[1].trim() : '未命名';
};

// 生成预览内容
const generatePreview = (content) => {
  if (!content) return '';
  
  // 移除markdown标记，保留纯文本
  const plainText = content
    .replace(/^#+\s*/gm, '') // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接标记
    .replace(/`([^`]+)`/g, '$1') // 移除代码标记
    .trim();
  
  return plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
};

// 获取所有历史记录
export const getHistoryItems = () => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
};

// 保存历史记录
export const saveHistoryItem = (historyItem) => {
  try {
    const history = getHistoryItems();
    
    // 检查是否已存在相同内容的记录（避免重复）
    const existingIndex = history.findIndex(item => 
      item.content === historyItem.content && 
      JSON.stringify(item.config) === JSON.stringify(historyItem.config)
    );
    
    if (existingIndex !== -1) {
      // 更新现有记录的时间戳
      history[existingIndex].timestamp = historyItem.timestamp;
      history[existingIndex].title = historyItem.title;
    } else {
      // 添加新记录
      history.unshift(historyItem);
      
      // 限制历史记录数量
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
      }
    }
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return false;
  }
};

// 删除历史记录
export const deleteHistoryItem = (id) => {
  try {
    const history = getHistoryItems();
    const filteredHistory = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filteredHistory));
    return true;
  } catch (error) {
    console.error('删除历史记录失败:', error);
    return false;
  }
};

// 清空所有历史记录
export const clearAllHistory = () => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('清空历史记录失败:', error);
    return false;
  }
};

// 恢复历史记录
export const restoreHistoryItem = (id) => {
  try {
    const history = getHistoryItems();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('恢复历史记录失败:', error);
    return null;
  }
};

// 自动保存功能
export class AutoSaveManager {
  constructor(callback, interval = AUTO_SAVE_INTERVAL) {
    this.callback = callback;
    this.interval = interval;
    this.timer = null;
    this.lastContent = '';
    this.lastConfig = null;
  }

  start(content, config, resumeData) {
    this.lastContent = content;
    this.lastConfig = config;
    this.lastResumeData = resumeData;
    
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      this.performAutoSave();
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  update(content, config, resumeData) {
    this.lastContent = content;
    this.lastConfig = config;
    this.lastResumeData = resumeData;
  }

  performAutoSave() {
    if (this.lastContent && this.lastContent.trim()) {
      const historyItem = createHistoryItem(
        this.lastContent,
        this.lastConfig,
        this.lastResumeData,
        'auto_save'
      );
      
      if (this.callback) {
        this.callback(historyItem);
      }
    }
  }

  // 页面关闭时保存
  saveOnUnload() {
    if (this.lastContent && this.lastContent.trim()) {
      const historyItem = createHistoryItem(
        this.lastContent,
        this.lastConfig,
        this.lastResumeData,
        'page_close'
      );
      
      saveHistoryItem(historyItem);
    }
  }
}

// 格式化时间显示
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // 1分钟内
    return '刚刚';
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`;
  } else if (diff < 604800000) { // 1周内
    return `${Math.floor(diff / 86400000)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}; 
/**
 * 重命名历史记录项
 * @param {string} id - 要重命名的历史记录ID
 * @param {string} newTitle - 新的标题名称
 * @returns {boolean} 返回是否重命名成功
 */
export const renameHistoryItem = (id, newTitle) => {
  try {
    // 1. 获取当前所有历史记录
    const history = getHistoryItems();
    
    // 2. 查找要修改的历史记录项
    const itemToRename = history.find(item => item.id === id);
    
    // 3. 如果找到记录且新标题有效则更新
    if (itemToRename && newTitle && newTitle.trim()) {
      itemToRename.title = newTitle.trim();
      
      // 4. 保存回localStorage
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      
      // 5. 返回成功
      return true;
    }
    
    // 未找到记录或标题无效
    return false;
  } catch (error) {
    console.error('重命名历史记录时出错:', error);
    return false;
  }
};