// src/CVcomponents/RenderPreview.jsx
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Button from '../Comcomponents/common/Button.jsx';
import { convertJsonToMarkdown } from '../utils/resumeUtils.jsx';

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
//解决渲染页面截断问题
// 实际可用内容高度 = 理论高度 - 页面布局空间 - 样式累积效果 - 安全边距
// 理论高度: 1123 - 96 = 1027px
// 页面布局空间: 底部边距24px + 页脚18px + prose样式约50px = 92px
// 字体渲染差异: 约200px (浏览器字体渲染与测量时的差异)
// 其他样式累积: 约100px (各种margin、padding的累积)
// 安全边距: 约8px
const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - (PAGE_MARGIN_PX * 2) - 400; // 总计减去400px
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// 预设样式配置
const DEFAULT_CONFIG = { font: 'SimSun', fontSize: 12, lineHeight: 1.5 };
const COMPACT_CONFIG = { font: 'SimSun', fontSize: 10.5, lineHeight: 1.3 };

// 优化后的parseCustomBlocks
function parseCustomBlocks(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    
    if (/^::: ?center/.test(lines[i])) {
      let content = [];
      i++;
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') content.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'center', content });
      i++;
      continue;
    }
    
    if (/^::: ?left/.test(lines[i])) {
      let leftLines = [];
      i++;
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') leftLines.push(lines[i]);
        i++;
      }
      i++;
      
      if (i < lines.length && /^::: ?right/.test(lines[i])) {
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
        leftLines.forEach(l => blocks.push({ type: 'left', content: l }));
        continue;
      }
    }
    
    if (/^::: ?right/.test(lines[i])) {
      let rightLines = [];
      i++;
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') rightLines.push(lines[i]);
        i++;
      }
      i++;
      rightLines.forEach(r => blocks.push({ type: 'right', content: r }));
      continue;
    }
    
    blocks.push({ type: 'normal', content: lines[i] });
    i++;
  }
  
  return blocks;
}

// 块级分页函数
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
        const content = Array.isArray(block.content) ? block.content : [block.content];
        content.forEach(line => {
          if (line && line.trim()) {
            const el = document.createElement('div');
            el.style.cssText = 'text-align: center; margin: 4px 0;';
            el.textContent = line.replace(/[#*_`]/g, '');
            blockEl.appendChild(el);
          }
        });
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
        el.textContent = (block.content || '').replace(/[#*_`]/g, '');
        blockEl.appendChild(el);
      } else if (block.type === 'right') {
        const el = document.createElement('div');
        el.style.cssText = 'text-align: right; margin: 4px 0;';
        el.textContent = (block.content || '').replace(/[#*_`]/g, '');
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

// 同时修复 CustomMarkdownPage 组件，添加更好的错误处理
function CustomMarkdownPage({ blocks }) {
  // 添加调试信息
  console.log('CustomMarkdownPage 渲染，接收到的块数:', blocks?.length || 0);
  
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.warn('CustomMarkdownPage 接收到空的或无效的 blocks');
    return <div className="w-full pl-0 text-gray-400">此页无内容</div>;
  }

  return (
    <div className="w-full pl-0">
      {blocks.map((block, idx) => {
        if (!block) {
          console.warn(`块 ${idx} 为 null 或 undefined`);
          return null;
        }

        try {
          if (block.type === 'center') {
            const content = Array.isArray(block.content) ? block.content : [block.content];
            return content.map((line, i) => (
              <div key={`${idx}-${i}`} className="text-center my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{line || ''}</ReactMarkdown>
              </div>
            ));
          } else if (block.type === 'row') {
            return (
              <div key={idx} className="flex flex-row justify-between my-1 w-full">
                <div className="text-left flex-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.left || ''}</ReactMarkdown>
                </div>
                <div className="text-right flex-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.right || ''}</ReactMarkdown>
                </div>
              </div>
            );
          } else if (block.type === 'left') {
            return (
              <div key={idx} className="text-left my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ''}</ReactMarkdown>
              </div>
            );
          } else if (block.type === 'right') {
            return (
              <div key={idx} className="text-right my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.right || ''}</ReactMarkdown>
              </div>
            );
          } else {
            return (
              <div key={idx} className="w-full pl-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ''}</ReactMarkdown>
              </div>
            );
          }
        } catch (error) {
          console.error(`渲染块 ${idx} 时出错:`, error, block);
          return (
            <div key={idx} className="w-full pl-0 text-red-500 text-sm">
              [渲染错误: {block.type}]
            </div>
          );
        }
      })}
    </div>
  );
}

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
    if (!pageContainerRef.current || pages.length === 0) {
      alert('无内容可生成PDF');
      return;
    }

    setLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [A4_WIDTH_MM, A4_HEIGHT_MM]
      });
      
      const pageElements = pageContainerRef.current.querySelectorAll('.resume-page');

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        
        // 确保页面元素有正确的尺寸
        pageEl.style.width = `${A4_WIDTH_PX}px`;
        pageEl.style.height = `${A4_HEIGHT_PX}px`;
        pageEl.style.padding = `${PAGE_MARGIN_PX}px`;
        
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          windowWidth: A4_WIDTH_PX,
          windowHeight: A4_HEIGHT_PX
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        if (i > 0) pdf.addPage();
        
        pdf.addImage(
          imgData, 
          'JPEG', 
          0, 
          0, 
          A4_WIDTH_MM, 
          A4_HEIGHT_MM
        );
      }

      pdf.save(`${resumeData?.user_name || 'resume'}_简历.pdf`);
    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [pages, resumeData]);

  useImperativeHandle(ref, () => ({
    generatePDF
  }), [generatePDF]);

  return (
    <div className={`h-full flex flex-col bg-gray-300 dark:bg-gray-900 resume-theme-${theme}`}>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-700">正在生成PDF...</span>
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
                   style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                  <CustomMarkdownPage blocks={pageBlocks} />
                </div>
                <div style={{ flex: '0 0 24px' }}></div>
              </div>
              <div className="resume-footer-decor">AI智能简历</div>
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
      
      {/* 样式部分保持不变 */}
      <style>{`
       @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.18s cubic-bezier(.4,0,.2,1); }
      `}</style>
      {/* 样式1黑色 */}
      <style>{`
        .resume-theme-style1 .resume-markdown,
        .resume-theme-style2 .resume-markdown {
          color: #000 !important;
        }
        .resume-theme-style1 .resume-markdown *,
        .resume-theme-style2 .resume-markdown * {
          color: inherit !important;
        }
        /* 覆盖prose的暗色样式 */
        .resume-theme-style1 .resume-markdown.dark\:prose-invert,
        .resume-theme-style2 .resume-markdown.dark\:prose-invert {
          color: #000 !important;
        }
        .resume-theme-style1 .resume-markdown.dark\:prose-invert *,
        .resume-theme-style2 .resume-markdown.dark\:prose-invert * {
          color: inherit !important;
        }
       
        .resume-theme-style1 .resume-markdown h1 {
          font-size: 2.2rem;
          font-weight: bold;
          color:rgb(0, 0, 0);
          // border-bottom: 2px solid #e0e7ef;
          margin-bottom: 1.2rem;
          padding-bottom: 0.5rem;
          letter-spacing: 1px;
        }
        .resume-theme-style1 .resume-markdown h2 {
          font-size: 1.5rem;
          color: #0e2954;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
          border-bottom: 1px solid rgb(73, 73, 73);
          padding-left: 0.6rem;
          // background: #f1f5fa;
        }
        .resume-theme-style1 .resume-markdown h3 {
          font-size: 1.15rem;
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
          // box-shadow: 0 4px 24px 0 #2563eb22;
          border-radius: 12px;
          overflow: hidden;
        }
        .resume-theme-style1 .resume-footer-decor {
          position: absolute;
          bottom: 18px;
          right: 32px;
          font-size: 0.95rem;
          color: #2563eb99;
          letter-spacing: 1px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
});

export default RenderPreview;