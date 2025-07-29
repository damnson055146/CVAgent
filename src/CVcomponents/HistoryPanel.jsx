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
            const backendResult = await agentAPI.getResumeHistory();
            const backendItems = backendResult ? [{
                id: backendResult.id,
                timestamp: backendResult.updated_at,
                content: backendResult.content_md,
                action: 'manual_save',
                title: `${extractNameFromContent(backendResult.content_md)} (后端保存)`,
                preview: generatePreview(backendResult.content_md)
            }] : [];
            
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

    const handleRestore = (item) => {
        if (onRestore) {
            onRestore(item);
            onClose();
        }
    };

    const handleDelete = (item) => {
        if (deleteHistoryItem(item.id)) {
            loadHistoryItems();
        }
    };

    const handleRenameStart = (item) => {
        setEditingItem(item.id);
        setNewName(item.title);
    };

    const handleRenameSave = (item) => {
        if (newName.trim() && renameHistoryItem(item.id, newName.trim())) {
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
            'manual_save': '手动保存到后端',
            'manual': '手动保存'
        };

        return actionMap[action] || '';
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
                                            {/* 重命名按钮 */}
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