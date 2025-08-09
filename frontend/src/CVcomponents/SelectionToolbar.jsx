import React, { useState, useEffect, useRef } from 'react';
import Button from '../comcomponents/common/Button.jsx';

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
  showPromptInput = false, // 接收来自父组件的输入框状态
  onPositionChange // 新增：位置变化回调
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const toolbarRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);

  // 使用 useRef 来存储事件处理函数，确保引用稳定
  const mouseMoveHandlerRef = useRef(null);
  const mouseUpHandlerRef = useRef(null);

  // 更新当前位置
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  // 调试信息
  console.log('SelectionToolbar props:', {
    position,
    selectedText,
    isVisible,
    showPromptInput,
    isProcessing,
    processingType,
    aiPreview,
    isDragging
  });

  // 拖拽相关事件处理
  const handleMouseDown = (e) => {
    // 如果点击的是按钮或输入框，不启动拖拽
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // 清理之前可能存在的事件监听器
    if (mouseMoveHandlerRef.current) {
      document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
    }
    if (mouseUpHandlerRef.current) {
      document.removeEventListener('mouseup', mouseUpHandlerRef.current);
    }

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const offsetX = e.clientX - toolbarRect.left;
    const offsetY = e.clientY - toolbarRect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);

    // 创建稳定的事件处理函数引用
    mouseMoveHandlerRef.current = (e) => {
      e.preventDefault();

      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;

      // 直接更新位置，提高响应性
      // 边界约束会在父组件的 handleToolbarPositionChange 中处理
      onPositionChange?.({ x: newX, y: newY, arrowLeft: '50%' });
    };

    mouseUpHandlerRef.current = () => {
      setIsDragging(false);
      // 清理事件监听器
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener('mouseup', mouseUpHandlerRef.current);
      }
      // 清空引用
      mouseMoveHandlerRef.current = null;
      mouseUpHandlerRef.current = null;
    };

    // 添加全局鼠标事件监听，使用 passive: false 提高响应性
    document.addEventListener('mousemove', mouseMoveHandlerRef.current, { passive: false });
    document.addEventListener('mouseup', mouseUpHandlerRef.current, { passive: false });
  };

  // 清理事件监听器
  useEffect(() => {
    return () => {
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener('mouseup', mouseUpHandlerRef.current);
        mouseUpHandlerRef.current = null;
      }
    };
  }, []);

  const handleCustomPromptClick = (e) => {
    if (e) {
      e.preventDefault(); // 阻止默认行为
      e.stopPropagation(); // 阻止事件冒泡
    }
    onPromptInputToggle?.(true); // 通知父组件显示自定义输入框
  };

  const handlePromptSubmit = () => {
    if (customPrompt.trim()) {
      onCustomPrompt(customPrompt);
      setCustomPrompt('');
      onPromptInputToggle?.(false); // 通知父组件隐藏自定义输入框
    }
  };

  const handlePromptCancel = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCustomPrompt('');
    onPromptInputToggle?.(false); // 通知父组件隐藏自定义输入框
    // 不调用 onClose，保持选择状态和高光显示
  };

  // 当AI预览结果出现时，自动关闭自定义输入框
  useEffect(() => {
    if (aiPreview && showPromptInput) {
      onPromptInputToggle?.(false);
    }
  }, [aiPreview, showPromptInput, onPromptInputToggle]);

  // 防止工具栏点击时失去选区焦点
  const handleToolbarMouseDown = (e) => {
    // 如果是滚动条区域，不阻止默认行为
    if (e.target.classList.contains('scrollbar-thumb') || 
        e.target.classList.contains('scrollbar-track') ||
        e.target.closest('.scrollbar-thumb') ||
        e.target.closest('.scrollbar-track')) {
      return;
    }
    e.preventDefault(); // 阻止默认行为，保持选区
    e.stopPropagation(); // 阻止事件冒泡
  };

  // 在 SelectionToolbar.jsx 中为所有按钮添加事件阻止
  const handleButtonClick = (e, callback) => {
    e.preventDefault();
    e.stopPropagation();
    callback(e); // 传递事件对象给回调函数
  };

  // 防止工具栏内部滚动触发页面滚动
  const handleToolbarWheel = (e) => {
    e.stopPropagation(); // 阻止事件冒泡到页面
  };

  // 计算工具栏宽度
  const getToolbarWidth = () => {
    if (aiPreview) return '500px';
    if (showPromptInput) return '320px'; // 固定自定义模式下的宽度
    return '280px';
  };

  // 计算工具栏最大宽度
  const getToolbarMaxWidth = () => {
    if (aiPreview) return '600px';
    if (showPromptInput) return '400px'; // 设置最大宽度限制
    return '350px';
  };

  // 计算工具栏高度
  const getToolbarHeight = () => {
    if (aiPreview) return '120px';
    if (showPromptInput) return '160px'; // 减少自定义模式下的高度
    return '48px';
  };

  return (
    <div
      ref={toolbarRef}
      className={`fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg ${isDragging ? 'cursor-grabbing shadow-xl' : 'cursor-grab'
        }`}
      style={{
        left: `${currentPosition?.x || 0}px`,
        top: `${currentPosition?.y || 0}px`,
        minWidth: getToolbarWidth(),
        maxWidth: getToolbarMaxWidth(),
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? '0' : '10px'})`,
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: 9999, // 确保显示在最上层
        userSelect: 'none' // 防止拖拽时选中文字
      }}
      onMouseDown={handleMouseDown}
      onWheel={handleToolbarWheel}
    >
      {/* 拖拽指示器 */}
      <div className="flex items-center justify-center p-1 bg-gray-50 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">拖拽移动</span>
      </div>

      {/* 主工具栏 */}
      <div className="flex items-center p-2 space-x-1">
        <Button
          type="ghost"
          size="sm"
          onClick={(e) => handleButtonClick(e, onOptimize)}
          disabled={isProcessing}
          className="text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'optimize' ? '优化中...' : '优化'}
        </Button>

        <Button
          size="sm"
          onClick={(e) => handleButtonClick(e, onExpand)}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-green-50 dark:hover:bg-green-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'expand' ? '扩写中...' : '扩写'}
        </Button>

        <Button
          size="sm"
          onClick={(e) => handleButtonClick(e, onContract)}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-orange-50 dark:hover:bg-orange-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing && processingType === 'contract' ? '缩写中...' : '缩写'}
        </Button>

        <Button
          size="sm"
          onClick={(e) => handleButtonClick(e, handleCustomPromptClick)}
          disabled={isProcessing}
          type="ghost"
          className={`text-xs px-2 py-1 hover:bg-purple-50 dark:hover:bg-purple-900 text-gray-700 dark:text-gray-200 ${showPromptInput ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' : ''
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
            <div 
              className="w-full max-h-32 overflow-y-auto overflow-x-auto px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap max-w-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              onMouseDown={(e) => {
                // 允许滚动条区域的正常交互
                if (e.target.classList.contains('scrollbar-thumb') || 
                    e.target.classList.contains('scrollbar-track') ||
                    e.target.closest('.scrollbar-thumb') ||
                    e.target.closest('.scrollbar-track')) {
                  return;
                }
                // 其他区域阻止默认行为以保持选区
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {aiPreview}
            </div>
          </div>
        </div>
      )}

      {/* 自定义提示输入区 */}
      {showPromptInput && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-2">
          {/* 选中文本显示区域 */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              选中文本：
            </label>
            <div 
              className="w-full max-h-16 overflow-y-auto overflow-x-auto px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap max-w-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              onMouseDown={(e) => {
                // 检查是否点击在滚动条区域
                const rect = e.currentTarget.getBoundingClientRect();
                const isScrollbarClick = e.clientX > rect.right - 8 || e.clientY > rect.bottom - 8;
                
                if (isScrollbarClick) {
                  // 滚动条区域不阻止默认行为
                  return;
                }
                // 其他区域阻止默认行为以保持选区
                e.preventDefault();
                e.stopPropagation();
              }}
            >
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
              className="w-full h-12 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              autoFocus
              onMouseDown={(e) => {
                // 允许滚动条区域的正常交互
                if (e.target.classList.contains('scrollbar-thumb') || 
                    e.target.classList.contains('scrollbar-track') ||
                    e.target.closest('.scrollbar-thumb') ||
                    e.target.closest('.scrollbar-track')) {
                  return;
                }
                // 其他区域阻止默认行为以保持选区
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </div>
          <div className="flex justify-end space-x-1">
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
          left: currentPosition?.arrowLeft || '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
};

export default SelectionToolbar;