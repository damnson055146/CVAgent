import React, { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from 'react';
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

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    generatePDF: () => {
      // 这里可以添加PDF生成逻辑
      console.log('PDF生成功能待实现');
    },
    generateWord: () => {
      // 这里可以添加Word生成逻辑
      console.log('Word生成功能待实现');
    }
  }));

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

  // 监听加粗事件
  useEffect(() => {
    function handleBoldEvent() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = text.substring(start, end);
      
      if (!selectedText.trim()) {
        alert('请先选中要加粗的内容');
        return;
      }
      
      let newText;
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        // 如果已经加粗，则取消加粗
        newText = text.substring(0, start) + selectedText.slice(2, -2) + text.substring(end);
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start, end - 4);
          textarea.focus();
        }, 0);
      } else {
        // 添加加粗标记
        newText = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start, end + 4);
          textarea.focus();
        }, 0);
      }
    }
    
    window.addEventListener('bold-selected-text', handleBoldEvent);
    return () => window.removeEventListener('bold-selected-text', handleBoldEvent);
  }, [text, onUpdate]);

  // 监听斜体事件
  useEffect(() => {
    function handleItalicEvent() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = text.substring(start, end);
      
      if (!selectedText.trim()) {
        alert('请先选中要斜体的内容');
        return;
      }
      
      let newText;
      if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
        // 如果已经是斜体（单个*），则取消斜体
        newText = text.substring(0, start) + selectedText.slice(1, -1) + text.substring(end);
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start, end - 2);
          textarea.focus();
        }, 0);
      } else {
        // 添加斜体标记（单个*）
        newText = text.substring(0, start) + '*' + selectedText + '*' + text.substring(end);
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start, end + 2);
          textarea.focus();
        }, 0);
      }
    }
    
    window.addEventListener('italic-selected-text', handleItalicEvent);
    return () => window.removeEventListener('italic-selected-text', handleItalicEvent);
  }, [text, onUpdate]);

  // 监听对齐事件
  useEffect(() => {
    function handleAlignmentEvent(event) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = text.substring(start, end);
      
      if (!selectedText.trim()) {
        alert('请先选中要对齐的内容');
        return;
      }
      
      // 确定对齐类型
      let alignmentType = 'sololeft';
      if (event.type === 'align-center-selected-text') {
        alignmentType = 'solocenter';
      } else if (event.type === 'align-right-selected-text') {
        alignmentType = 'soloright';
      }
      
      // **修复1：改进的左右分栏检测逻辑**
      // 检查选区是否在真正的成对 left/right 块内
      function findEnclosingPairedBlock(start, end) {
        const lines = text.split('\n');
        let currentPos = 0;
        let startLineNum = -1;
        let endLineNum = -1;
        
        // 找到选区所在的行号
        for (let i = 0; i < lines.length; i++) {
          const lineStart = currentPos;
          const lineEnd = currentPos + lines[i].length;
          
          if (startLineNum === -1 && start >= lineStart && start <= lineEnd) {
            startLineNum = i;
          }
          if (endLineNum === -1 && end >= lineStart && end <= lineEnd) {
            endLineNum = i;
          }
          
          currentPos = lineEnd + 1; // +1 for newline
          
          if (startLineNum !== -1 && endLineNum !== -1) break;
        }
        
        // 向上查找最近的对齐块开始
        let blockStart = -1;
        let blockType = null;
        let blockStartLine = -1;
        
        for (let i = startLineNum; i >= 0; i--) {
          const line = lines[i].trim();
          const alignMatch = line.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/);
          if (alignMatch) {
            blockType = alignMatch[1];
            blockStartLine = i;
            // 计算块开始的字符位置
            blockStart = 0;
            for (let j = 0; j < i; j++) {
              blockStart += lines[j].length + 1;
            }
            break;
          } else if (line === ':::') {
            break; // 遇到块结束标记，停止查找
          }
        }
        
        if (blockStart === -1) return null;
        
        // 如果是 left 或 right 块，查找配对块
        if (blockType === 'left' || blockType === 'right') {
          // 向下查找块结束和配对块
          let blockEnd = -1;
          let blockEndLine = -1;
          let pairStart = -1;
          let pairEnd = -1;
          let pairType = null;
          
          // 先找到当前块的结束
          for (let i = blockStartLine + 1; i < lines.length; i++) {
            if (lines[i].trim() === ':::') {
              blockEndLine = i;
              blockEnd = 0;
              for (let j = 0; j <= i; j++) {
                blockEnd += lines[j].length + 1;
              }
              break;
            }
          }
          
          if (blockEnd === -1) return null;
          
          // 查找紧邻的配对块
          let nextBlockLine = blockEndLine + 1;
          if (nextBlockLine < lines.length) {
            const nextLine = lines[nextBlockLine].trim();
            const pairMatch = nextLine.match(/^::: ?(left|right)(#.*)?$/);
            if (pairMatch) {
              pairType = pairMatch[1];
              // 检查是否是有效配对（left-right 或 right-left）
              if ((blockType === 'left' && pairType === 'right') || 
                  (blockType === 'right' && pairType === 'left')) {
                
                pairStart = 0;
                for (let j = 0; j < nextBlockLine; j++) {
                  pairStart += lines[j].length + 1;
                }
                
                // 找配对块的结束
                for (let i = nextBlockLine + 1; i < lines.length; i++) {
                  if (lines[i].trim() === ':::') {
                    pairEnd = 0;
                    for (let j = 0; j <= i; j++) {
                      pairEnd += lines[j].length + 1;
                    }
                    break;
                  }
                }
                
                if (pairEnd !== -1) {
                  // 检查选区是否完全在配对块范围内
                  if (start >= blockStart && end <= pairEnd) {
                    return {
                      isPaired: true,
                      blockStart,
                      pairEnd,
                      leftStart: blockType === 'left' ? blockStart : pairStart,
                      rightStart: blockType === 'right' ? blockStart : pairStart
                    };
                  }
                }
              }
            }
          }
        }
        
        // **修复2：改进的嵌套块检测**
        // 检查是否在单独的对齐块内（solocenter, sololeft, soloright）
        if (blockType === 'sololeft' || blockType === 'solocenter' || blockType === 'soloright') {
          // 找到块结束
          let blockEnd = -1;
          let blockEndLine = -1;
          for (let i = blockStartLine + 1; i < lines.length; i++) {
            if (lines[i].trim() === ':::') {
              blockEndLine = i;
              blockEnd = 0;
              for (let j = 0; j <= i; j++) {
                blockEnd += lines[j].length + 1;
              }
              break;
            }
          }
          
          if (blockEnd !== -1 && start >= blockStart && end <= blockEnd) {
            return {
              isPaired: false,
              isSingleBlock: true,
              blockType,
              blockStart,
              blockEnd,
              blockStartLine,
              blockEndLine: blockEndLine
            };
          }
        }
        
        return null;
      }
      
      const enclosingBlock = findEnclosingPairedBlock(start, end);
      
      // **修复3：区分真正的配对块和单独块**
      if (enclosingBlock) {
        if (enclosingBlock.isPaired) {
          // 在真正的左右分栏布局中
          alert('左右分栏布局不支持单独的对齐操作，请选中整个分栏内容进行修改');
          return;
        } else if (enclosingBlock.isSingleBlock) {
          // **修复4：在单独对齐块内的处理**
          // 如果选中的是块内的部分内容，更新整个块的对齐方式
          const lines = text.split('\n');
          let blockStartPos = 0;
          let blockEndPos = text.length;
          let blockStartLine = -1;
          let blockEndLine = -1;
          
          // 重新精确计算块的位置
          let currentPos = 0;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineStart = currentPos;
            const lineEnd = currentPos + lines[i].length;
            
            if (line.match(/^::: ?(sololeft|solocenter|soloright)(#.*)?$/)) {
              if (start >= lineStart && start <= lineEnd + 1) {
                blockStartLine = i;
                blockStartPos = lineStart;
              }
            } else if (line === ':::' && blockStartLine !== -1 && blockEndLine === -1) {
              if (end <= lineEnd + 1) {
                blockEndLine = i;
                blockEndPos = lineEnd + 1;
                break;
              }
            }
            
            currentPos = lineEnd + 1;
          }
          
          if (blockStartLine !== -1 && blockEndLine !== -1) {
            console.log('更新单独对齐块:', {
              blockStartLine,
              blockEndLine,
              blockStartPos,
              blockEndPos
            });
            
            // 提取块内容（不包括块标记）
            const blockContent = lines.slice(blockStartLine + 1, blockEndLine).join('\n');
            
            console.log('单独对齐块内容:', blockContent);
            
            // 检查原块是否有#标记
            const originalLine = lines[blockStartLine];
            const hashMatch = originalLine.match(/^::: ?(sololeft|solocenter|soloright)(#.*)$/);
            const hashSuffix = hashMatch ? hashMatch[2] : '';
            
            // 构建新的块 - 不添加额外的换行符，保持原有格式
            const newBlock = `::: ${alignmentType}${hashSuffix}\n${blockContent}\n:::`;
            
            // --- FIX START ---
            // 修正空白行消失的问题 (参考ai_studio_code.js的逻辑)

            // 1. 重新精确计算块的位置，避免连续操作时的累积误差
            const lines = text.split('\n');
            let actualBlockStart = 0;
            let actualBlockEnd = 0;
            
            // 重新计算块开始位置
            for (let i = 0; i < blockStartLine; i++) {
              actualBlockStart += lines[i].length + 1;
            }
            
            // 重新计算块结束位置
            for (let i = 0; i <= blockEndLine; i++) {
              actualBlockEnd += lines[i].length + 1;
            }
            actualBlockEnd -= 1; // 移除最后一个多余的换行符
            
            // 2. 从该位置开始，计算并跳过所有连续的换行符 (即空白行)
            let preservedNewlines = '';
            let posAfterNewlines = actualBlockEnd;
            while (posAfterNewlines < text.length && text[posAfterNewlines] === '\n') {
              preservedNewlines += '\n';
              posAfterNewlines++;
            }
            
            // 3. 使用重新计算的位置来重建文本
            const textAfterBlock = text.substring(posAfterNewlines);
            const newText = text.substring(0, actualBlockStart) + newBlock + preservedNewlines + textAfterBlock;
            // --- FIX END ---
            
            setText(newText);
            onUpdate?.(newText);
            setTimeout(() => {
              textarea.focus();
              // 将光标定位到新块的内容区域，使用重新计算的位置
              const newContentStart = actualBlockStart + `::: ${alignmentType}${hashSuffix}\n`.length;
              const newContentEnd = newContentStart + blockContent.length;
              textarea.setSelectionRange(newContentStart, newContentEnd);
            }, 0);
            return;
          }
        }
      }
      
      // **修复5：检查是否在现有的对齐块内（包括center类型）**
      function findExistingAlignmentBlock(start, end) {
        const lines = text.split('\n');
        let currentPos = 0;
        let startLineNum = -1;
        let endLineNum = -1;
        
        // 找到选区所在的行号
        for (let i = 0; i < lines.length; i++) {
          const lineStart = currentPos;
          const lineEnd = currentPos + lines[i].length;
          
          if (startLineNum === -1 && start >= lineStart && start <= lineEnd) {
            startLineNum = i;
          }
          if (endLineNum === -1 && end >= lineStart && end <= lineEnd) {
            endLineNum = i;
          }
          
          currentPos = lineEnd + 1;
          
          if (startLineNum !== -1 && endLineNum !== -1) break;
        }
        
        // 向上查找最近的对齐块开始
        let blockStart = -1;
        let blockType = null;
        let blockStartLine = -1;
        
        for (let i = startLineNum; i >= 0; i--) {
          const line = lines[i].trim();
          const alignMatch = line.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/);
          if (alignMatch) {
            blockType = alignMatch[1];
            blockStartLine = i;
            blockStart = 0;
            for (let j = 0; j < i; j++) {
              blockStart += lines[j].length + 1;
            }
            break;
          } else if (line === ':::') {
            break;
          }
        }
        
        if (blockStart === -1) return null;
        
        // 找到块结束
        let blockEnd = -1;
        let blockEndLine = -1;
        for (let i = blockStartLine + 1; i < lines.length; i++) {
          if (lines[i].trim() === ':::') {
            blockEndLine = i;
            blockEnd = 0;
            for (let j = 0; j <= i; j++) {
              blockEnd += lines[j].length + 1;
            }
            break;
          }
        }
        
        if (blockEnd !== -1 && start >= blockStart && end <= blockEnd) {
          return {
            blockType,
            blockStart,
            blockEnd,
            blockStartLine,
            blockEndLine: blockEndLine
          };
        }
        
        return null;
      }
      
      const existingBlock = findExistingAlignmentBlock(start, end);
      
      if (existingBlock) {
        // 在现有对齐块内，更新对齐类型
        const lines = text.split('\n');
        
        console.log('更新现有对齐块:', {
          blockType: existingBlock.blockType,
          blockStartLine: existingBlock.blockStartLine,
          blockEndLine: existingBlock.blockEndLine,
          blockStart: existingBlock.blockStart,
          blockEnd: existingBlock.blockEnd,
          totalLines: lines.length
        });
        
        // 正确提取块内容（不包括开始和结束标记）
        const blockContent = lines.slice(existingBlock.blockStartLine + 1, existingBlock.blockEndLine).join('\n');
        
        console.log('提取的块内容:', blockContent);
        
        // 检查原块是否有#标记
        const originalLine = lines[existingBlock.blockStartLine];
        const hashMatch = originalLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)$/);
        const hashSuffix = hashMatch ? hashMatch[2] : '';
        
        // 构建新的块 - 不添加额外的换行符，保持原有格式
        const newBlock = `::: ${alignmentType}${hashSuffix}\n${blockContent}\n:::`;
        
        // --- FIX START ---
        // 修正空白行消失的问题 (参考ai_studio_code.js的逻辑)

        // 1. 重新精确计算块的位置，避免连续操作时的累积误差
        let actualBlockStart = 0;
        let actualBlockEnd = 0;
        
        // 重新计算块开始位置
        for (let i = 0; i < existingBlock.blockStartLine; i++) {
          actualBlockStart += lines[i].length + 1;
        }
        
        // 重新计算块结束位置
        for (let i = 0; i <= existingBlock.blockEndLine; i++) {
          actualBlockEnd += lines[i].length + 1;
        }
        actualBlockEnd -= 1; // 移除最后一个多余的换行符
        
        // 2. 从该位置开始，计算并跳过所有连续的换行符 (即空白行)
        let preservedNewlines = '';
        let posAfterNewlines = actualBlockEnd;
        while (posAfterNewlines < text.length && text[posAfterNewlines] === '\n') {
          preservedNewlines += '\n';
          posAfterNewlines++;
        }
        
        console.log('替换范围:', {
          originalStart: existingBlock.blockStart,
          actualBlockStart,
          originalEnd: existingBlock.blockEnd,
          actualBlockEnd,
          posAfterNewlines,
          preservedNewlinesLength: preservedNewlines.length,
          newBlockLength: newBlock.length
        });
        
        // 3. 使用重新计算的位置来重建文本
        const textAfterBlock = text.substring(posAfterNewlines);
        const newText = text.substring(0, actualBlockStart) + newBlock + preservedNewlines + textAfterBlock;
        // --- FIX END ---
        
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.focus();
          // 将光标定位到新块的内容区域，使用重新计算的位置
          const newContentStart = actualBlockStart + `::: ${alignmentType}${hashSuffix}\n`.length;
          const newContentEnd = newContentStart + blockContent.length;
          textarea.setSelectionRange(newContentStart, newContentEnd);
        }, 0);
        return;
      }
      
      // **修复6：改进的智能扩展逻辑**
      // 如果不在任何对齐块内，进行智能扩展
      let expandedStart = start;
      let expandedEnd = end;
      
      // 向前扩展到行首（但不跨越空行或对齐块标记）
      for (let i = start - 1; i >= 0; i--) {
        if (text[i] === '\n') {
          const nextLine = text.substring(i + 1).split('\n')[0].trim();
          // 如果遇到对齐块标记或空行，停止扩展
          if (nextLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/) || 
              nextLine === ':::' || nextLine === '') {
            break;
          }
          expandedStart = i + 1;
          break;
        }
        if (i === 0) {
          expandedStart = 0;
          break;
        }
      }
      
      // 向后扩展到行尾（但不跨越空行或对齐块标记）
      for (let i = end; i < text.length; i++) {
        if (text[i] === '\n') {
          const nextLine = text.substring(i + 1).split('\n')[0].trim();
          // 如果遇到对齐块标记或空行，停止扩展
          if (nextLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/) || 
              nextLine === ':::' || nextLine === '') {
            expandedEnd = i;
            break;
          }
        }
        if (i === text.length - 1) {
          expandedEnd = text.length;
          break;
        }
      }
      
      // 获取扩展后的完整内容
      const expandedContent = text.substring(expandedStart, expandedEnd).trim();
      
      if (!expandedContent) {
        alert('没有找到可对齐的内容');
        return;
      }
      
      // **修复7：创建新的对齐块**
      // 智能处理换行符，避免添加多余的换行
      let prefix = '';
      let suffix = '';
      
      // 检查前面是否需要换行
      if (expandedStart > 0 && text[expandedStart - 1] !== '\n') {
        prefix = '\n';
      }
      
      // 检查后面是否需要换行
      if (expandedEnd < text.length && text[expandedEnd] !== '\n') {
        suffix = '\n';
      }
      
      const newText = text.substring(0, expandedStart) + 
                     `${prefix}::: ${alignmentType}\n${expandedContent}\n:::${suffix}` + 
                     text.substring(expandedEnd);
      
      setText(newText);
      onUpdate?.(newText);
      setTimeout(() => {
        textarea.focus();
        // 将光标定位到新创建的对齐内容
        const newContentStart = expandedStart + prefix.length + `::: ${alignmentType}\n`.length;
        const newContentEnd = newContentStart + expandedContent.length;
        textarea.setSelectionRange(newContentStart, newContentEnd);
      }, 0);
    }
    
    window.addEventListener('align-left-selected-text', handleAlignmentEvent);
    window.addEventListener('align-center-selected-text', handleAlignmentEvent);
    window.addEventListener('align-right-selected-text', handleAlignmentEvent);
    
    // 添加标题插入事件监听器
    const handleHeadingEvent = (event) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const { level } = event.detail;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = text.substring(start, end);
      
      // 获取当前行的开始位置
      const beforeCursor = text.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = text.substring(lineStart, start);
      
      // 如果当前行已经有标题标记，先移除
      let newText = text;
      let newCursorPos = start;
      
      if (currentLine.match(/^#{1,6}\s/)) {
        // 移除现有标题标记
        const titleMatch = currentLine.match(/^(#{1,6})\s(.*)/);
        if (titleMatch) {
          newText = text.substring(0, lineStart) + titleMatch[2] + text.substring(start);
          newCursorPos = lineStart + titleMatch[2].length;
        }
      } else {
        // 添加标题标记
        const headingPrefix = '#'.repeat(level) + ' ';
        newText = text.substring(0, lineStart) + headingPrefix + currentLine + text.substring(start);
        newCursorPos = lineStart + headingPrefix.length + currentLine.length;
      }
      
      setText(newText);
      onUpdate?.(newText);
      
      // 设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    };
    
    window.addEventListener('insert-heading', handleHeadingEvent);
    
    return () => {
      window.removeEventListener('align-left-selected-text', handleAlignmentEvent);
      window.removeEventListener('align-center-selected-text', handleAlignmentEvent);
      window.removeEventListener('align-right-selected-text', handleAlignmentEvent);
      window.removeEventListener('insert-heading', handleHeadingEvent);
    };
  }, [text, onUpdate]);

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

  // 添加键盘快捷键支持
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const handleKeyDown = (e) => {
      // Ctrl+1, Ctrl+2, Ctrl+3 插入标题
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key >= '1' && e.key <= '3') {
          e.preventDefault();
          const level = parseInt(e.key);
          window.dispatchEvent(new CustomEvent('insert-heading', { detail: { level } }));
        }
      }
    };
    
    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 渲染即时预览文本
  const renderInstantPreview = () => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const cursorLine = text.substring(0, cursorPosition).split('\n').length - 1;
    
    return lines.map((line, lineIndex) => {
      const isCurrentLine = lineIndex === cursorLine;
      
      // 计算当前行的选择状态
      const lineStartPos = text.split('\n').slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEndPos = lineStartPos + line.length;
      const isSelected = shouldShowBlueHighlight && 
        selection.start < lineEndPos && selection.end > lineStartPos;
      
      // 解析Markdown格式
      let displayText = line;
      let isHeading = false;
      let headingLevel = 0;
      
      // 标题格式 - 只处理行首的标题
      if (line.match(/^#{1,6}\s/)) {
        const match = line.match(/^(#{1,6})\s(.*)/);
        if (match) {
          headingLevel = match[1].length;
          displayText = match[2]; // 只显示标题内容，不显示#符号
          isHeading = true;
        }
      }
      
      // 应用样式
      let style = {
        color: isDarkMode ? 'white' : 'black',
        fontSize: isHeading ? (headingLevel === 1 ? '1.5rem' : headingLevel === 2 ? '1.25rem' : '1.125rem') : 'inherit',
        fontWeight: isHeading ? 'bold' : 'normal',
        marginBottom: isHeading ? '0.5rem' : '0',
      };
      
      return (
        <div key={lineIndex} style={{ 
          backgroundColor: isCurrentLine ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          borderRadius: isCurrentLine ? '4px' : '0',
          padding: isCurrentLine ? '2px 4px' : '0',
        }}>
          {isSelected ? (
            <span 
              ref={selectionSpanRef} 
              style={{
                ...style,
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                borderRadius: '2px',
                padding: '1px 2px',
              }}
            >
              {displayText}
            </span>
          ) : (
            <span style={style}>
              {displayText}
            </span>
          )}
          {lineIndex < lines.length - 1 && '\n'}
        </div>
      );
    });
  };

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
      {/* 即时预览层 */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 p-4 pointer-events-none text-sm leading-relaxed font-mono z-5 whitespace-pre-wrap overflow-hidden"
        style={{ 
          wordBreak: 'break-word',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          lineHeight: '1.5',
        }}
        onScroll={handleTextareaScroll}
      >
        {/* 渲染即时预览文本 */}
        {renderInstantPreview()}
      </div>
      
      {/* 编辑层 */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onScroll={handleTextareaScroll}
        className={`absolute inset-0 w-full h-full p-4 resize-none outline-none text-sm leading-relaxed font-mono border-none focus:ring-0 z-10 ${
          isDarkMode ? 'selection-dark' : 'selection-light'
        }`}
        placeholder="在这里编辑 Markdown..."
        style={{ 
          caretColor: isDarkMode ? 'white' : 'black',
          color: 'transparent', // 始终透明，避免与预览层重叠
          backgroundColor: 'transparent',
          userSelect: 'auto',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          lineHeight: '1.5',
        }}
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