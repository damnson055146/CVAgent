import React, { useState, useEffect, useRef } from 'react';
import { Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../comcomponents/common/Button.jsx';

const BrainstormToolbar = ({
  position,
  selectedText,
  onBrainstorm,
  isProcessing,
  onClose,
  isVisible = true,
  showPromptInput = false,
  onPositionChange
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);

  const mouseMoveHandlerRef = useRef(null);
  const mouseUpHandlerRef = useRef(null);

  // 默认头脑风暴提示词
  const defaultBrainstormPrompt = `基于以下选中的文本，为留学个人陈述生成针对性的头脑风暴问题：

选中内容：
{selected_text}

请从以下角度生成问题：
1. 背景与动机：关于申请动机、背景故事的问题
2. 能力与成就：关于技能、成就、领导力的问题  
3. 目标与规划：关于职业规划、学习目标的问题
4. 匹配度：关于与目标项目的匹配度问题
5. 挑战与成长：关于克服困难、个人成长的问题

每个类别生成2-3个具体、深入的问题，帮助申请人更好地思考和表达。`;

  useEffect(() => {
    setCurrentPosition(position);
    if (!customPrompt) {
      setCustomPrompt(defaultBrainstormPrompt.replace('{selected_text}', selectedText || ''));
    }
  }, [position, selectedText]);

  // 拖拽相关事件处理
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (mouseMoveHandlerRef.current) {
      document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
    }
    if (mouseUpHandlerRef.current) {
      document.removeEventListener('mouseup', mouseUpHandlerRef.current);
    }

    const toolbarRect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - toolbarRect.left;
    const offsetY = e.clientY - toolbarRect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);

    mouseMoveHandlerRef.current = (e) => {
      e.preventDefault();
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      onPositionChange?.({ x: newX, y: newY, arrowLeft: '50%' });
    };

    mouseUpHandlerRef.current = () => {
      setIsDragging(false);
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener('mouseup', mouseUpHandlerRef.current);
      }
      mouseMoveHandlerRef.current = null;
      mouseUpHandlerRef.current = null;
    };

    document.addEventListener('mousemove', mouseMoveHandlerRef.current, { passive: false });
    document.addEventListener('mouseup', mouseUpHandlerRef.current, { passive: false });
  };

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

  const handleBrainstormClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (customPrompt.trim()) {
      onBrainstorm(customPrompt);
    }
  };

  const handlePromptSubmit = () => {
    if (customPrompt.trim()) {
      onBrainstorm(customPrompt);
    }
  };

  const handlePromptCancel = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCustomPrompt(defaultBrainstormPrompt.replace('{selected_text}', selectedText || ''));
  };

  const handleButtonClick = (e, callback) => {
    e.preventDefault();
    e.stopPropagation();
    callback(e);
  };

  const handleToolbarWheel = (e) => {
    e.stopPropagation();
  };

  const getToolbarWidth = () => {
    if (showPromptInput) return '400px';
    return '280px';
  };

  const getToolbarMaxWidth = () => {
    if (showPromptInput) return '500px';
    return '350px';
  };

  const getToolbarHeight = () => {
    if (showPromptInput) return '200px';
    return '48px';
  };

  return (
    <div
      className={`fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg ${
        isDragging ? 'cursor-grabbing shadow-xl' : 'cursor-grab'
      }`}
      style={{
        left: `${currentPosition?.x || 0}px`,
        top: `${currentPosition?.y || 0}px`,
        minWidth: getToolbarWidth(),
        maxWidth: getToolbarMaxWidth(),
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? '0' : '10px'})`,
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: 9999,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onWheel={handleToolbarWheel}
    >
      {/* 拖拽指示器 */}
      <div className="flex items-center justify-center p-1 bg-gray-50 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">头脑风暴工具栏</span>
      </div>

      {/* 主工具栏 */}
      <div className="flex items-center p-2 space-x-1">
        <Button
          type="ghost"
          size="sm"
          onClick={(e) => handleButtonClick(e, handleBrainstormClick)}
          disabled={isProcessing}
          className="text-xs px-2 py-1 hover:bg-purple-50 dark:hover:bg-purple-900 text-gray-700 dark:text-gray-200"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin mr-1" size={12} />
              生成中...
            </>
          ) : (
            <>
              <Brain size={12} className="mr-1" />
              头脑风暴
            </>
          )}
        </Button>

        <Button
          size="sm"
          onClick={(e) => handleButtonClick(e, () => setCustomPrompt(defaultBrainstormPrompt.replace('{selected_text}', selectedText || '')))}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200"
        >
          重置提示词
        </Button>

        <Button
          size="sm"
          onClick={(e) => handleButtonClick(e, () => setCustomPrompt(''))}
          disabled={isProcessing}
          type="ghost"
          className="text-xs px-2 py-1 hover:bg-orange-50 dark:hover:bg-orange-900 text-gray-700 dark:text-gray-200"
        >
          清空提示词
        </Button>

        {/* 关闭按钮 */}
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          onClick={onClose}
          className="px-1.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          ✕
        </button>
      </div>

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
                const rect = e.currentTarget.getBoundingClientRect();
                const isScrollbarClick = e.clientX > rect.right - 8 || e.clientY > rect.bottom - 8;
                
                if (isScrollbarClick) {
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {selectedText}
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              头脑风暴提示词：
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="请输入头脑风暴提示词..."
              className="w-full h-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              autoFocus
              onMouseDown={(e) => {
                if (e.target.classList.contains('scrollbar-thumb') || 
                    e.target.classList.contains('scrollbar-track') ||
                    e.target.closest('.scrollbar-thumb') ||
                    e.target.closest('.scrollbar-track')) {
                  return;
                }
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
              重置
            </Button>
            <Button
              type="primary"
              size="sm"
              onClick={handlePromptSubmit}
              disabled={!customPrompt.trim() || isProcessing}
              className="text-xs px-2 py-1"
            >
              生成问题
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

export default BrainstormToolbar;
