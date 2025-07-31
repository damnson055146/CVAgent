// src/components/HistoryPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    getHistoryItems,
    deleteHistoryItem,
    clearAllHistory,
    formatTime,
    restoreHistoryItem,
    renameHistoryItem
} from '../utils/historyUtils.js';
import Button from '../Comcomponents/common/Button.jsx';
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

    useEffect(() => {
        if (isOpen) {
            loadHistoryItems();
        }
    }, [isOpen]);

    const loadHistoryItems = async () => {
        try {
            // 获取本地历史记录
            const localItems = getHistoryItems();
            
            // 获取后端历史记录
            const userId = localStorage.getItem('user_id');
            let backendItems = [];
            if (userId) {
                try {
                    const backendResult = await agentAPI.getResumeHistory(userId);
                    // 后端返回的是数组，需要处理每个版本
                    backendItems = backendResult.map(version => ({
                        id: version.id,
                        timestamp: version.created_at,
                        content: version.content_snippet, // 后端返回的是片段
                        action: 'manual_save',
                        title: `${extractNameFromContent(version.content_snippet)} (后端保存 v${version.version_number})`,
                        preview: generatePreview(version.content_snippet),
                        isBackend: true, // 标记为后端记录
                        version_number: version.version_number
                    }));
                } catch (error) {
                    console.error('获取后端历史记录失败:', error);
                }
            }
            
            // 合并并排序历史记录
            const allItems = [...localItems, ...backendItems].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            setHistoryItems(allItems);
        } catch (error) {
            console.error('加载历史记录失败:', error);
            // 如果后端获取失败，至少显示本地记录
            const localItems = getHistoryItems();
            setHistoryItems(localItems);
        }
    };

    const handleRestore = async (item) => {
        // 如果是后端记录，需要先获取完整内容
        if (item.isBackend) {
            try {
                const fullVersion = await agentAPI.getResumeVersion(item.id);
                const restoredItem = {
                    ...item,
                    content: fullVersion.content
                };
                if (onRestore) {
                    onRestore(restoredItem);
                    onClose();
                }
            } catch (error) {
                console.error('获取历史版本内容失败:', error);
                alert('获取历史版本内容失败');
            }
        } else {
            if (onRestore) {
                onRestore(item);
                onClose();
            }
        }
    };

    const handleDelete = async (item) => {
        // 如果是后端记录，调用后端删除接口
        if (item.isBackend) {
            try {
                const userId = localStorage.getItem('user_id');
                await agentAPI.deleteResumeVersion(item.id, userId);
                loadHistoryItems(); // 重新加载列表
            } catch (error) {
                console.error('删除历史版本失败:', error);
                alert('删除历史版本失败');
            }
        } else {
            // 本地记录使用原有删除方法
            if (deleteHistoryItem(item.id)) {
                loadHistoryItems();
            }
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
    const getActionLabel = (action) => {
        const actionMap = {
            'upload': '上传',
            'form': '填写',
            'edit': '编辑',
            'ai_polish': 'AI优化',
            'ai_expand': 'AI扩展',
            'ai_contract': 'AI压缩',
            'auto_save': '自动保存',
            'page_close': '页面关闭',
            'manual_save': '手动保存',
            'manual': '手动保存',
            'backend_save': '后端保存',
            'version_restore': '版本恢复',
            'content_update': '内容更新'
        };

        return actionMap[action] || '未知操作';
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
                            {/* 清空按钮 - 无边框，悬停阴影 */}
                            <button
                                onClick={() => clearAllHistory() && loadHistoryItems()}
                                className="text-red-500 dark:text-red-400 text-xs px-2 py-1 rounded-md hover:shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                清空
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
                                                {getActionLabel(item.action)}
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