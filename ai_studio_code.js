// ... inside handleAlignmentEvent
      const existingBlock = findExistingAlignmentBlock(start, end);
      
      if (existingBlock) {
        // 在现有对齐块内，更新对齐类型
        const lines = text.split('\n');
        
        console.log('更新现有对齐块:', { /* ... */ });
        
        const blockContent = lines.slice(existingBlock.blockStartLine + 1, existingBlock.blockEndLine).join('\n');
        const originalLine = lines[existingBlock.blockStartLine];
        const hashMatch = originalLine.match(/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)$/);
        const hashSuffix = hashMatch ? hashMatch[2] : '';
        const newBlock = `::: ${alignmentType}${hashSuffix}\n${blockContent}\n:::`;
        
        // --- FIX START ---
        // 修正空白行消失的问题 (与上面的修复逻辑完全相同)

        // 1. 找到块结束后的第一个字符位置
        let posAfterBlock = 0;
        for (let i = 0; i <= existingBlock.blockEndLine; i++) {
          posAfterBlock += lines[i].length + 1;
        }
        // 移除最后一个多余的换行符
        posAfterBlock -= 1;
        
        // 2. 从该位置开始，计算并跳过所有连续的换行符 (即空白行)
        let preservedNewlines = '';
        let posAfterNewlines = posAfterBlock;
        while (posAfterNewlines < text.length && text[posAfterNewlines] === '\n') {
          preservedNewlines += '\n';
          posAfterNewlines++;
        }
        
        // 3. 使用精确计算的位置来重建文本
        const textAfterBlock = text.substring(posAfterNewlines);
        const newText = text.substring(0, existingBlock.blockStart) + newBlock + preservedNewlines + textAfterBlock;
        // --- FIX END ---
        
        setText(newText);
        onUpdate?.(newText);
        setTimeout(() => {
          textarea.focus();
          const newContentStart = existingBlock.blockStart + `::: ${alignmentType}${hashSuffix}\n`.length;
          const newContentEnd = newContentStart + blockContent.length;
          textarea.setSelectionRange(newContentStart, newContentEnd);
        }, 0);
        return;
      }
// ...