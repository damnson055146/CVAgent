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
  
  // *** REWRITTEN: Simplified and robust position calculation ***
  const getSelectionPosition = useCallback(() => {
    if (!selectionSpanRef.current || !textareaRef.current || !containerRef.current) {
      return { x: 0, y: 0, arrowLeft: '50%' };
    }
    const spanRect = selectionSpanRef.current.getBoundingClientRect();
    const textareaRect = textareaRef.current.getBoundingClientRect();
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
    
    let y = spanRect.bottom + 8;
    if (y + toolbarHeight > containerRect.bottom - 10) {
      y = spanRect.top - toolbarHeight - 8;
    }
    let x = spanRect.left + (spanRect.width / 2) - (toolbarWidth / 2);
    // 约束在编辑区容器内
    const minX = containerRect.left + 5;
    const maxX = containerRect.right - toolbarWidth - 5;
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(containerRect.top + 10, Math.min(y, containerRect.bottom - toolbarHeight - 10));
    const arrowLeft = `${spanRect.left + (spanRect.width / 2) - x}px`;
    return { x, y, arrowLeft };
  }, [showPromptInput, aiPreview]);

  // Update toolbar position immediately after highlight is rendered
  useEffect(() => {
    if (showToolbar && selection.text) {
      // 使用requestAnimationFrame确保DOM更新完成，但不触发滚动
      requestAnimationFrame(() => {
        const newPosition = getSelectionPosition();
        // 只有当位置真正改变时才更新，避免不必要的重渲染
        setToolbarState(prev => {
          if (prev.x !== newPosition.x || prev.y !== newPosition.y || prev.arrowLeft !== newPosition.arrowLeft) {
            return newPosition;
          }
          return prev;
        });
      });
    }
  }, [showToolbar, selection.text, getSelectionPosition, aiPreview]);


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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isMenuOpen) return;

    const handleSelectionEnd = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = setTimeout(() => {
        if (!textareaRef.current) return;
        let { selectionStart: start, selectionEnd: end } = textareaRef.current;
        if (start !== end) {
          // 直接使用用户选择的范围，不进行单词边界扩展
          const selectedText = textareaRef.current.value.substring(start, end);
          setSelection({ start, end, text: selectedText });
          setShowToolbar(true);
        } else {
          if (!showPromptInput) {
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
    textarea.addEventListener('mouseup', handleSelectionEnd);
    textarea.addEventListener('keyup', handleKeyUp);
    return () => {
      textarea.removeEventListener('mouseup', handleSelectionEnd);
      textarea.removeEventListener('keyup', handleKeyUp);
      if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    };
  }, [isMenuOpen, showPromptInput, cleanupState, getSelectionPosition]);
  
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
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    if (ta) ta.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      if (ta) ta.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen) return;
      if (showToolbar && !event.target.closest('.selection-toolbar') && !textareaRef.current?.contains(event.target)) {
        cleanupState();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolbar, isMenuOpen, cleanupState]);

  // 添加全局滚动防止机制
  useEffect(() => {
    const preventScroll = (e) => {
      // 当工具栏显示时，防止页面滚动
      if (showToolbar && selection.text) {
        // 允许文本框内部的滚动
        if (textareaRef.current?.contains(e.target)) {
          return;
        }
        // 允许工具栏内的滚动
        if (e.target.closest('.selection-toolbar')) {
          return;
        }
        // 阻止其他滚动
        e.preventDefault();
      }
    };

    if (showToolbar && selection.text) {
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [showToolbar, selection.text]);

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
    }
  };

  const handleTextareaScroll = useCallback(() => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // 防止textarea滚动时触发页面滚动
  const handleTextareaWheel = useCallback((e) => {
    // 允许textarea内部的滚动，但阻止页面滚动
    const textarea = textareaRef.current;
    if (textarea) {
      const { scrollTop, scrollHeight, clientHeight } = textarea;
      const delta = e.deltaY;
      
      // 检查是否在边界
      if ((delta > 0 && scrollTop + clientHeight >= scrollHeight) ||
          (delta < 0 && scrollTop <= 0)) {
        e.preventDefault();
      }
    }
  }, []);

  const shouldShowHighlight = showToolbar && selection.text;
  const shouldShowBlueHighlight = shouldShowHighlight;
  const isTextareaTransparent = shouldShowBlueHighlight;

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
        {shouldShowBlueHighlight && (
          <>
            <span style={{ color: 'transparent' }}>{text.slice(0, selection.start)}</span>
            <span ref={selectionSpanRef} className="bg-blue-200 dark:bg-blue-600 bg-opacity-50 dark:bg-opacity-70 rounded px-0.5 text-black dark:text-white">
              {selection.text}
            </span>
            <span style={{ color: 'transparent' }}>{text.slice(selection.end)}</span>
          </>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onScroll={handleTextareaScroll}
        onWheel={handleTextareaWheel}
        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none text-sm leading-relaxed font-mono border-none focus:ring-0 z-10 bg-transparent dark:bg-gray-900 ${
          isDarkMode ? 'selection-dark' : 'selection-light'
        }`}
        placeholder="在这里编辑 Markdown..."
        style={{ 
          caretColor: isDarkMode ? 'white' : 'black',
          color: isDarkMode ? 'white' : 'black',
          userSelect: 'auto',
          scrollBehavior: 'smooth',
          '--tw-text-opacity': '1',
        }}
        onFocus={(e) => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }}
      />
      {showToolbar && (
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
            isVisible={showToolbar}
            showPromptInput={showPromptInput}
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