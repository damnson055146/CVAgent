// src/CVcomponents/RenderPreview.jsx
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import Button from '../comcomponents/common/Button.jsx';
import { convertJsonToMarkdown } from '../utils/resumeUtils.jsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';

// --- Helper Function ---
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// A4页面尺寸常量
const A4_WIDTH_PX = 794;  // 210mm * 96dpi / 25.4mm/inch
const A4_HEIGHT_PX = 1123; // 297mm * 96dpi / 25.4mm/inch
const PAGE_MARGIN_PX = 48; 
// 优化内容高度计算，减少页面下方留白
// 理论可用高度: 1123 - 96 = 1027px
// 减去页面布局空间: 底部边距24px + 页脚18px + prose样式约50px = 92px
// 减去字体渲染差异: 约150px (减少从200px)
// 减去其他样式累积: 约80px (减少从100px)
// 减去安全边距: 约8px
const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - (PAGE_MARGIN_PX * 2) - 400; // 总计减去400px，减少留白
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// 预设样式配置
const DEFAULT_CONFIG = { font: 'SimSun', fontSize: 12, lineHeight: 1.5 };
const COMPACT_CONFIG = { font: 'SimSun', fontSize: 10.5, lineHeight: 1.3 };

// 支持嵌套对齐的parseCustomBlocks
function parseCustomBlocks(md) {
  const lines = md.split(/\r?\n/);
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
            hasNested: true 
          });
        } else {
          leftLines.forEach(l => blocks.push({ type: 'left', content: l }));
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
          hasNested: true 
        });
        console.log(`${alignType} 块包含嵌套内容，递归解析结果:`, nestedParsed.length, '个子块');
      } else {
        // 对于solo类型，整体作为一个块
        blocks.push({ 
          type: alignType, 
          content: content.join('\n'),
          hasNested: false 
        });
      }
      continue;
    }
    

    
    // 处理普通内容
    blocks.push({ type: 'normal', content: lines[i] });
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

const WORD_STYLE_CONFIG = {
  style1: {
    // 基础字体配置
    baseFont: 'SimSun',
    baseFontSize: 12, // pt
    lineHeight: 1.5,
    
    // 标题样式配置 - 匹配预览区CSS
    h1: {
      fontSize: 44, // 2.2rem * 20 (docx的size单位是半点)
      color: '000000', // 黑色
      bold: true,
      spacing: { after: 480, before: 240 }, // 匹配预览区样式
    },
    h2: {
      fontSize: 32, // 1.5rem * 20
      color: '000000', 
      bold: true,
      spacing: { after: 20, before: 200 }, // 减少间距，原来是 after: 600, before: 300
      border: { bottom: { style: 'single', size: 6, color: '494949' } }, // 增加分隔线大小以更明显显示
    },
    h3: {
      fontSize: 24, // 1.15rem * 20
      color: '2563EB', // 蓝色
      bold: true,
      spacing: { after: 300, before: 240 }, // 匹配预览区样式
    },
    
    // 文本样式 - 匹配预览区的p标签样式
    paragraph: {
      fontSize: 24, // 12pt * 2
      spacing: { after: 280 }, // 匹配预览区的0.7rem margin-bottom
      lineSpacing: 1.5
    },
    
    // 列表样式 - 匹配预览区的ul和li标签样式
    list: {
      fontSize: 24,
      spacing: { after: 200 }, // 匹配预览区的0.5rem margin-bottom
      indent: { left: 600 }, // 1.5rem * 400
      bullet: '•'
    },
    
    // 强调文本
    strong: {
      color: '22223B',
      bold: true
    },
    
    // 分割线 - 匹配预览区的hr标签样式
    hr: {
      color: 'B6C6E3',
      style: 'dashed',
      spacing: { after: 600, before: 600 } // 匹配预览区的1.5rem margin
    }
  }
};

// PDF样式配置 - 参考Word版本和预览区CSS，确保所有样式都有color属性
const PDF_STYLE_CONFIG = {
  style1: {
    // 基础字体配置
    baseFont: 'helvetica',
    baseFontSize: 12, // pt
    lineHeight: 1.5,
    
    // 标题样式配置 - 匹配预览区CSS，减少间距
    h1: {
      fontSize: 22, // 2.2rem 转换为PDF尺寸
      color: [0, 0, 0], // 黑色
      bold: true,
      spacing: { after: 8, before: 4 }, // 减少间距
    },
    h2: {
      fontSize: 15, // 1.5rem 转换为PDF尺寸
      color: [0, 0, 0], //rgb(0, 0, 0) 深蓝色
      bold: true,
      spacing: { after: 5, before: 2 }, // 增加下边距，匹配预览区的padding-bottom效果
      border: { bottom: { style: 'solid', width: 0.3, color: [73, 73, 73] } }, // 增加宽度，更接近预览区的1px效果
    },
    h3: {
      fontSize: 14, // 1.15rem 转换为PDF尺寸
      color: [37, 99, 235], // #2563eb 蓝色
      bold: true,
      spacing: { after: 5, before: 4 }, // 减少间距
    },
    
    // 文本样式 - 匹配预览区的p标签样式，减少间距
    paragraph: {
      fontSize: 12, // 基础字体大小
      color: [0, 0, 0], // 确保有颜色属性
      spacing: { after: 4 }, // 减少间距
      lineHeight: 1.4, // 稍微减少行高
    },
    
    // 列表样式 - 匹配预览区的ul和li标签样式，减少间距
    list: {
      fontSize: 12,
      color: [0, 0, 0], // 确保有颜色属性
      spacing: { after: 3 }, // 减少间距
      indent: { left: 5 }, // 缩进 in mm
      bullet: '•'
    },
    
    // 强调文本
    strong: {
      color: [34, 34, 59], // #22223b
      bold: true
    },
    
    // 分割线 - 匹配预览区的hr标签样式，减少间距
    hr: {
      color: [182, 198, 227], // #b6c6e3
      style: 'dashed',
      spacing: { after: 10, before: 10 } // 减少间距
    }
  }
};



// 块级分页函数 - 使用简洁的分页逻辑
function renderBlocksToPages(blocks, config, measurerRef) {
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
          el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
          el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
          el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
          el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
          el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
        el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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
        const contentLength = (block.content || block.left || block.right || '').length;
        const estimatedLines = Math.max(1, Math.ceil(contentLength / 80));
        blockHeight = estimatedLines * (config.fontSize * config.lineHeight * 1.33);
      }
      
      return Math.max(blockHeight, 16);
      
    } catch (error) {
      console.error('Error measuring block:', error, block);
      const contentLength = (block.content || block.left || block.right || '').length;
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

const generateWordDocument = async (content, config, resumeData) => {
  try {
    if (!content || content.trim() === '') {
      throw new Error('没有内容可生成Word文档');
    }
    
    // 解析自定义块
    const blocks = parseCustomBlocks(content);
    console.log('解析到的块数量:', blocks.length);
    
    // 使用与预览区相同的分页逻辑
    const pages = renderBlocksToPages(blocks, config, null);
    console.log('分页结果:', pages.length, '页');
    
    // 获取样式配置
    const styleConfig = WORD_STYLE_CONFIG.style1; // 可以根据theme参数动态选择
    // 确保使用与预览区相同的字体配置
    styleConfig.baseFont = config.font || styleConfig.baseFont;
    styleConfig.baseFontSize = config.fontSize || styleConfig.baseFontSize;
    styleConfig.lineHeight = config.lineHeight || styleConfig.lineHeight;
    
    // 创建Word文档 - 使用单个section，避免额外的空白页
    const allChildren = [];
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageBlocks = pages[pageIndex];
      const isLastPage = pageIndex === pages.length - 1;
      const isFirstPage = pageIndex === 0;
      
      // 为每一页生成内容
      const pageChildren = await generateWordContentForPage(pageBlocks, styleConfig, isLastPage, isFirstPage);
      allChildren.push(...pageChildren);
    }
    
    const sections = [{
      properties: {
        page: {
          size: {
            width: 11906, // A4 width in EMUs (21cm)
            height: 16838 // A4 height in EMUs (29.7cm)
          },
          margin: {
            top: 1440, // 1 inch = 1440 EMUs
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: allChildren
    }];
    
    const doc = new Document({
      sections: sections
    });

    // 生成并下载文件
    const blob = await Packer.toBlob(doc);
    const fileName = `${resumeData?.user_name || 'resume'}_简历_Word版.docx`;
    
    saveAs(blob, fileName);
    console.log('Word文档生成成功');
    return true;
    
  } catch (error) {
    console.error('生成Word文档失败:', error);
    throw error;
  }
};

const getBlockContentPreview = (block) => {
  if (!block) return '';
  
  try {
    if (block.type === 'center') {
      // center类型的content是数组
      const content = Array.isArray(block.content) ? block.content : [block.content];
      return content.join(' ').substring(0, 50);
    } else if (block.type === 'row') {
      return `${(block.left || '').substring(0, 20)} | ${(block.right || '').substring(0, 20)}`;
    } else {
      return (block.content || '').substring(0, 50);
    }
  } catch (error) {
    return '[无法获取预览]';
  }
};

// Word内容生成函数
const generateWordContentForPage = async (pageBlocks, styleConfig, isLastPage, isFirstPage) => {
  const children = [];
  
  console.log(`生成第${isLastPage ? '最后' : ''}页内容，块数量:`, pageBlocks.length);
  
  for (let index = 0; index < pageBlocks.length; index++) {
    const block = pageBlocks[index];
    
    if (!block) {
      console.warn(`跳过空块 ${index}`);
      continue;
    }
    
    try {
      if (block.type === 'center') {
        console.log(`处理center块 ${index}:`, {
          type: block.type,
          content: block.content,
          preview: getBlockContentPreview(block)
        });
        
        const content = Array.isArray(block.content) ? block.content : [block.content];
        
        content.forEach((line, lineIndex) => {
          if (line && typeof line === 'string' && line.trim()) {
            console.log(`处理center块第${lineIndex}行:`, line);
            const headingMatch = line.match(/^(#+)\s*(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              let headingStyle;
              if (level === 1) {
                headingStyle = styleConfig.h1;
              } else if (level === 2) {
                headingStyle = styleConfig.h2;
              } else {
                headingStyle = styleConfig.h3;
              }

              // MODIFIED START: 直接在H2段落上应用边框
              const paragraphOptions = {
                alignment: AlignmentType.CENTER,
                spacing: headingStyle.spacing,
              };

              // 如果是H2并且有边框样式，直接添加到段落属性中
              if (level === 2 && headingStyle.border) {
                paragraphOptions.border = {
                  bottom: {
                    color: headingStyle.border.bottom.color,
                    space: 1, // 边框和文本的距离
                    value: 'single',
                    size: headingStyle.border.bottom.size,
                  }
                };
                // 为了模拟padding-bottom的效果，可以适当增加spacing.after
                paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120; // 增加6pt的间距
              }
              
              children.push(new Paragraph({
                ...paragraphOptions,
                children: [
                  new TextRun({
                    text: headingText,
                    size: headingStyle.fontSize,
                    font: styleConfig.baseFont,
                    bold: headingStyle.bold,
                    color: headingStyle.color
                  })
                ]
              }));
              // MODIFIED END: 移除了原来用于添加分割线的独立Paragraph
            } else {
              const textRuns = parseInlineFormatting(line, styleConfig);
              children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: textRuns

              }));
            }
          }
        });
        
      } else if (block.type === 'row') {
        console.log(`处理row块 ${index}:`, block.left, '|', block.right);
        
        const leftText = block.left || '';
        const rightText = block.right || '';
        
        if (leftText || rightText) {
          const leftRuns = leftText ? parseInlineFormatting(leftText, styleConfig) : [];
          const rightRuns = rightText ? parseInlineFormatting(rightText, styleConfig) : [];
          
          children.push(new Paragraph({
            tabStops: [
              { type: 'right', position: 8500 }
            ],
            spacing: { after: 200 },
            children: [
              ...leftRuns,
              new TextRun({ text: '\t' }),
              ...rightRuns
            ]
          }));
        }
        
      } else if (block.type === 'left') {
        const text = block.content || '';
        if (text) {
          const textRuns = parseInlineFormatting(text, styleConfig);
          children.push(new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: textRuns
          }));
        }
        
      } else if (block.type === 'right') {
        const text = block.content || '';
        if (text) {
          const textRuns = parseInlineFormatting(text, styleConfig);
          children.push(new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 },
            children: textRuns
          }));
        }
        
      } else if (block.type === 'sololeft') {
        const text = block.content || '';
        if (text) {
          // 检查是否包含标题格式
          const headingMatch = text.match(/^(#+)\s*(.+)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            let headingStyle;
            if (level === 1) {
              headingStyle = styleConfig.h1;
            } else if (level === 2) {
              headingStyle = styleConfig.h2;
            } else {
              headingStyle = styleConfig.h3;
            }

            const paragraphOptions = {
              alignment: AlignmentType.LEFT,
              spacing: headingStyle.spacing,
            };

            if (level === 2 && headingStyle.border) {
              paragraphOptions.border = {
                bottom: {
                  color: headingStyle.border.bottom.color,
                  space: 1,
                  value: 'single',
                  size: headingStyle.border.bottom.size,
                }
              };
              paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120;
            }
            
            children.push(new Paragraph({
              ...paragraphOptions,
              children: [
                new TextRun({
                  text: headingText,
                  size: headingStyle.fontSize,
                  font: styleConfig.baseFont,
                  bold: headingStyle.bold,
                  color: headingStyle.color
                })
              ]
            }));
          } else {
            const textRuns = parseInlineFormatting(text, styleConfig);
            children.push(new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 200 },
              children: textRuns
            }));
          }
        }
        
      } else if (block.type === 'solocenter') {
        const text = block.content || '';
        if (text) {
          // 检查是否包含标题格式
          const headingMatch = text.match(/^(#+)\s*(.+)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            let headingStyle;
            if (level === 1) {
              headingStyle = styleConfig.h1;
            } else if (level === 2) {
              headingStyle = styleConfig.h2;
            } else {
              headingStyle = styleConfig.h3;
            }

            const paragraphOptions = {
              alignment: AlignmentType.CENTER,
              spacing: headingStyle.spacing,
            };

            if (level === 2 && headingStyle.border) {
              paragraphOptions.border = {
                bottom: {
                  color: headingStyle.border.bottom.color,
                  space: 1,
                  value: 'single',
                  size: headingStyle.border.bottom.size,
                }
              };
              paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120;
            }
            
            children.push(new Paragraph({
              ...paragraphOptions,
              children: [
                new TextRun({
                  text: headingText,
                  size: headingStyle.fontSize,
                  font: styleConfig.baseFont,
                  bold: headingStyle.bold,
                  color: headingStyle.color
                })
              ]
            }));
          } else {
            const textRuns = parseInlineFormatting(text, styleConfig);
            children.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: textRuns
            }));
          }
        }
        
      } else if (block.type === 'soloright') {
        const text = block.content || '';
        if (text) {
          // 检查是否包含标题格式
          const headingMatch = text.match(/^(#+)\s*(.+)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            let headingStyle;
            if (level === 1) {
              headingStyle = styleConfig.h1;
            } else if (level === 2) {
              headingStyle = styleConfig.h2;
            } else {
              headingStyle = styleConfig.h3;
            }

            const paragraphOptions = {
              alignment: AlignmentType.RIGHT,
              spacing: headingStyle.spacing,
            };

            if (level === 2 && headingStyle.border) {
              paragraphOptions.border = {
                bottom: {
                  color: headingStyle.border.bottom.color,
                  space: 1,
                  value: 'single',
                  size: headingStyle.border.bottom.size,
                }
              };
              paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120;
            }
            
            children.push(new Paragraph({
              ...paragraphOptions,
              children: [
                new TextRun({
                  text: headingText,
                  size: headingStyle.fontSize,
                  font: styleConfig.baseFont,
                  bold: headingStyle.bold,
                  color: headingStyle.color
                })
              ]
            }));
          } else {
            const textRuns = parseInlineFormatting(text, styleConfig);
            children.push(new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 },
              children: textRuns
            }));
          }
        }
        
      } else {
        const text = block.content || '';
        if (typeof text === 'string' && text.trim()) {
          const parsedContent = parseMarkdownToWordElements(text, styleConfig);
          children.push(...parsedContent);
        }
      }
      
    } catch (error) {
      console.error(`处理Word块 ${index} 时出错:`, error);
      console.error('块内容:', block);
      
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: `[渲染错误: ${block.type} - ${error.message}]`,
            size: 24,
            font: 'SimSun',
            color: 'FF0000'
          })
        ],
        spacing: { after: 200 }
      }));
    }
  }
  
  if (!isLastPage && !isFirstPage) {
    children.push(new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun({ text: '' })]
    }));
  }
  
  return children;
};

// 清理Markdown文本的辅助函数
const cleanMarkdownText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') {
    console.warn('cleanMarkdownText接收到非字符串类型:', typeof text, text);
    return String(text);
  }
  
  return text
    .replace(/^#+\s*/, '') // 移除标题标记
    .replace(/`(.*?)`/g, '$1') // 移除代码标记但保留内容
    .replace(/^\s*[-*+]\s*/, '') // 移除列表标记
    .trim();
};

// 解析Markdown到Word元素的函数
const parseMarkdownToWordElements = (text, styleConfig) => {
  const elements = [];
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    return elements;
  }
  
  try {
    const headingMatch = text.match(/^(#+)\s*(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      
      let headingStyle;
      if (level === 1) {
        headingStyle = styleConfig.h1;
      } else if (level === 2) {
        headingStyle = styleConfig.h2;
      } else {
        headingStyle = styleConfig.h3;
      }
      
      const textRunOptions = {
        text: headingText,
        size: headingStyle.fontSize,
        font: styleConfig.baseFont,
        bold: headingStyle.bold,
        color: headingStyle.color
      };
      
      // MODIFIED START: 直接在H2段落上应用边框
      const paragraphOptions = {
        spacing: headingStyle.spacing
      };

      if (level === 2 && headingStyle.border) {
        paragraphOptions.border = {
          bottom: {
            color: headingStyle.border.bottom.color,
            space: 1,
            value: 'single',
            size: headingStyle.border.bottom.size
          }
        };
        // 模拟padding-bottom，增加段后间距
        paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120; // 增加6pt
      }
      
      elements.push(new Paragraph({
        ...paragraphOptions,
        children: [new TextRun(textRunOptions)]
      }));
      // MODIFIED END: 移除了原来用于添加分割线的独立Paragraph
      
      console.log(`处理${level}级标题: ${headingText}, 样式:`, textRunOptions);
      return elements;
    }
    
    if (text.trim() === '---' || text.trim() === '***') {
      elements.push(new Paragraph({
        spacing: styleConfig.hr.spacing,
        children: [
          new TextRun({
            text: '─'.repeat(50),
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont,
            color: styleConfig.hr.color
          })
        ]
      }));
      return elements;
    }
    
    const listMatch = text.match(/^\s*[-*+]\s*(.+)$/);
    if (listMatch) {
      const listText = listMatch[1];
      const listTextRuns = parseInlineFormatting(listText, styleConfig);
      
      elements.push(new Paragraph({
        bullet: {
          level: 0
        },
        spacing: styleConfig.list.spacing,
        indent: styleConfig.list.indent,
        children: listTextRuns
      }));
      return elements;
    }
    
    const textRuns = parseInlineFormatting(text, styleConfig);
    
    elements.push(new Paragraph({
      spacing: styleConfig.paragraph.spacing,
      children: textRuns
    }));
    
  } catch (error) {
    console.error('解析Markdown文本时出错:', error);
    elements.push(new Paragraph({
      spacing: styleConfig.paragraph.spacing,
      children: [
        new TextRun({
          text: cleanMarkdownText(text),
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont
        })
      ]
    }));
  }
  
  return elements;
};

// 新增：简单的PDF生成函数作为后备
const generateSimplePdf = async (content, config, resumeData) => {
  if (!content) {
    throw new Error('无内容可生成PDF');
  }

  console.log('生成简单PDF版本...');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  const pageMargin = 20;
  let yPos = pageMargin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('简历', pageMargin, yPos);
  yPos += 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const cleanContent = content.replace(/[#*_`]/g, '').trim();
  const lines = cleanContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (yPos > A4_HEIGHT_MM - pageMargin) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    try {
      doc.text(line, pageMargin, yPos);
    } catch (textError) {
      console.warn('文本渲染失败，使用ASCII字符:', textError);
      const safeText = line.replace(/[^\x00-\x7F]/g, '');
      if (safeText.trim()) {
        doc.text(safeText, pageMargin, yPos);
      }
    }
    
    yPos += 8;
  }

  const fileName = `${resumeData?.user_name || 'resume'}_简历_简单版.pdf`;
  doc.save(fileName);
  console.log('简单PDF生成成功');
};

// 解析行内格式的函数
const parseInlineFormatting = (text, styleConfig) => {
  const textRuns = [];
  
  if (!text || typeof text !== 'string') {
    return [new TextRun({
      text: '',
      size: styleConfig.paragraph.fontSize,
      font: styleConfig.baseFont
    })];
  }
  
  try {
    console.log('解析文本格式:', text);
    
    const formatHandlers = [
      {
        regex: /\*\*(.*?)\*\*/g,
        name: 'bold',
        handler: (match, content) => ({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont,
          bold: true,
          color: styleConfig.strong.color
        })
      },
      {
        regex: /(?<!\*)\*([^*]+?)\*(?!\*)/g,
        name: 'italic',
        handler: (match, content) => ({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont,
          italics: true
        })
      },
      {
        regex: /`([^`]+?)`/g,
        name: 'code',
        handler: (match, content) => ({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: 'Courier New',
          color: '666666',
          highlight: 'F5F5F5'
        })
      }
    ];
    
    const processTextWithFormats = (inputText, handlerIndex = 0) => {
      if (handlerIndex >= formatHandlers.length) {
        if (inputText.trim()) {
          return [new TextRun({
            text: inputText,
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          })];
        }
        return [];
      }
      
      const handler = formatHandlers[handlerIndex];
      const regex = new RegExp(handler.regex.source, handler.regex.flags);
      const results = [];
      
      let lastIndex = 0;
      let match;
      
      while ((match = regex.exec(inputText)) !== null) {
        if (match.index > lastIndex) {
          const beforeText = inputText.substring(lastIndex, match.index);
          results.push(...processTextWithFormats(beforeText, handlerIndex + 1));
        }
        
        const formattedTextRun = new TextRun(handler.handler(match, match[1]));
        results.push(formattedTextRun);
        
        console.log(`应用${handler.name}格式:`, match[1]);
        
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < inputText.length) {
        const remainingText = inputText.substring(lastIndex);
        results.push(...processTextWithFormats(remainingText, handlerIndex + 1));
      }
      
      return results.length > 0 ? results : [new TextRun({
        text: inputText,
        size: styleConfig.paragraph.fontSize,
        font: styleConfig.baseFont
      })];
    };
    
    const processedRuns = processTextWithFormats(text);
    textRuns.push(...processedRuns);
    
  } catch (error) {
    console.error('解析行内格式时出错:', error);
    textRuns.push(new TextRun({
      text: cleanMarkdownText(text),
      size: styleConfig.paragraph.fontSize,
      font: styleConfig.baseFont
    }));
  }
  
  return textRuns.length > 0 ? textRuns : [new TextRun({
    text: text,
    size: styleConfig.paragraph.fontSize,
    font: styleConfig.baseFont
  })];
};

// 将块转换为Word格式（保留原函数用于兼容）
const generateWordContent = (blocks, config) => {
  return generateWordContentForPage(blocks, config, true, true);
};

// 修复 CustomMarkdownPage 组件，添加更好的错误处理
function CustomMarkdownPage({ blocks }) {
  console.log('CustomMarkdownPage 渲染，接收到的块数:', blocks?.length || 0);
  
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.warn('CustomMarkdownPage 接收到空的或无效的 blocks');
    return <div className="w-full pl-0 text-gray-400">此页无内容</div>;
  }

  // 渲染单个块的函数
  const renderBlock = (block, idx, keyPrefix = '') => {
    if (!block) {
      console.warn(`块 ${idx} 为 null 或 undefined`);
      return null;
    }

    const key = `${keyPrefix}${idx}`;

    try {
      // 处理嵌套内容的通用函数
      const renderNestedContent = (nestedContent, alignClass) => {
        if (Array.isArray(nestedContent)) {
          return nestedContent.map((nestedBlock, nestedIdx) => 
            renderBlock(nestedBlock, nestedIdx, `${key}-nested-`)
          );
        } else if (typeof nestedContent === 'string') {
          return (
            <div className={`${alignClass} my-1`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{nestedContent || ''}</ReactMarkdown>
            </div>
          );
        }
        return null;
      };

      switch (block.type) {
        case 'center':
        case 'solocenter':
          if (block.hasNested) {
            return (
              <div key={key} className="text-center my-1">
                {renderNestedContent(block.content, 'text-center')}
              </div>
            );
          } else {
            const content = Array.isArray(block.content) ? block.content : [block.content];
            return content.map((line, i) => (
              <div key={`${key}-${i}`} className="text-center my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{line || ''}</ReactMarkdown>
              </div>
            ));
          }

        case 'left':
        case 'sololeft':
          if (block.hasNested) {
            return (
              <div key={key} className="text-left my-1">
                {renderNestedContent(block.content, 'text-left')}
              </div>
            );
          } else {
            const content = typeof block.content === 'string' ? block.content : 
                           Array.isArray(block.content) ? block.content.join('') : '';
            return (
              <div key={key} className="text-left my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
              </div>
            );
          }

        case 'right':
        case 'soloright':
          if (block.hasNested) {
            return (
              <div key={key} className="text-right my-1">
                {renderNestedContent(block.content, 'text-right')}
              </div>
            );
          } else {
            const content = typeof block.content === 'string' ? block.content : 
                           Array.isArray(block.content) ? block.content.join('') : 
                           block.right || '';
            return (
              <div key={key} className="text-right my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
              </div>
            );
          }

        case 'row':
          return (
            <div key={key} className="flex flex-row justify-between my-1 w-full">
              <div className="text-left flex-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.left || ''}</ReactMarkdown>
              </div>
              <div className="text-right flex-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.right || ''}</ReactMarkdown>
              </div>
            </div>
          );

        case 'normal':
        default:
          return (
            <div key={key} className="w-full pl-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ''}</ReactMarkdown>
            </div>
          );
      }
    } catch (error) {
      console.error(`渲染块 ${idx} 时出错:`, error, block);
      return (
        <div key={key} className="w-full pl-0 text-red-500 text-sm">
          [渲染错误: {block.type}]
        </div>
      );
    }
  };

  return (
    <div className="w-full pl-0">
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}

// =================================================================
// ==================== NEW: PDF Generation Logic ==================
// =================================================================

/**
 * 【重构】在PDF中渲染带内联格式（如**粗体**）的单行文本
 * @param {jsPDF} doc - jsPDF实例
 * @param {string} text - 要渲染的文本行
 * @param {number} x - 起始x坐标
 * @param {number} y - y坐标 (文本基线)
 * @param {object} style - 包含字体、颜色等信息的样式对象
 * @param {object} strongStyle - 粗体样式
 */
function renderStyledLine(doc, text, x, y, style, strongStyle) {
  const FONT_NAME = style.baseFont || 'helvetica';
  const FONT_SIZE = style.fontSize;
  const NORMAL_COLOR = Array.isArray(style.color) ? style.color : [0,0,0];
  const STRONG_COLOR = Array.isArray(strongStyle.color) ? strongStyle.color : [34, 34, 59];

  // 处理粗体和斜体格式
  const parts = text.split(/(\*\*.*?\*\*|(?<!\*)\*[^*]+\*(?!\*))/g).filter(p => p);
  let currentX = x;

  parts.forEach(part => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    const isItalic = !isBold && part.startsWith('*') && part.endsWith('*') && !part.startsWith('**');
    
    let partText = part;
    let fontStyle = 'normal';
    
    if (isBold) {
      partText = part.slice(2, -2);
      fontStyle = 'bold';
    } else if (isItalic) {
      partText = part.slice(1, -1);
      fontStyle = 'italic';
    }

    doc.setFont(FONT_NAME, fontStyle);
    doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));

    try {
      doc.text(partText, currentX, y);
      currentX += doc.getTextWidth(partText);
    } catch (e) {
      console.warn(`PDF文本渲染失败: "${partText}"`, e);
      const safeText = partText.replace(/[^\x00-\x7F]/g, '?');
      doc.text(safeText, currentX, y);
      currentX += doc.getTextWidth(safeText);
    }
  });
}

/**
 * 渲染居中的带格式文本
 */
function renderStyledLineCentered(doc, text, x, y, style, strongStyle) {
  const FONT_NAME = style.baseFont || 'helvetica';
  const FONT_SIZE = style.fontSize;
  const NORMAL_COLOR = Array.isArray(style.color) ? style.color : [0,0,0];
  const STRONG_COLOR = Array.isArray(strongStyle.color) ? strongStyle.color : [34, 34, 59];

  // 处理粗体和斜体格式
  const parts = text.split(/(\*\*.*?\*\*|(?<!\*)\*[^*]+\*(?!\*))/g).filter(p => p);
  let currentX = x;

  parts.forEach(part => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    const isItalic = !isBold && part.startsWith('*') && part.endsWith('*') && !part.startsWith('**');
    
    let partText = part;
    let fontStyle = 'normal';
    
    if (isBold) {
      partText = part.slice(2, -2);
      fontStyle = 'bold';
    } else if (isItalic) {
      partText = part.slice(1, -1);
      fontStyle = 'italic';
    }

    doc.setFont(FONT_NAME, fontStyle);
    doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));

    try {
      doc.text(partText, currentX, y);
      currentX += doc.getTextWidth(partText);
    } catch (e) {
      console.warn(`PDF文本渲染失败: "${partText}"`, e);
      const safeText = partText.replace(/[^\x00-\x7F]/g, '?');
      doc.text(safeText, currentX, y);
      currentX += doc.getTextWidth(safeText);
    }
  });
}

/**
 * 动态生成PDF样式配置，参考Word样式配置和传入的config参数
 */
const generatePdfStyleConfig = (config) => {
  const baseStyleConfig = PDF_STYLE_CONFIG.style1;
  const baseFontSize = config.fontSize || 12;
  const baseLineHeight = config.lineHeight || 1.5;
  
  const h1Ratio = 1.833; // 44/24
  const h2Ratio = 1.25;  // 30/24
  const h3Ratio = 1.0;   // 24/24
  
  const spacingRatio = (baseFontSize / 12) * 0.7;
  
  return {
    ...baseStyleConfig,
    baseFont: config.font || baseStyleConfig.baseFont,
    baseFontSize: baseFontSize,
    lineHeight: baseLineHeight,
    
    h1: {
      ...baseStyleConfig.h1,
      fontSize: Math.round(baseFontSize * h1Ratio),
      lineHeight: baseLineHeight,
      spacing: {
        after: Math.round(baseStyleConfig.h1.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h1.spacing.before * spacingRatio)
      }
    },
    h2: {
      ...baseStyleConfig.h2,
      fontSize: Math.round(baseFontSize * h2Ratio),
      lineHeight: baseLineHeight,
      spacing: {
        after: Math.round(baseStyleConfig.h2.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h2.spacing.before * spacingRatio)
      }
    },
    h3: {
      ...baseStyleConfig.h3,
      fontSize: Math.round(baseFontSize * h3Ratio),
      lineHeight: baseLineHeight,
      spacing: {
        after: Math.round(baseStyleConfig.h3.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h3.spacing.before * spacingRatio)
      }
    },
    paragraph: {
      ...baseStyleConfig.paragraph,
      fontSize: baseFontSize,
      lineHeight: baseLineHeight,
      spacing: {
        after: Math.round(baseStyleConfig.paragraph.spacing.after * spacingRatio)
      }
    },
    list: {
      ...baseStyleConfig.list,
      fontSize: baseFontSize,
      lineHeight: baseLineHeight,
      spacing: {
        after: Math.round(baseStyleConfig.list.spacing.after * spacingRatio)
      },
      indent: {
        left: Math.round(baseStyleConfig.list.indent.left * spacingRatio)
      }
    },
    hr: {
      ...baseStyleConfig.hr,
      spacing: {
        after: Math.round(baseStyleConfig.hr.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.hr.spacing.before * spacingRatio)
      }
    }
  };
};

/**
 * 【重构】生成带样式的文本版PDF的核心函数
 */
const generateTextualPdf = async (content, config, resumeData) => {
  if (!content) throw new Error('无内容可生成PDF');
  console.log('开始生成PDF，使用带样式版本...');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const styleConfig = generatePdfStyleConfig(config);
  console.log('PDF样式配置:', styleConfig);
  
  let FONT_NAME = styleConfig.baseFont;
  
  const hasChineseChars = /[\u4e00-\u9fff]/.test(content);
  if (hasChineseChars) {
    if (config.font && config.font.toLowerCase().includes('simsun')) {
      FONT_NAME = 'SimSun';
    } else if (config.font && config.font.toLowerCase().includes('microsoft')) {
      FONT_NAME = 'Microsoft YaHei';
    } else {
      FONT_NAME = 'helvetica';
      console.log('检测到中文字符，使用helvetica字体（可能需要额外配置）');
    }
  }
  
  doc.setFont(FONT_NAME, 'normal');

  const PAGE_MARGIN = 20;
  const CONTENT_WIDTH = A4_WIDTH_MM - PAGE_MARGIN * 2;
  const PAGE_BOTTOM_MARGIN = A4_HEIGHT_MM - PAGE_MARGIN;
  let yPos = PAGE_MARGIN;

  const ptToMm = (pt) => pt * 0.352778;

  const checkPageBreak = (y, neededHeight = 10) => {
    if (y + neededHeight > PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      return PAGE_MARGIN;
    }
    return y;
  };

  const blocks = parseCustomBlocks(content);

  for (const block of blocks) {
    if (!block) continue;

    yPos = checkPageBreak(yPos);

    try {
      if (block.type === 'center') {
        const content = Array.isArray(block.content) ? block.content : [block.content];
        
        content.forEach((line, lineIndex) => {
          if (line && typeof line === 'string' && line.trim()) {
            const headingMatch = line.match(/^(#+)\s*(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              
              let headingStyle;
              if (level === 1) headingStyle = styleConfig.h1;
              else if (level === 2) headingStyle = styleConfig.h2;
              else headingStyle = styleConfig.h3;
              
              yPos += (headingStyle.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, headingStyle.bold ? 'bold' : 'normal');
              doc.setFontSize(headingStyle.fontSize);
              doc.setTextColor(...headingStyle.color);
              
              const textLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
              doc.text(textLines, A4_WIDTH_MM / 2, yPos, { align: 'center' });
              
              const textHeight = textLines.length * ptToMm(headingStyle.fontSize) * (headingStyle.lineHeight || 1.2);
              yPos += textHeight;
              
              // MODIFIED START: 修正居中H2下划线逻辑
              if (level === 2 && headingStyle.border) {
                  const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
                  const underlineY = yPos + paddingBottomMm;

                  yPos = checkPageBreak(underlineY, headingStyle.border.bottom.width);

                  doc.setDrawColor(...headingStyle.border.bottom.color);
                  doc.setLineWidth(headingStyle.border.bottom.width);
                  doc.line(PAGE_MARGIN, underlineY, A4_WIDTH_MM - PAGE_MARGIN, underlineY);
                  yPos = underlineY + 0.5; 
              }
              // MODIFIED END
              
              yPos += headingStyle.spacing.after;
              
            } else {
              const style = styleConfig.paragraph;
              yPos += (style.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, 'normal');
              doc.setFontSize(style.fontSize);
              
              const textLines = doc.splitTextToSize(line, CONTENT_WIDTH);
              for (const textLine of textLines) {
                const textWidth = doc.getTextWidth(textLine);
                const centerX = (A4_WIDTH_MM - textWidth) / 2;
                renderStyledLineCentered(doc, textLine, centerX, yPos, style, styleConfig.strong);
                yPos += ptToMm(style.fontSize) * style.lineHeight;
              }
              
              yPos += style.spacing.after;
            }
          }
        });
      } 
      else if (block.type === 'row') {
          const style = styleConfig.paragraph;
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);
          
          const leftText = block.left || '';
          const rightText = block.right || '';

          if (leftText || rightText) {
            doc.setFont(FONT_NAME, 'normal');
            doc.setFontSize(style.fontSize);
            
            if (leftText) {
              renderStyledLine(doc, leftText, PAGE_MARGIN, yPos, style, styleConfig.strong);
            }
            
            if (rightText) {
              const rightCleanText = rightText.replace(/\*\*/g, '');
              const rightWidth = doc.getTextWidth(rightCleanText);
              const rightX = A4_WIDTH_MM - PAGE_MARGIN - rightWidth;
              renderStyledLine(doc, rightText, rightX, yPos, style, styleConfig.strong);
            }

            yPos += ptToMm(style.fontSize) * style.lineHeight;
          }
          
          yPos += style.spacing.after;
      }
      else if (block.type === 'left' || block.type === 'right') {
          const style = styleConfig.paragraph;
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);

          const text = block.content || '';
          if (text) {
            doc.setFont(FONT_NAME, 'normal');
            doc.setFontSize(style.fontSize);
            
            const textLines = doc.splitTextToSize(text, CONTENT_WIDTH);
            const align = block.type === 'right' ? 'right' : 'left';
            const x = align === 'right' ? A4_WIDTH_MM - PAGE_MARGIN : PAGE_MARGIN;

            for (const line of textLines) {
                yPos = checkPageBreak(yPos, ptToMm(style.fontSize));
                renderStyledLine(doc, line, x, yPos, style, styleConfig.strong);
                yPos += ptToMm(style.fontSize) * style.lineHeight;
            }
          }
          yPos += style.spacing.after;
      }
      else if (block.type === 'sololeft') {
          const text = block.content || '';
          if (text) {
            // 检查是否包含标题格式
            const headingMatch = text.match(/^(#+)\s*(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              
              let headingStyle;
              if (level === 1) headingStyle = styleConfig.h1;
              else if (level === 2) headingStyle = styleConfig.h2;
              else headingStyle = styleConfig.h3;
              
              yPos += (headingStyle.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, headingStyle.bold ? 'bold' : 'normal');
              doc.setFontSize(headingStyle.fontSize);
              doc.setTextColor(...headingStyle.color);
              
              const textLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
              doc.text(textLines, PAGE_MARGIN, yPos);
              
              const textHeight = textLines.length * ptToMm(headingStyle.fontSize) * (headingStyle.lineHeight || 1.2);
              yPos += textHeight;
              
              // 处理H2下划线
              if (level === 2 && headingStyle.border) {
                  const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
                  const underlineY = yPos + paddingBottomMm;

                  yPos = checkPageBreak(underlineY, headingStyle.border.bottom.width);

                  doc.setDrawColor(...headingStyle.border.bottom.color);
                  doc.setLineWidth(headingStyle.border.bottom.width);
                  doc.line(PAGE_MARGIN, underlineY, A4_WIDTH_MM - PAGE_MARGIN, underlineY);
                  yPos = underlineY + 0.5;
              }
              
              yPos += headingStyle.spacing.after;
            } else {
              const style = styleConfig.paragraph;
              yPos += (style.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, 'normal');
              doc.setFontSize(style.fontSize);
              
              const textLines = doc.splitTextToSize(text, CONTENT_WIDTH);
              for (const line of textLines) {
                  yPos = checkPageBreak(yPos, ptToMm(style.fontSize));
                  renderStyledLine(doc, line, PAGE_MARGIN, yPos, style, styleConfig.strong);
                  yPos += ptToMm(style.fontSize) * style.lineHeight;
              }
              yPos += style.spacing.after;
            }
          }
      }
      else if (block.type === 'solocenter') {
          const text = block.content || '';
          if (text) {
            // 检查是否包含标题格式
            const headingMatch = text.match(/^(#+)\s*(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              
              let headingStyle;
              if (level === 1) headingStyle = styleConfig.h1;
              else if (level === 2) headingStyle = styleConfig.h2;
              else headingStyle = styleConfig.h3;
              
              yPos += (headingStyle.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, headingStyle.bold ? 'bold' : 'normal');
              doc.setFontSize(headingStyle.fontSize);
              doc.setTextColor(...headingStyle.color);
              
              const textLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
              doc.text(textLines, A4_WIDTH_MM / 2, yPos, { align: 'center' });
              
              const textHeight = textLines.length * ptToMm(headingStyle.fontSize) * (headingStyle.lineHeight || 1.2);
              yPos += textHeight;
              
              // 处理H2下划线
              if (level === 2 && headingStyle.border) {
                  const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
                  const underlineY = yPos + paddingBottomMm;

                  yPos = checkPageBreak(underlineY, headingStyle.border.bottom.width);

                  doc.setDrawColor(...headingStyle.border.bottom.color);
                  doc.setLineWidth(headingStyle.border.bottom.width);
                  doc.line(PAGE_MARGIN, underlineY, A4_WIDTH_MM - PAGE_MARGIN, underlineY);
                  yPos = underlineY + 0.5;
              }
              
              yPos += headingStyle.spacing.after;
            } else {
              const style = styleConfig.paragraph;
              yPos += (style.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, 'normal');
              doc.setFontSize(style.fontSize);
              
              const textLines = doc.splitTextToSize(text, CONTENT_WIDTH);
              for (const textLine of textLines) {
                  yPos = checkPageBreak(yPos, ptToMm(style.fontSize));
                  const textWidth = doc.getTextWidth(textLine);
                  const centerX = (A4_WIDTH_MM - textWidth) / 2;
                  renderStyledLineCentered(doc, textLine, centerX, yPos, style, styleConfig.strong);
                  yPos += ptToMm(style.fontSize) * style.lineHeight;
              }
              yPos += style.spacing.after;
            }
          }
      }
      else if (block.type === 'soloright') {
          const text = block.content || '';
          if (text) {
            // 检查是否包含标题格式
            const headingMatch = text.match(/^(#+)\s*(.+)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              
              let headingStyle;
              if (level === 1) headingStyle = styleConfig.h1;
              else if (level === 2) headingStyle = styleConfig.h2;
              else headingStyle = styleConfig.h3;
              
              yPos += (headingStyle.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, headingStyle.bold ? 'bold' : 'normal');
              doc.setFontSize(headingStyle.fontSize);
              doc.setTextColor(...headingStyle.color);
              
              const textLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
              const textWidth = doc.getTextWidth(headingText);
              const rightX = A4_WIDTH_MM - PAGE_MARGIN - textWidth;
              doc.text(textLines, rightX, yPos);
              
              const textHeight = textLines.length * ptToMm(headingStyle.fontSize) * (headingStyle.lineHeight || 1.2);
              yPos += textHeight;
              
              // 处理H2下划线
              if (level === 2 && headingStyle.border) {
                  const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
                  const underlineY = yPos + paddingBottomMm;

                  yPos = checkPageBreak(underlineY, headingStyle.border.bottom.width);

                  doc.setDrawColor(...headingStyle.border.bottom.color);
                  doc.setLineWidth(headingStyle.border.bottom.width);
                  doc.line(PAGE_MARGIN, underlineY, A4_WIDTH_MM - PAGE_MARGIN, underlineY);
                  yPos = underlineY + 0.5;
              }
              
              yPos += headingStyle.spacing.after;
            } else {
              const style = styleConfig.paragraph;
              yPos += (style.spacing.before || 0);
              yPos = checkPageBreak(yPos);
              
              doc.setFont(FONT_NAME, 'normal');
              doc.setFontSize(style.fontSize);
              
              const textLines = doc.splitTextToSize(text, CONTENT_WIDTH);
              for (const line of textLines) {
                  yPos = checkPageBreak(yPos, ptToMm(style.fontSize));
                  const textWidth = doc.getTextWidth(line);
                  const rightX = A4_WIDTH_MM - PAGE_MARGIN - textWidth;
                  renderStyledLine(doc, line, rightX, yPos, style, styleConfig.strong);
                  yPos += ptToMm(style.fontSize) * style.lineHeight;
              }
              yPos += style.spacing.after;
            }
          }
      }
      else if (block.type === 'normal' && block.content && block.content.trim()) {
        const text = block.content.trim();
        const headingMatch = text.match(/^(#+)\s*(.+)$/);
        const listMatch = text.match(/^\s*[-*+]\s+(.+)$/);
        const hrMatch = text === '---' || text === '***';

        if (hrMatch) {
            const style = styleConfig.hr;
            yPos += style.spacing.before;
            yPos = checkPageBreak(yPos, 2);
            doc.setDrawColor(...style.color);
            doc.setLineWidth(0.5);
            doc.line(PAGE_MARGIN, yPos, A4_WIDTH_MM - PAGE_MARGIN, yPos);
            yPos += style.spacing.after;
        }
        else if (headingMatch) {
            const level = headingMatch[1].length;
            const style = level === 1 ? styleConfig.h1 : level === 2 ? styleConfig.h2 : styleConfig.h3;
            const headingText = headingMatch[2];

            yPos += style.spacing.before;
            yPos = checkPageBreak(yPos);

            doc.setFont(FONT_NAME, style.bold ? 'bold' : 'normal');
            doc.setFontSize(style.fontSize);
            doc.setTextColor(...style.color);

            const textLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
            const textHeight = textLines.length * ptToMm(style.fontSize) * (style.lineHeight || 1.2);
            
            yPos = checkPageBreak(yPos, textHeight);

            doc.text(textLines, PAGE_MARGIN, yPos);
            yPos += textHeight;
            
            // MODIFIED START: 修正H2下划线逻辑
            if (level === 2 && style.border) {
                const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
                const underlineY = yPos + paddingBottomMm;

                yPos = checkPageBreak(underlineY, style.border.bottom.width);

                doc.setDrawColor(...style.border.bottom.color);
                doc.setLineWidth(style.border.bottom.width);
                doc.line(PAGE_MARGIN, underlineY, A4_WIDTH_MM - PAGE_MARGIN, underlineY);
                yPos = underlineY + 0.5;
            }
            // MODIFIED END

            yPos += style.spacing.after;
        }
        else if (listMatch) {
            const style = styleConfig.list;
            yPos += (style.spacing.before || 0);

            const listText = listMatch[1];
            const textLines = doc.splitTextToSize(listText, CONTENT_WIDTH - style.indent.left - 2);

            const textHeight = textLines.length * ptToMm(style.fontSize) * (styleConfig.paragraph.lineHeight || 1.2);
            yPos = checkPageBreak(yPos, textHeight);

            doc.setFont(FONT_NAME, 'normal');
            doc.setFontSize(style.fontSize);
            doc.setTextColor(...style.color);
            doc.text(style.bullet, PAGE_MARGIN, yPos);

            for(const line of textLines) {
              renderStyledLine(doc, line, PAGE_MARGIN + style.indent.left, yPos, styleConfig.paragraph, styleConfig.strong);
              yPos += ptToMm(style.fontSize) * styleConfig.paragraph.lineHeight;
            }
            yPos += style.spacing.after;
        }
        else {
            const style = styleConfig.paragraph;
            yPos += (style.spacing.before || 0);

            const textLines = doc.splitTextToSize(text, CONTENT_WIDTH);
            const textHeight = textLines.length * ptToMm(style.fontSize) * style.lineHeight;
            yPos = checkPageBreak(yPos, textHeight);
            
            doc.setFont(FONT_NAME, 'normal');
            doc.setFontSize(style.fontSize);

            for (const line of textLines) {
                renderStyledLine(doc, line, PAGE_MARGIN, yPos, style, styleConfig.strong);
                yPos += ptToMm(style.fontSize) * style.lineHeight;
            }
            yPos += style.spacing.after;
        }
      }
    } catch (error) {
      console.error(`处理PDF块时出错:`, error, block);
      yPos = checkPageBreak(yPos);
      doc.setTextColor(255, 0, 0);
      doc.setFontSize(10);
      doc.text(`[渲染错误: ${block?.type || '未知类型'}]`, PAGE_MARGIN, yPos);
      yPos += 5;
    }
  }

  const fileName = `${resumeData?.user_name || 'resume'}_简历.pdf`;
  try {
    doc.save(fileName);
    console.log('文字版PDF生成成功');
  } catch (saveError) {
    console.error('保存PDF文件时出错:', saveError);
    throw new Error(`保存PDF文件失败: ${saveError.message}`);
  }
};


const RenderPreview = forwardRef(({ content, config = DEFAULT_CONFIG, resumeData, theme = 'style1' }, ref) => {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const pageContainerRef = useRef(null);
  const measurerRef = useRef(null);

  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }
    
    try {
      const blocks = parseCustomBlocks(content);
      const pagesArr = renderBlocksToPages(blocks, config, measurerRef);
      setPages(pagesArr);
    } catch (error) {
      console.error('分页处理失败:', error);
      setPages([]);
    }
  }, [content, config]);
  
  const generatePDF = useCallback(async () => {
    setLoading(true);
    try {
      console.log('开始生成PDF，内容长度:', content?.length || 0);
      
      if (!content || content.trim() === '') {
        throw new Error('没有内容可生成PDF');
      }
      
      await generateTextualPdf(content, config, resumeData);

    } catch (error) {
      console.error('生成文字版PDF失败:', error);
      
      try {
        console.log('尝试生成简单PDF版本...');
        await generateSimplePdf(content, config, resumeData);
      } catch (simpleError) {
        console.error('简单PDF生成也失败:', simpleError);
        alert(`生成PDF失败: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [content, config, resumeData]);

  const generateWord = useCallback(async () => {
    if (!content) {
      alert('无内容可生成Word文档');
      return;
    }

    setLoading(true);
    try {
      const wordConfig = {
        ...config,
        font: config.font || 'SimSun',
        fontSize: config.fontSize || 12,
        lineHeight: config.lineHeight || 1.5
      };
      
      console.log('开始生成Word文档，配置:', wordConfig);
      await generateWordDocument(content, wordConfig, resumeData);
      console.log('Word文档生成完成');
      
    } catch (error) {
      console.error('生成Word文档失败:', error);
      alert(`生成Word文档失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [content, config, resumeData]);

  useImperativeHandle(ref, () => {
    console.log('=== useImperativeHandle被调用 ===');
    console.log('generatePDF:', generatePDF);
    console.log('generateWord:', generateWord);
    
    return {
      generatePDF,
      generateWord
    };
  }, [generatePDF, generateWord]);

  return (
    <div className={`h-full flex flex-col bg-gray-300 dark:bg-gray-900 resume-theme-${theme}`}>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-700">正在生成文档...</span>
          </div>
        </div>
      )}
      
      <div ref={pageContainerRef} className="flex-1 overflow-y-auto bg-gray-300 dark:bg-gray-900 p-8">
        {content && pages.length > 0 ? (
          pages.map((pageBlocks, index) => (
            <div
              key={index}
              className={`resume-page bg-white shadow-lg mx-auto mb-8 resume-preview-content`}
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                padding: `${PAGE_MARGIN_PX}px`,
                fontFamily: config.font,
                fontSize: `${config.fontSize}pt`,
                lineHeight: config.lineHeight,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div className="prose prose-sm max-w-none resume-markdown dark:prose-invert" 
                   style={{ 
                     height: '100%', 
                     display: 'flex', 
                     flexDirection: 'column',
                     '--base-font-size': `${config.fontSize}pt`
                   }}>
                <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                  <CustomMarkdownPage blocks={pageBlocks} />
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="text-gray-800 dark:text-gray-200 text-center py-20">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-lg">{content ? "正在生成预览..." : "简历预览将在这里显示"}</p>
            {!content && <p className="text-sm mt-2">请在左侧编辑或上传简历</p>}
          </div>
        )}
      </div>
      
      <style>{`
       @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.18s cubic-bezier(.4,0,.2,1); }
      `}</style>
      <style>{`
        .resume-theme-style1 .resume-markdown,
        .resume-theme-style2 .resume-markdown {
          color: #000 !important;
        }
        .resume-theme-style1 .resume-markdown *,
        .resume-theme-style2 .resume-markdown * {
          color: inherit !important;
        }
        .resume-theme-style1 .resume-markdown.dark\:prose-invert,
        .resume-theme-style2 .resume-markdown.dark\:prose-invert {
          color: #000 !important;
        }
        .resume-theme-style1 .resume-markdown.dark\:prose-invert *,
        .resume-theme-style2 .resume-markdown.dark\:prose-invert * {
          color: inherit !important;
        }
        
        .resume-markdown h1 {
          font-size: calc(1.833 * var(--base-font-size, 12pt));
          font-weight: bold;
          color: rgb(0, 0, 0);
          margin-bottom: 1.2rem;
          padding-bottom: 0.5rem;
          letter-spacing: 1px;
        }
        .resume-markdown h2 {
          font-size: calc(1.25 * var(--base-font-size, 12pt));
          color: #0e2954;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
          border-bottom: 1px solid rgb(73, 73, 73);
          padding-left: 0.6rem;
          padding-bottom: 0.5rem;
        }
        .resume-markdown h3 {
          font-size: calc(0.958 * var(--base-font-size, 12pt));
          color: #2563eb;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
       
        .resume-theme-style1 .resume-markdown strong {
          color: #22223b;
          font-weight: bold;
        }
        .resume-theme-style1 .resume-markdown ul {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .resume-theme-style1 .resume-markdown li {
          margin-bottom: 0.5rem;
        }
        .resume-theme-style1 .resume-markdown p {
          margin-bottom: 0.7rem;
        }
        .resume-theme-style1 .resume-markdown hr {
          border: none;
          border-top: 1.5px dashed #b6c6e3;
          margin: 1.5rem 0;
        }
        .resume-theme-style1 .resume-page {
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
});

export default RenderPreview;