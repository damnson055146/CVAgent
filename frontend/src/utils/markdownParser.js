// Markdown解析器 - 包含所有Markdown解析和块处理逻辑
import { A4_WIDTH_PX, A4_HEIGHT_PX, PAGE_MARGIN_PX, MAX_CONTENT_HEIGHT } from '../config/constants.js';

// 解析自定义块
export function parseCustomBlocks(md) {
  if (!md) return [];
  
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  
  console.log('开始解析自定义块，总行数:', lines.length);
  
  while (i < lines.length) {
    if (!lines[i].trim()) { 
      i++; 
      continue; 
    }
    
    // 检查是否是成对的 left/right 布局
    if (/^::: ?left(#.*)?$/.test(lines[i])) {
      let leftLines = [];
      let nestedBlocks = [];
      i++;
      
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') {
          leftLines.push(lines[i]);
          if (/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/.test(lines[i])) {
            nestedBlocks.push(lines[i]);
          }
        }
        i++;
      }
      i++;
      
      // 检查后面是否有右对齐块
      if (i < lines.length && /^::: ?right(#.*)?$/.test(lines[i])) {
        let rightLines = [];
        i++;
        while (i < lines.length && !/^:::$/.test(lines[i])) {
          if (lines[i].trim() !== '') rightLines.push(lines[i]);
          i++;
        }
        i++;
        const maxLen = Math.max(leftLines.length, rightLines.length);
        for (let j = 0; j < maxLen; j++) {
          blocks.push({ type: 'row', left: leftLines[j] || '', right: rightLines[j] || '' });
        }
        continue;
      } else {
        // 只有左对齐块，作为独立的 left 块处理
        if (nestedBlocks.length > 0) {
          const nestedContent = leftLines.join('\n');
          const nestedParsed = parseCustomBlocks(nestedContent);
          blocks.push({ 
            type: 'left', 
            content: nestedParsed,
            hasNested: true,
            alignment: 'left'
          });
        } else {
          leftLines.forEach(l => blocks.push({ type: 'left', content: l, alignment: 'left' }));
        }
        continue;
      }
    }
    
    // 统一处理其他对齐块类型
    const alignMatch = lines[i].match(/^::: ?(center|sololeft|solocenter|soloright)(#.*)?$/);
    if (alignMatch) {
      const alignType = alignMatch[1];
      const blockStartIndex = i;
      let content = [];
      let nestedBlocks = [];
      i++;
      
      console.log(`发现 ${alignType} 对齐块，开始行: ${blockStartIndex}`);
      
      // 收集块内容，直到找到结束标记
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') {
          content.push(lines[i]);
          // 检查是否有嵌套的对齐块
          if (/^::: ?(left|right|center|sololeft|solocenter|soloright)(#.*)?$/.test(lines[i])) {
            nestedBlocks.push(lines[i]);
          }
        }
        i++;
      }
      i++; // 跳过结束的 :::
      
      console.log(`${alignType} 块内容行数: ${content.length}, 嵌套块数: ${nestedBlocks.length}`);
      console.log(`${alignType} 块内容:`, content);
      
      if (nestedBlocks.length > 0) {
        // 如果有嵌套块，递归解析
        const nestedContent = content.join('\n');
        const nestedParsed = parseCustomBlocks(nestedContent);
        blocks.push({ 
          type: alignType, 
          content: nestedParsed,
          hasNested: true,
          alignment: alignType // 添加对齐属性
        });
        console.log(`${alignType} 块包含嵌套内容，递归解析结果:`, nestedParsed.length, '个子块');
      } else {
        // 对于solo类型，保持原始内容格式，不合并成字符串
        // 这样可以保留Markdown格式如标题和粗体
        if (content.length === 1) {
          // 单行内容，直接使用
          blocks.push({ 
            type: alignType, 
            content: content[0],
            hasNested: false,
            alignment: alignType // 添加对齐属性
          });
        } else {
          // 多行内容，保持数组格式以便后续处理
          blocks.push({ 
            type: alignType, 
            content: content,
            hasNested: false,
            alignment: alignType // 添加对齐属性
          });
        }
      }
      continue;
    }
    
    // 处理普通内容
    const line = lines[i];
    
    // 检查是否是标题行
    const headingMatch = line.match(/^(#+)\s*(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      blocks.push({ 
        type: 'heading', 
        level: level,
        content: headingText,
        alignment: 'left' // 默认左对齐
      });
    } else {
      blocks.push({ type: 'normal', content: line, alignment: 'left' });
    }
    
    i++;
  }
  
  console.log('解析完成，生成块数:', blocks.length);
  blocks.forEach((block, idx) => {
    console.log(`块 ${idx}: 类型=${block.type}, 内容预览="${
      typeof block.content === 'string' ? 
      block.content.substring(0, 30) : 
      Array.isArray(block.content) ? 
      `[${block.content.length}个子块]` : 
      block.left ? `左:${block.left.substring(0, 15)}|右:${(block.right || '').substring(0, 15)}` :
      '未知格式'
    }"`);
  });
  
  return blocks;
}

// 渲染块到页面
export function renderBlocksToPages(blocks, config, measurerRef) {
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;
  
  // 创建测量环境
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = `
    position: absolute;
    visibility: hidden;
    top: -9999px;
    left: -9999px;
    width: ${A4_WIDTH_PX - (PAGE_MARGIN_PX * 2)}px;
    font-family: ${config.font};
    font-size: ${config.fontSize}pt;
    line-height: ${config.lineHeight};
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    word-wrap: break-word;
    white-space: pre-wrap;
  `;
  document.body.appendChild(tempDiv);

  // 测量单个块的高度
  function measureBlock(block) {
    if (!block || (!block.content && !block.left && !block.right)) {
      return 20;
    }

    let blockEl = document.createElement('div');
    blockEl.style.cssText = `
      margin: 0;
      padding: 0;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      white-space: pre-wrap;
    `;
    
    try {
      if (block.type === 'center') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: center; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              // 确保content是字符串
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'sololeft') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'solocenter') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通居中对齐块
          const content = Array.isArray(block.content) ? block.content : [block.content];
          content.forEach(line => {
            if (line && line.trim()) {
              const lineEl = document.createElement('div');
              lineEl.textContent = line.replace(/[#*_`]/g, '');
              el.appendChild(lineEl);
            }
          });
        }
        blockEl.appendChild(el);
      } else if (block.type === 'row') {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; margin: 4px 0;';
        
        const left = document.createElement('div');
        left.style.cssText = 'flex: 1; text-align: left;';
        left.textContent = (block.left || '').replace(/[#*_`]/g, '');
        
        const right = document.createElement('div');
        right.style.cssText = 'flex: 1; text-align: right;';
        right.textContent = (block.right || '').replace(/[#*_`]/g, '');
        
        row.appendChild(left);
        row.appendChild(right);
        blockEl.appendChild(row);
      } else if (block.type === 'left') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: left; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'sololeft') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'solocenter') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通左对齐块
          const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
          el.textContent = content.replace(/[#*_`]/g, '');
        }
        blockEl.appendChild(el);
      } else if (block.type === 'right') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: right; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通右对齐块
          const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
          el.textContent = content.replace(/[#*_`]/g, '');
        }
        blockEl.appendChild(el);
      } else if (block.type === 'sololeft') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: left; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'sololeft') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'solocenter') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通单独左对齐块
          const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
          el.textContent = content.replace(/[#*_`]/g, '');
        }
        blockEl.appendChild(el);
      } else if (block.type === 'solocenter') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: center; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'sololeft') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'solocenter') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通单独居中对齐块
          const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
          el.textContent = content.replace(/[#*_`]/g, '');
        }
        blockEl.appendChild(el);
      } else if (block.type === 'soloright') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: right; margin: 4px 0;';
        
        if (block.hasNested) {
          // 处理嵌套对齐块
          block.content.forEach(nestedBlock => {
            const nestedEl = document.createElement('div');
            if (nestedBlock.type === 'left') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'right') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'center') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'sololeft') {
              nestedEl.style.cssText = 'text-align: left; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'solocenter') {
              nestedEl.style.cssText = 'text-align: center; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else if (nestedBlock.type === 'soloright') {
              nestedEl.style.cssText = 'text-align: right; margin: 2px 0;';
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            } else {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : (nestedBlock.content || '');
              nestedEl.textContent = content.replace(/[#*_`]/g, '');
            }
            el.appendChild(nestedEl);
          });
        } else {
          // 处理普通单独右对齐块
          const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
          el.textContent = content.replace(/[#*_`]/g, '');
        }
        blockEl.appendChild(el);
      } else {
        // normal类型 - 更精确的测量
        const el = document.createElement('div');
        el.style.cssText = `
          margin: 0;
          padding: 0;
          font-family: ${config.font};
          font-size: ${config.fontSize}pt;
          line-height: ${config.lineHeight};
          word-wrap: break-word;
          white-space: pre-wrap;
        `;
        const content = Array.isArray(block.content) ? block.content.join('') : (block.content || '');
        el.textContent = content.replace(/[#*_`]/g, '');
        blockEl.appendChild(el);
      }
      
      tempDiv.appendChild(blockEl);
      
      // 强制重新计算布局
      tempDiv.offsetHeight;
      blockEl.offsetHeight;
      
      let blockHeight = blockEl.offsetHeight;
      tempDiv.removeChild(blockEl);
      
      // 对于normal类型，确保最小高度
      if (block.type === 'normal' && blockHeight < 16) {
        blockHeight = Math.max(16, config.fontSize * config.lineHeight * 1.2);
      }
      
      if (blockHeight <= 0) {
        let contentLength = 0;
        if (block.content) {
          if (Array.isArray(block.content)) {
            contentLength = block.content.join('').length;
          } else {
            contentLength = String(block.content).length;
          }
        } else if (block.left || block.right) {
          contentLength = (block.left || '').length + (block.right || '').length;
        }
        const estimatedLines = Math.max(1, Math.ceil(contentLength / 80));
        blockHeight = estimatedLines * (config.fontSize * config.lineHeight * 1.33);
      }
      
      return Math.max(blockHeight, 16);
      
    } catch (error) {
      console.error('Error measuring block:', error, block);
      let contentLength = 0;
      if (block.content) {
        if (Array.isArray(block.content)) {
          contentLength = block.content.join('').length;
        } else {
          contentLength = String(block.content).length;
        }
      } else if (block.left || block.right) {
        contentLength = (block.left || '').length + (block.right || '').length;
      }
      return Math.max(20, contentLength * 0.5);
    }
  }

  // 简化的分页逻辑
  console.log('开始分页处理，总块数:', blocks.length);
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    if (!block || (!block.content && !block.left && !block.right)) {
      console.warn(`跳过无效块 ${i}:`, block);
      continue;
    }
    
    const blockHeight = measureBlock(block);
    console.log(`块 ${i} (${block.type}) 高度: ${blockHeight}px, 当前页高度: ${currentHeight}px`);
    
    // 如果当前页放不下这个块，先保存当前页
    if (currentHeight + blockHeight > MAX_CONTENT_HEIGHT && currentPage.length > 0) {
      console.log(`保存当前页，包含 ${currentPage.length} 个块，高度: ${currentHeight}px`);
      pages.push([...currentPage]);
      currentPage = [];
      currentHeight = 0;
    }
    
    // 将块添加到当前页
    currentPage.push(block);
    currentHeight += blockHeight;
    console.log(`块 ${i} 添加到当前页，页面高度更新为: ${currentHeight}px`);
  }
  
  // 处理最后一页
  if (currentPage.length > 0) {
    console.log(`保存最后一页，包含 ${currentPage.length} 个块，高度: ${currentHeight}px`);
    pages.push(currentPage);
  }
  
  // 清理DOM
  if (tempDiv.parentNode) {
    document.body.removeChild(tempDiv);
  }
  
  console.log(`分页完成，总共 ${pages.length} 页`);
  pages.forEach((page, idx) => {
    console.log(`页面 ${idx + 1}: ${page.length} 个块`);
  });
  
  return pages.length > 0 ? pages : [[]];
}

// 获取块内容预览
export const getBlockContentPreview = (block) => {
  switch (block.type) {
    case 'row':
      return `${block.left || ''} | ${block.right || ''}`;
    case 'left':
    case 'right':
    case 'center':
    case 'sololeft':
    case 'solocenter':
    case 'soloright':
      if (block.hasNested) {
        return `[嵌套块: ${block.content.length}个子块]`;
      }
      return block.content || '';
    case 'normal':
      return block.content || '';
    default:
      return block.content || '';
  }
};

// 解析内联格式化
export const parseInlineFormatting = (text, styleConfig) => {
  if (!text) return [];
  
  const elements = [];
  let currentIndex = 0;
  
  // 处理粗体文本
  const boldRegex = /\*\*(.*?)\*\*/g;
  let boldMatch;
  
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    // 添加粗体前的文本
    if (boldMatch.index > currentIndex) {
      elements.push({
        type: 'text',
        content: text.slice(currentIndex, boldMatch.index),
        style: styleConfig
      });
    }
    
    // 添加粗体文本
    elements.push({
      type: 'bold',
      content: boldMatch[1],
      style: { ...styleConfig, fontWeight: 'bold' }
    });
    
    currentIndex = boldMatch.index + boldMatch[0].length;
  }
  
  // 添加剩余文本
  if (currentIndex < text.length) {
    elements.push({
      type: 'text',
      content: text.slice(currentIndex),
      style: styleConfig
    });
  }
  
  return elements.length > 0 ? elements : [{ type: 'text', content: text, style: styleConfig }];
}; 