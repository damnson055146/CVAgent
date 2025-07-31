// 测试标题生成逻辑
console.log('测试标题生成逻辑');

// 模拟generateTitle函数
const generateTitle = (action, content) => {
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const actionMap = {
    'upload': '上传简历',
    'form': '填写简历',
    'edit': '编辑简历',
    'ai_polish': 'AI优化',
    'ai_expand': 'AI扩展',
    'ai_contract': 'AI压缩',
    'manual': '手动保存',
    'manual_save': '手动保存',
    'auto_save': '自动保存',
    'page_close': '页面关闭',
    'backend_save': '后端保存',
    'version_restore': '版本恢复',
    'content_update': '内容更新'
  };
  
  const actionName = actionMap[action] || '操作';
  const name = '王二'; // 模拟提取的姓名
  
  // 生成唯一标识符（基于时间戳）
  const uniqueId = Date.now().toString().slice(-6);
  
  // 对于手动保存，明确标注是本地保存
  if (action === 'manual_save') {
    return `${name} (本地保存 ${timeStr} #${uniqueId})`;
  }
  
  // 对于后端保存，明确标注是后端保存
  if (action === 'backend_save') {
    return `${name} (后端保存 ${timeStr} #${uniqueId})`;
  }
  
  // 对于自动保存，添加标识符
  if (action === 'auto_save') {
    return `${name} (自动保存 ${timeStr} #${uniqueId})`;
  }
  
  // 对于其他操作，也添加标识符
  return `${name} (${actionName} ${timeStr} #${uniqueId})`;
};

// 测试不同的动作类型
const actions = ['manual_save', 'backend_save', 'auto_save', 'ai_polish', 'upload'];
const content = '# 王二\n## 基本信息';

console.log('测试结果:');
actions.forEach(action => {
  const title1 = generateTitle(action, content);
  console.log(`${action}: ${title1}`);
  
  // 等待1秒后再次生成，测试唯一性
  setTimeout(() => {
    const title2 = generateTitle(action, content);
    console.log(`${action} (延迟): ${title2}`);
    console.log(`是否相同: ${title1 === title2}`);
  }, 1000);
});

console.log('\n测试完成'); 