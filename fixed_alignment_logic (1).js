// 监听对齐事件 - 修复版本
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
        const alignMatch = line.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)$/);
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
          const pairMatch = nextLine.match(/^::: ?(left|right)$/);
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
        for (let i = blockStartLine + 1; i < lines.length; i++) {
          if (lines[i].trim() === ':::') {
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
            blockEndLine: -1 // 会在上面的循环中设置
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
          
          if (line.match(/^::: ?(sololeft|solocenter|soloright)$/)) {
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
          // 提取块内容（不包括块标记）
          const blockContent = lines.slice(blockStartLine + 1, blockEndLine).join('\n');
          
          // 构建新的块
          const newBlock = `::: ${alignmentType}\n${blockContent}\n:::`;
          const newText = text.substring(0, blockStartPos) + newBlock + text.substring(blockEndPos);
          
          setText(newText);
          onUpdate?.(newText);
          setTimeout(() => {
            textarea.focus();
            // 将光标定位到新块的内容区域
            const newContentStart = blockStartPos + `::: ${alignmentType}\n`.length;
            const newContentEnd = newContentStart + blockContent.length;
            textarea.setSelectionRange(newContentStart, newContentEnd);
          }, 0);
          return;
        }
      }
    }
    
    // **修复5：改进的智能扩展逻辑**
    // 如果不在任何对齐块内，进行智能扩展
    let expandedStart = start;
    let expandedEnd = end;
    
    // 向前扩展到行首（但不跨越空行或对齐块标记）
    for (let i = start - 1; i >= 0; i--) {
      if (text[i] === '\n') {
        const nextLine = text.substring(i + 1).split('\n')[0].trim();
        // 如果遇到对齐块标记或空行，停止扩展
        if (nextLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)$/) || 
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
        if (nextLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)$/) || 
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
    
    // **修复6：创建新的对齐块**
    const newText = text.substring(0, expandedStart) + 
                   `::: ${alignmentType}\n${expandedContent}\n:::` + 
                   text.substring(expandedEnd);
    
    setText(newText);
    onUpdate?.(newText);
    setTimeout(() => {
      textarea.focus();
      // 将光标定位到新创建的对齐内容
      const newContentStart = expandedStart + `::: ${alignmentType}\n`.length;
      const newContentEnd = newContentStart + expandedContent.length;
      textarea.setSelectionRange(newContentStart, newContentEnd);
    }, 0);
  }
  
  window.addEventListener('align-left-selected-text', handleAlignmentEvent);
  window.addEventListener('align-center-selected-text', handleAlignmentEvent);
  window.addEventListener('align-right-selected-text', handleAlignmentEvent);
  
  return () => {
    window.removeEventListener('align-left-selected-text', handleAlignmentEvent);
    window.removeEventListener('align-center-selected-text', handleAlignmentEvent);
    window.removeEventListener('align-right-selected-text', handleAlignmentEvent);
  };
}, [text, onUpdate]);