import React, { useState, useEffect, useRef } from 'react';
import Button from '../Comcomponents/common/Button.jsx';

const SelectionToolbar = ({
  position,
  selectedText,
  onOptimize,
  onExpand,
  onContract,
  onCustomPrompt,
  onPromptInputToggle,
  isProcessing,
  processingType, // 标识当前处理的类型
  aiPreview,
  onAdopt,
  onCancelPreview,
  onClose,
  isVisible = true,
  showPromptInput = false // 接收来自父组件的输入框状态
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const toolbarRef = useRef(null);

  // 调试信息
  console.log('SelectionToolbar props:', { 
    position, 
    selectedText, 
    isVisible, 
    showPromptInput,
    isProcessing,
    processingType,
    aiPreview 
  });

  const handleCustomPromptClick = () => {
    onPromptInputToggle?.(true); // 通知父组件显示自定义输入框
  };

  const handlePromptSubmit = () => {
    if (customPrompt.trim()) {
      onCustomPrompt(customPrompt);
      setCustomPrompt('');
      onPromptInputToggle?.(false); // 通知父组件隐藏自定义输入框
    }
  };

  const handlePromptCancel = () => {
    setCustomPrompt('');
    onPromptInputToggle?.(false); // 通知父组件隐藏自定义输入框
  };

  // 当AI预览结果出现时，自动关闭自定义输入框
  useEffect(() => {
    if (aiPreview && showPromptInput) {
      onPromptInputToggle?.(false);
    }
  }, [aiPreview, showPromptInput, onPromptInputToggle]);

  // 防止工具栏点击时失去选区焦点
  const handleToolbarMouseDown = (e) => {
    e.preventDefault(); // 阻止默认行为，保持选区
    e.stopPropagation(); // 阻止事件冒泡
  };

  // 防止工具栏内部滚动触发页面滚动
  const handleToolbarWheel = (e) => {
    e.stopPropagation(); // 阻止事件冒泡到页面
  };

  // 计算工具栏宽度
  const getToolbarWidth = () => {
    if (aiPreview) return '500px';
    if (showPromptInput) return '400px';
    return '280px';
  };

  // 计算工具栏高度
  const getToolbarHeight = () => {
    if (aiPreview) return '120px';
    if (showPromptInput) return '180px'; // 增加高度以容纳选中文本显示
    return '48px';
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transform transition-all duration-200"
      style={{
        left: `${position?.x || 0}px`,
        top: `${position?.y || 0}px`,
        minWidth: getToolbarWidth(),
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? '0' : '10px'})`,
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: 9999 // 确保显示在最上层
      }}
      onMouseDown={handleToolbarMouseDown}
      onWheel={handleToolbarWheel}
    >
      {/* 主工具栏 */}
      <div className="flex items-center p-2 space-x-1">
        <Button
          type="ghost"
          size="sm"
          onClick={onOptimize}
          disabled={isProcessing}
          className="text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'optimize' ? '优化中...' : '优化'}
        </Button>
        
        <Button
          size="sm"
          onClick={onExpand}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-green-50 dark:hover:bg-green-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'expand' ? '扩写中...' : '扩写'}
        </Button>
        
        <Button
          size="sm"
          onClick={onContract}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-orange-50 dark:hover:bg-orange-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'contract' ? '缩写中...' : '缩写'}
        </Button>
        
        <Button
          size="sm"
          onClick={handleCustomPromptClick}
          disabled={isProcessing}
          type="ghost"
          className={`text-xs px-2 py-1 hover:bg-purple-50 dark:hover:bg-purple-900 text-gray-700 dark:text-gray-200 ${
            showPromptInput ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' : ''
          }`}
        >
          {isProcessing && processingType === 'custom' ? '处理中...' : '自定义'}
        </Button>
        
        {/* AI预览结果按钮 */}
        {aiPreview && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <Button
              type="primary"
              size="sm"
              onClick={onAdopt}
              className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs px-3 py-1"
            >
              采用
            </Button>
            <Button
              type="secondary"
              size="sm"
              onClick={onCancelPreview}
              className="text-xs px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              取消
            </Button>
          </>
        )}
        
        {/* 关闭按钮 */}
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          onClick={onClose}
          className="px-1.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          ✕
        </button>
      </div>

      {/* AI返回内容显示区域 */}
      {aiPreview && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-3">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              AI 修改结果：
            </label>
            <div className="w-full max-h-32 overflow-y-auto px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {aiPreview}
            </div>
          </div>
        </div>
      )}

      {/* 自定义提示输入区 */}
      {showPromptInput && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-3">
          {/* 选中文本显示区域 */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              选中文本：
            </label>
            <div className="w-full max-h-20 overflow-y-auto px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {selectedText}
            </div>
          </div>
          
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              自定义指令：
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="请输入自定义指令..."
              className="w-full h-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              autoFocus
              onMouseDown={handleToolbarMouseDown}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="ghost"
              size="sm"
              onClick={handlePromptCancel}
              className="text-xs px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </Button>
            <Button
              type="primary"
              size="sm"
              onClick={handlePromptSubmit}
              disabled={!customPrompt.trim() || isProcessing}
              className="text-xs px-2 py-1"
            >
              确认
            </Button>
          </div>
        </div>
      )}
      
      {/* 小三角指示器 */}
      <div 
        className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"
        style={{
          bottom: '-4px',
          left: position?.arrowLeft || '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
};

export default SelectionToolbar;