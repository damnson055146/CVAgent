import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import SelectionToolbar from '../CVcomponents/SelectionToolbar';
import agentAPI from '../services/CVagentAPI';

// 移除单词边界限制，允许任意选择
const findWordBoundaries = (text, start, end) => {
  if (start === end || text.substring(start, end).trim() === '') {
      return { start, end };
  }
  // 直接返回用户选择的范围，不进行单词边界扩展
  return { start, end };
};

const PreviewEditor = forwardRef(({ content, onUpdate, isLoading, isMenuOpen = false }, ref) => {
  const [text, setText] = useState(content || '');
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const selectionSpanRef = useRef(null); // *** NEW: Ref for the highlight span
  const containerRef = useRef(null); // 新增：编辑区容器ref

  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarState, setToolbarState] = useState({ x: 0, y: 0, arrowLeft: '50%' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState('');
  const [aiPreview, setAiPreview] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const selectionTimeoutRef = useRef(null);

  // 新增：处理工具栏位置变化
  const handleToolbarPositionChange = useCallback((newPosition) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const toolbarWidth = aiPreview ? 500 : showPromptInput ? 400 : 280;
    const toolbarHeight = aiPreview ? 120 : showPromptInput ? 180 : 48;
    
    // 边界约束（相对于视口，因为工具栏使用fixed定位）
    let x = newPosition.x;
    let y = newPosition.y;
    
    // 水平边界约束 - 确保工具栏完全在编辑区域内
    const minX = containerRect.left + 5;
    const maxX = containerRect.right - toolbarWidth - 5;
    x = Math.max(minX, Math.min(x, maxX));
    
    // 垂直边界约束 - 确保工具栏完全在编辑区域内
    const minY = containerRect.top + 5;
    const maxY = containerRect.bottom - toolbarHeight - 5;
    y = Math.max(minY, Math.min(y, maxY));
    
    // 更新箭头位置
    const arrowLeft = '50%'; // 保持箭头居中
    
    setToolbarState({ x, y, arrowLeft });
  }, [aiPreview, showPromptInput]);

  // *** REWRITTEN: Simplified and robust position calculation ***
  const getSelectionPosition = useCallback(() => {
    if (!selectionSpanRef.current || !textareaRef.current || !containerRef.current) {
      return { x: 0, y: 0, arrowLeft: '50%' };
    }
    
    // 缓存 getBoundingClientRect 调用，避免频繁重排
    const spanRect = selectionSpanRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // 根据AI预览和输入框状态动态计算工具栏尺寸
    let toolbarWidth = 280;
    let toolbarHeight = 48;
    
    if (aiPreview) {
      toolbarWidth = 500;
      toolbarHeight = 120;
    } else if (showPromptInput) {
      toolbarWidth = 400;
      toolbarHeight = 180; // 增加高度以容纳选中文本显示
    }
    
    // 计算相对于视口的位置（因为工具栏使用fixed定位）
    let y = spanRect.bottom + 8;
    if (y + toolbarHeight > containerRect.bottom - 10) {
      y = spanRect.top - toolbarHeight - 8;
    }
    let x = spanRect.left + (spanRect.width / 2) - (toolbarWidth / 2);
    
    // 约束在编辑区域内
    const minX = containerRect.left + 5;
    const maxX = containerRect.right - toolbarWidth - 5;
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(containerRect.top + 10, Math.min(y, containerRect.bottom - toolbarHeight - 10));
    
    const arrowLeft = `${spanRect.left + (spanRect.width / 2) - x}px`;
    return { x, y, arrowLeft };
  }, [showPromptInput, aiPreview]);

  // 将 handleTextareaScroll 函数移到这里，避免初始化顺序问题
  const handleTextareaScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // 将高光显示相关的变量移到这里，避免初始化顺序问题
  const shouldShowHighlight = (showToolbar || showPromptInput) && selection.text;
  const shouldShowBlueHighlight = shouldShowHighlight;
  const isTextareaTransparent = shouldShowBlueHighlight;

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDarkMode(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setText(content || '');
  }, [content]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate?.(newText);
  };
  
  // Update toolbar position immediately after highlight is rendered
  useEffect(() => {
    if (showToolbar && selection.text) {
      // 使用防抖机制，避免频繁的位置计算
      const timeoutId = setTimeout(() => {
        // 确保overlay层已经同步了textarea的滚动位置
        handleTextareaScroll();
        
        const newPosition = getSelectionPosition();
        // 只有当位置真正改变时才更新，避免不必要的重渲染
        setToolbarState(prev => {
          if (prev.x !== newPosition.x || prev.y !== newPosition.y || prev.arrowLeft !== newPosition.arrowLeft) {
            return newPosition;
          }
          return prev;
        });
      }, 16); // 约60fps的更新频率
      
      return () => clearTimeout(timeoutId);
    }
  }, [showToolbar, selection.text, getSelectionPosition, aiPreview, handleTextareaScroll]);


  const cleanupState = useCallback(() => {
    setShowToolbar(false);
    setAiPreview('');
    setShowPromptInput(false);
    setSelection({ start: 0, end: 0, text: '' });
    setProcessingType('');
    setIsProcessing(false);
    // 移除可能导致页面滚动的focus和setSelectionRange调用
    // if (textareaRef.current) {
    //     const endPos = textareaRef.current.selectionEnd;
    //     textareaRef.current.focus();
    //     textareaRef.current.setSelectionRange(endPos, endPos);
    // }
  }, []);

  // 新增：清理状态但不清空选择（用于自定义输入模式）
  const cleanupStateKeepSelection = useCallback(() => {
    setShowToolbar(false);
    setAiPreview('');
    setShowPromptInput(false);
    setProcessingType('');
    setIsProcessing(false);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isMenuOpen) return;

    const handleSelectionEnd = (e) => {
      // 移除阻止默认行为，避免影响正常的选择操作
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = setTimeout(() => {
        if (!textareaRef.current) return;
        let { selectionStart: start, selectionEnd: end } = textareaRef.current;
        if (start !== end) {
          // 直接使用用户选择的范围，不进行单词边界扩展
          const selectedText = textareaRef.current.value.substring(start, end);
          setSelection({ start, end, text: selectedText });
          setShowToolbar(true);
          
          // 立即同步overlay和textarea的滚动位置
          requestAnimationFrame(() => {
            handleTextareaScroll();
          });
        } else {
          //显示自定义输入框时，不清除状态
          if (!showPromptInput && !showToolbar && !aiPreview) {
            cleanupState();
          }
        }
      }, 100);
    };
    
    const handleKeyUp = (e) => {
      if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        handleSelectionEnd(e);
      }
    };
    
    // 简化事件监听，移除可能导致滚动的逻辑
    textarea.addEventListener('mouseup', handleSelectionEnd, { passive: true });
    textarea.addEventListener('keyup', handleKeyUp, { passive: true });
    
    return () => {
      textarea.removeEventListener('mouseup', handleSelectionEnd);
      textarea.removeEventListener('keyup', handleKeyUp);
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    };
  }, [isMenuOpen, showPromptInput, cleanupState, getSelectionPosition, handleTextareaScroll]);
  
  const handleScroll = useCallback(() => {
    if (showToolbar && selection.text) {
      // 添加防抖机制，避免频繁更新
      if (handleScroll.timeout) {
        clearTimeout(handleScroll.timeout);
      }
      handleScroll.timeout = setTimeout(() => {
        setToolbarState(getSelectionPosition());
      }, 16); // 约60fps的更新频率
    }
  }, [showToolbar, selection.text, getSelectionPosition]);

  useEffect(() => {
    const ta = textareaRef.current;
    // 简化事件监听，使用 passive 选项避免阻止滚动
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    if (ta) ta.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (ta) ta.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen) return;
      
      // 检查点击是否在工具栏内部
      const isToolbarClick = event.target.closest('.selection-toolbar');
      // 检查点击是否在文本框内部
      const isTextareaClick = textareaRef.current?.contains(event.target);
      
      if (showToolbar && !isToolbarClick && !isTextareaClick) {
        // 如果正在显示自定义输入框，不清除状态
        if (showPromptInput) {
          return;
        }
        cleanupState();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolbar, isMenuOpen, showPromptInput, cleanupState]);

  // 删除全局滚动防止机制，这可能是导致问题的原因之一
  // useEffect(() => {
  //   const preventScroll = (e) => {
  //     // 当工具栏显示时，防止页面滚动
  //     if (showToolbar && selection.text) {
  //       // 允许文本框内部的滚动
  //       if (textareaRef.current?.contains(e.target)) {
  //         return;
  //       }
  //       // 允许工具栏内的滚动
  //       if (e.target.closest('.selection-toolbar')) {
  //         return;
  //       }
  //       // 阻止其他滚动
  //       e.preventDefault();
  //     }
  //   };

  //   if (showToolbar && selection.text) {
  //     document.addEventListener('wheel', preventScroll, { passive: false });
  //     document.addEventListener('touchmove', preventScroll, { passive: false });
  //   }

  //   return () => {
  //     document.removeEventListener('wheel', preventScroll);
  //     document.removeEventListener('touchmove', preventScroll);
  //   };
  // }, [showToolbar, selection.text]);

  const handleAIRequest = async (type, prompt = '') => {
    if (!selection.text.trim()) return;

    // 直接使用用户选择的范围，不进行单词边界扩展
    const finalSelection = { start: selection.start, end: selection.end, text: selection.text };
    
    setIsProcessing(true);
    setProcessingType(type);
    setAiPreview('');
    if (type !== 'custom') setShowPromptInput(false);
    
    try {
      let result;
      switch (type) {
        case 'optimize': result = await agentAPI.optimizeSelection(finalSelection.text); setAiPreview(result.rewritten_text); break;
        case 'expand': result = await agentAPI.expandSelection(finalSelection.text); setAiPreview(result.expanded_text); break;
        case 'contract': result = await agentAPI.contractSelection(finalSelection.text); setAiPreview(result.contracted_text); break;
        case 'custom': result = await agentAPI.customPromptSelection(finalSelection.text, prompt); setAiPreview(result.modified_text); break;
        default: break;
      }
    } catch (error) {
      console.error('AI 处理失败:', error);
      alert('AI 处理失败，请重试');
      cleanupState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdopt = () => {
    if (!aiPreview) return;
    const newText = text.slice(0, selection.start) + aiPreview + text.slice(selection.end);
    setText(newText);
    onUpdate?.(newText);
    cleanupState();
  };
  
  const handlePromptInputToggle = (show) => {
    setShowPromptInput(show);
    if (show) {
      setAiPreview('');
      // 确保工具栏和选区状态都保持显示
      setShowToolbar(true);
      // 重要：不要清除选区状态
    } else {
      // 关闭自定义输入时，保持选区高光
      // 不调用 cleanupState()
    }
  };

  // 当显示高光时，确保overlay层同步textarea的滚动位置
  useEffect(() => {
    if (shouldShowBlueHighlight) {
      // 使用 requestAnimationFrame 确保在下一帧同步滚动位置
      requestAnimationFrame(() => {
        handleTextareaScroll();
      });
      
      // 再次确保同步，以防第一次同步失败
      setTimeout(() => {
        handleTextareaScroll();
      }, 0);
    }
  }, [shouldShowBlueHighlight, handleTextareaScroll]);

  // 简化 wheel 事件处理，移除可能导致问题的复杂逻辑
  const handleTextareaWheel = useCallback((e) => {
    // 简单的滚动处理，不阻止默认行为
    // e.stopPropagation();
  }, []);

  // 简化 wheel 事件监听器
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const handler = (e) => {
      // 移除 stopPropagation，允许正常滚动
      // e.stopPropagation();
    };
    
    textarea.addEventListener('wheel', handler, { passive: true });
    return () => textarea.removeEventListener('wheel', handler);
  }, []);

  // 调试信息
  console.log('暗色模式状态:', {
    isDarkMode,
    shouldShowHighlight,
    shouldShowBlueHighlight,
    isTextareaTransparent,
    selection: selection.text
  });

  return (
    <div ref={containerRef} className="relative h-full bg-white dark:bg-gray-900 text-black dark:text-white">
      <div 
        ref={overlayRef}
        className="absolute inset-0 p-4 pointer-events-none text-sm leading-relaxed font-mono z-5 whitespace-pre-wrap overflow-hidden"
        style={{ wordBreak: 'break-word' }}
        onScroll={handleTextareaScroll}
      >
        {/* 只在显示高光时渲染overlay文本 */}
        {shouldShowBlueHighlight && (
          <>
            <span style={{ color: isDarkMode ? 'white' : 'black' }}>{text.slice(0, selection.start)}</span>
            <span 
              ref={selectionSpanRef} 
              className="bg-blue-200 dark:bg-blue-600 bg-opacity-50 dark:bg-opacity-70 rounded px-0.5 text-black dark:text-white"
              style={{ 
                display: 'inline',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {selection.text}
            </span>
            <span style={{ color: isDarkMode ? 'white' : 'black' }}>{text.slice(selection.end)}</span>
          </>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onScroll={handleTextareaScroll}
        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none text-sm leading-relaxed font-mono border-none focus:ring-0 z-10 bg-transparent dark:bg-gray-900 ${
          isDarkMode ? 'selection-dark' : 'selection-light'
        }`}
        placeholder="在这里编辑 Markdown..."
        style={{ 
          caretColor: isDarkMode ? 'white' : 'black',
          color: isDarkMode ? 'white' : 'black',
          userSelect: 'auto',
          // 当显示高光时，让 textarea 的文字透明，避免重影
          ...(shouldShowBlueHighlight && {
            color: 'transparent',
            caretColor: isDarkMode ? 'white' : 'black', // 保持光标可见
          })
        }}
        // 移除 onFocus 事件，这是导致滚动的主要原因
        // onFocus={(e) => {
        //   e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // }}
      />
      {(showToolbar || showPromptInput) && (
        <div className="selection-toolbar">
          <SelectionToolbar
            position={toolbarState}
            selectedText={selection.text}
            onOptimize={() => handleAIRequest('optimize')}
            onExpand={() => handleAIRequest('expand')}
            onContract={() => handleAIRequest('contract')}
            onCustomPrompt={(p) => handleAIRequest('custom', p)}
            onPromptInputToggle={handlePromptInputToggle}
            isProcessing={isProcessing}
            processingType={processingType}
            aiPreview={aiPreview}
            onAdopt={handleAdopt}
            onCancelPreview={cleanupState}
            onClose={cleanupState}
            isVisible={showToolbar || showPromptInput}
            showPromptInput={showPromptInput}
            onPositionChange={handleToolbarPositionChange}
          />
        </div>
      )}
      

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-30">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-600">处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
});

PreviewEditor.displayName = 'PreviewEditor';
export default PreviewEditor;