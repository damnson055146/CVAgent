// src/CVcomponents/HistoryPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    getHistoryItems,
    deleteHistoryItem,
    clearAllHistory,
    formatTime, 
    restoreHistoryItem,
    renameHistoryItem,
    cleanBackendSaveRecords
} from '../utils/historyUtils.js';
import Button from '../comcomponents/common/Button.jsx';
import { Trash2, RotateCcw, X, Pen } from 'lucide-react';
import agentAPI from '../services/CVagentAPI.jsx';

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

const HistoryPanel = ({ isOpen, onClose, onRestore }) => {
    const [historyItems, setHistoryItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [newName, setNewName] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadHistoryItems();
        }
    }, [isOpen]);

    const loadHistoryItems = async () => {
        try {
            // 清理错误的backend_save记录
            cleanBackendSaveRecords();
            
            // 获取本地历史记录
            const localItems = getHistoryItems();
            console.log('本地历史记录:', localItems);
            
            // 确保本地记录有正确的标记，并过滤掉错误的backend_save记录
            const processedLocalItems = localItems
                .filter(item => item.action !== 'backend_save') // 过滤掉错误的backend_save记录
                .map(item => ({
                    ...item,
                    isBackend: false, // 明确标记为本地记录
                    isLocal: true // 额外标记
                }));
            console.log('处理后的本地历史记录:', processedLocalItems);
            
            // 获取后端历史记录
            const userId = localStorage.getItem('user_id');
            let backendItems = [];
            if (userId) {
                try {
                    console.log('正在获取后端历史记录，用户ID:', userId);
                    const backendResult = await agentAPI.getResumeHistory(userId);
                    console.log('后端历史记录结果:', backendResult);
                    
                    // 后端返回的是数组，需要处理每个版本
                    backendItems = backendResult.map(version => {
                        // 格式化后端时间戳
                        const backendTime = new Date(version.created_at);
                        const timeStr = backendTime.toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        return {
                            id: version.id,
                            timestamp: version.created_at,
                            content: version.content_snippet, // 后端返回的是片段
                            action: 'backend_save', // 标记为后端保存
                            title: `${extractNameFromContent(version.content_snippet)} (后端保存 ${timeStr} v${version.version_number})`,
                            preview: generatePreview(version.content_snippet),
                            isBackend: true, // 标记为后端记录
                            isLocal: false, // 明确标记为非本地记录
                            version_number: version.version_number
                        };
                    });
                    console.log('处理后端历史记录:', backendItems);
                } catch (error) {
                    console.error('获取后端历史记录失败:', error);
                }
            }
            
            // 合并并排序历史记录
            const allItems = [...processedLocalItems, ...backendItems].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            console.log('最终历史记录列表:', allItems);
            setHistoryItems(allItems);
        } catch (error) {
            console.error('加载历史记录失败:', error);
            // 如果后端获取失败，至少显示本地记录
            const localItems = getHistoryItems();
            const processedLocalItems = localItems
                .filter(item => item.action !== 'backend_save') // 过滤掉错误的backend_save记录
                .map(item => ({
                    ...item,
                    isBackend: false,
                    isLocal: true
                }));
            setHistoryItems(processedLocalItems);
        }
    };

    const handleRestore = async (item) => {
        try {
            let contentToRestore = item.content;
            
            // 如果是后端记录，需要先获取完整内容
            if (item.isBackend) {
                console.log('正在获取后端版本的完整内容:', item.id);
                const fullVersion = await agentAPI.getResumeVersion(item.id);
                contentToRestore = fullVersion.content;
                console.log('获取到的完整内容长度:', contentToRestore.length);
            }
            
            // 创建恢复项，包含完整内容
            const restoredItem = {
                ...item,
                content: contentToRestore,
                config: item.config || {},
                resumeData: item.resumeData || null
            };
            
            console.log('准备恢复历史记录:', restoredItem);
            
            if (onRestore) {
                onRestore(restoredItem);
                onClose();
            }
        } catch (error) {
            console.error('恢复历史记录失败:', error);
            alert('恢复历史记录失败，请重试');
        }
    };

    const handleDelete = async (item) => {
        // 如果是后端记录，调用后端删除接口
        if (item.isBackend) {
            try {
                console.log('正在删除后端版本:', item.id);
                const userId = localStorage.getItem('user_id');
                const result = await agentAPI.deleteResumeVersion(item.id, userId);
                console.log('删除结果:', result);
                
                // 检查删除是否成功（支持多种成功响应格式）
                if (result.success || result.message || (result && typeof result === 'object')) {
                    console.log('删除成功，重新加载历史记录');
                    
                    // 显示成功提示
                    const successMessage = result.message || '删除成功';
                    console.log(successMessage);
                    
                    // 从当前列表中移除该项
                    setHistoryItems(prevItems => prevItems.filter(prevItem => prevItem.id !== item.id));
                    
                    // 同时重新加载以确保数据同步
                    setTimeout(() => {
                        loadHistoryItems();
                    }, 100);
                } else {
                    throw new Error('删除失败');
                }
            } catch (error) {
                console.error('删除历史版本失败:', error);
                alert(`删除历史版本失败: ${error.message}`);
            }
        } else {
            // 本地记录使用原有删除方法
            console.log('正在删除本地记录:', item.id);
            if (deleteHistoryItem(item.id)) {
                console.log('本地记录删除成功，重新加载历史记录');
                loadHistoryItems();
            } else {
                alert('删除本地记录失败');
            }
        }
    };

    // 清空所有历史记录（包括前端和后端）
    const handleClearAllHistory = async () => {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
            return;
        }

        setIsClearing(true);
        try {
            // 1. 清空本地历史记录
            clearAllHistory();
            console.log('本地历史记录已清空');

            // 2. 清空后端历史记录
            const userId = localStorage.getItem('user_id');
            if (userId) {
                try {
                    // 获取所有后端版本并逐个删除
                    const backendResult = await agentAPI.getResumeHistory(userId);
                    console.log('获取到的后端版本:', backendResult);
                    
                    // 删除所有后端版本
                    for (const version of backendResult) {
                        try {
                            const deleteResult = await agentAPI.deleteResumeVersion(version.id, userId);
                            if (deleteResult.success) {
                                console.log(`已删除后端版本: ${version.id}`);
                            } else {
                                console.error(`删除后端版本 ${version.id} 失败: 返回结果不正确`);
                            }
                        } catch (error) {
                            console.error(`删除后端版本 ${version.id} 失败:`, error);
                        }
                    }
                    console.log('所有后端历史记录已清空');
                } catch (error) {
                    console.error('清空后端历史记录失败:', error);
                }
            }

            // 3. 重新加载历史记录（应该为空）
            await loadHistoryItems();
            
            console.log('所有历史记录已清空');
        } catch (error) {
            console.error('清空历史记录失败:', error);
            alert('清空历史记录失败，请重试');
        } finally {
            setIsClearing(false);
        }
    };

    const handleRenameStart = (item) => {
        // 后端记录不允许重命名
        if (item.isBackend) return;
        
        setEditingItem(item.id);
        setNewName(item.title);
    };

    const handleRenameSave = (item) => {
        // 只有本地记录可以重命名
        if (!item.isBackend && newName.trim() && renameHistoryItem(item.id, newName.trim())) {
            loadHistoryItems();
        }
        setEditingItem(null);
    };

    // 修改getActionLabel函数
    const getActionLabel = (action, isBackend = false) => {
        const actionMap = {
            'upload': '上传',
            'form': '填写',
            'edit': '编辑',
            'ai_polish': 'AI优化',
            'ai_expand': 'AI扩展',
            'ai_contract': 'AI压缩',
            'auto_save': '自动保存',
            'page_close': '页面关闭',
            'manual_save': '本地保存',
            'manual': '本地保存',
            'backend_save': '后端保存',
            'version_restore': '版本恢复',
            'content_update': '内容更新'
        };

        // 根据记录类型返回正确的标签
        if (isBackend) {
            return actionMap[action] || '后端操作';
        } else {
            return actionMap[action] || '本地操作';
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* 右侧面板 */}
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
                {/* 背景遮罩 */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-30"
                    onClick={onClose}
                />

                {/* 历史面板内容 */}
                <div
                    className="relative bg-white dark:bg-gray-800 w-72 h-[70vh] mt-20 mr-2 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 面板头部 */}
                                            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                历史版本
                            </h2>
                            <div className="flex items-center gap-1">
                                {/* 清理错误记录按钮 */}
                                <button
                                    onClick={() => {
                                        if (cleanBackendSaveRecords()) {
                                            loadHistoryItems();
                                            alert('已清理错误的backend_save记录');
                                        } else {
                                            alert('没有发现错误的记录需要清理');
                                        }
                                    }}
                                    className="text-blue-500 dark:text-blue-400 text-xs px-2 py-1 rounded-md hover:shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                >
                                    清理错误
                                </button>
                                {/* 清空按钮 - 无边框，悬停阴影 */}
                                <button
                                    onClick={handleClearAllHistory}
                                    disabled={isClearing}
                                    className="text-red-500 dark:text-red-400 text-xs px-2 py-1 rounded-md hover:shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isClearing ? '清空中...' : '清空'}
                                </button>
                                {/* 关闭按钮 - 纯图标无边框 */}
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm transition-all"
                                >
                                    <X size={16} className="text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                    {/* 历史记录列表 */}
                    <div className="flex-1 overflow-y-auto py-1">
                        {historyItems.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                                暂无历史记录
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {historyItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                {editingItem === item.id ? (
                                                    <input
                                                        type="text"
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        onBlur={() => handleRenameSave(item)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSave(item)}
                                                        className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {item.title}
                                                    </h3>
                                                )}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {formatTime(item.timestamp)}
                                                </p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {getActionLabel(item.action, item.isBackend)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                            {item.preview}
                                        </p>

                                        {/* 操作按钮 - 纯图标无边框 */}
                                        <div className="flex justify-end gap-2 mt-1">
                                            {/* 重命名按钮 - 后端记录不显示 */}
                                            {!item.isBackend && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRenameStart(item);
                                                    }}
                                                    className="p-1 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm transition-all"
                                                    title="重命名"
                                                >
                                                    <Pen size={14} />
                                                </button>
                                            )}

                                            {/* 恢复按钮 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRestore(item);
                                                }}
                                                className="p-1 text-blue-500 dark:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-sm transition-all"
                                                title="恢复"
                                            >
                                                <RotateCcw size={14} />
                                            </button>

                                            {/* 删除按钮 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item);
                                                }}
                                                className="p-1 text-red-500 dark:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-sm transition-all"
                                                title="删除"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* 添加历史记录统计信息 */}
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center">
                                    <span className="mr-2">本地记录:</span>
                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                                        {historyItems.filter(item => !item.isBackend).length}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="mr-2">后端记录:</span>
                                    <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                        {historyItems.filter(item => item.isBackend).length}
                                    </span>
                                </div>
                            </div>
                            {/* 调试信息 */}
                            <div className="mt-1 text-xs text-gray-400">
                                <div>调试信息:</div>
                                <div>本地记录详情: {historyItems.filter(item => !item.isBackend).map(item => `${item.action}(${item.isLocal ? '本地' : '未知'})`).join(', ')}</div>
                                <div>后端记录详情: {historyItems.filter(item => item.isBackend).map(item => `${item.action}(${item.isLocal ? '本地' : '后端'})`).join(', ')}</div>
                                <div>清理状态: {cleanBackendSaveRecords() ? '已清理错误记录' : '无需清理'}</div>
                            </div>
                        </div>
                    </div>
                    {/* 面板底部 */}
                    <div className="px-2 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-2xs text-gray-500 dark:text-gray-400">
                        <div className="flex justify-between">
                            <span>共 {historyItems.length} 条</span>
                            {/* <span>最多保留50条</span> */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HistoryPanel;