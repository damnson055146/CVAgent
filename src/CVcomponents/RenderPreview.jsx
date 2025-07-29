// src/components/RenderPreview.jsx
//把这个文件作为简历预览组件，负责渲染Markdown内容为PDF格式
// 使用ReactMarkdown和html2canvas生成PDF
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Button from '../Comcomponents/common/Button.jsx';
import { convertJsonToMarkdown } from '../utils/resumeUtils.jsx';

// --- Helper Function ---
// 实现一个简单的 debounce (防抖) 函数，避免过于频繁地执行分页计算
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// A4页面在96DPI下的像素尺寸 (210mm x 297mm)
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
// 页面内容区的垂直边距 (上下各24px)
const PAGE_MARGIN_PX = 48; 
const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - (PAGE_MARGIN_PX * 2);

// 预设样式配置
const DEFAULT_CONFIG = { font: 'SimSun', fontSize: 12, lineHeight: 1.5 };
const COMPACT_CONFIG = { font: 'SimSun', fontSize: 10.5, lineHeight: 1.3 };

// 优化后的parseCustomBlocks，修复center块连续、空行、冒号行渲染问题
function parseCustomBlocks(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    // 跳过空行
    if (!lines[i].trim()) { i++; continue; }
    // ::: center 多块，且不渲染:::
    if (/^::: ?center/.test(lines[i])) {
      let content = [];
      i++;
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') content.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'center', content });
      i++; // skip :::
      continue;
    }
    // ::: left 多行 + ::: right 多行，按行配对
    if (/^::: ?left/.test(lines[i])) {
      let leftLines = [];
      i++;
      while (i < lines.length && !/^:::$/.test(lines[i])) {
        if (lines[i].trim() !== '') leftLines.push(lines[i]);
        i++;
      }
      i++; // skip :::
      // 查找下一个right块
      if (i < lines.length && /^::: ?right/.test(lines[i])) {
        let rightLines = [];
        i++;
        while (i < lines.length && !/^:::$/.test(lines[i])) {
          if (lines[i].trim() !== '') rightLines.push(lines[i]);
          i++;
        }
        i++; // skip :::
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
    // ::: right 多行
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
    // ::: left ... ::: ::: right ... ::: 同行
    if (/^::: ?left/.test(lines[i]) && /^::: ?right/.test(lines[i+1])) {
      const left = lines[i].replace(/^::: ?left/, '').replace(/^:::/, '').trim();
      const right = lines[i+1].replace(/^::: ?right/, '').replace(/^:::/, '').trim();
      blocks.push({ type: 'row', left, right });
      i += 2;
      continue;
    }
    // 普通行
    blocks.push({ type: 'normal', content: lines[i] });
    i++;
  }
  return blocks;
}

// 块级分页函数 Ma
function renderBlocksToPages(blocks, config, measurerRef) {
  // 1. 先将每个块渲染到隐藏measurer，测量高度
  // 2. 累加到一页，超出A4则分页，保证块不被拆分
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;
  // 临时div用于测量
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = `${A4_WIDTH_PX - (PAGE_MARGIN_PX * 2)}px`;
  tempDiv.style.fontFamily = config.font;
  tempDiv.style.fontSize = `${config.fontSize}pt`;
  tempDiv.style.lineHeight = config.lineHeight;
  document.body.appendChild(tempDiv);
  for (let i = 0; i < blocks.length; i++) {
    // 渲染单个块
    let blockEl = document.createElement('div');
    if (blocks[i].type === 'center') {
      blocks[i].content.forEach(line => {
        const el = document.createElement('div');
        el.className = 'text-center my-1';
        el.innerHTML = line;
        blockEl.appendChild(el);
      });
    } else if (blocks[i].type === 'row') {
      const row = document.createElement('div');
      row.className = 'flex flex-row justify-between my-1';
      const left = document.createElement('div');
      left.className = 'text-left flex-1';
      left.innerHTML = blocks[i].left;
      const right = document.createElement('div');
      right.className = 'text-right flex-1';
      right.innerHTML = blocks[i].right;
      row.appendChild(left);
      row.appendChild(right);
      blockEl.appendChild(row);
    } else if (blocks[i].type === 'left') {
      const el = document.createElement('div');
      el.className = 'text-left my-1';
      el.innerHTML = blocks[i].content;
      blockEl.appendChild(el);
    } else if (blocks[i].type === 'right') {
      const el = document.createElement('div');
      el.className = 'text-right my-1';
      el.innerHTML = blocks[i].content;
      blockEl.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.innerHTML = blocks[i].content;
      blockEl.appendChild(el);
    }
    tempDiv.appendChild(blockEl);
    const blockHeight = blockEl.offsetHeight;
    tempDiv.removeChild(blockEl);
    // 分页逻辑
    if (currentHeight + blockHeight > MAX_CONTENT_HEIGHT && currentPage.length > 0) {
      pages.push([...currentPage]);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(blocks[i]);
    currentHeight += blockHeight;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  document.body.removeChild(tempDiv);
  return pages;
}

function CustomMarkdownPage({ blocks }) {
  return (
    <div className="w-full pl-0">
      {blocks.map((block, idx) => {
        if (block.type === 'center') {
          return block.content.map((line, i) => (
            <div key={idx + '-' + i} className="text-center my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{line}</ReactMarkdown>
            </div>
          ));
        } else if (block.type === 'row') {
          return (
            <div key={idx} className="flex flex-row justify-between my-1 w-full">
              <div className="text-left flex-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.left}</ReactMarkdown></div>
              <div className="text-right flex-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.right}</ReactMarkdown></div>
            </div>
          );
        } else if (block.type === 'left') {
          return <div key={idx} className="text-left my-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown></div>;
        } else if (block.type === 'right') {
          return <div key={idx} className="text-right my-1"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown></div>;
        } else {
          return <div className="w-full pl-0"><ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown></div>;
        }
      })}
    </div>
  );
}


const RenderPreview = forwardRef(({ content, config, resumeData, theme = 'style1' }, ref) => {
  const [loading, setLoading] = useState(false); // 添加 loading 状态
  const [pages, setPages] = useState([]); // 添加 pages state
  const pageContainerRef = useRef(null);
  const measurerRef = useRef(null);
  const measurerRootRef = useRef(null);

  // 使用 useCallback 和 debounce 来创建高性能的分页函数
  const paginateContent = useCallback(debounce(() => {
    if (!content || !measurerRef.current) {
      setPages([]);
      return;
    }

    // 只对measurerRef.current调用一次createRoot，后续复用
    if (!measurerRootRef.current) {
      measurerRootRef.current = createRoot(measurerRef.current);
    }
    measurerRootRef.current.render(
      <div 
        style={{ fontFamily: config.font, fontSize: `${config.fontSize}pt`, lineHeight: config.lineHeight }}
        className="prose prose-sm max-w-none"
      >
        <CustomMarkdownPage blocks={parseCustomBlocks(content)} />
      </div>
    );

    // 等待React渲染完成
    setTimeout(() => {
      const children = Array.from(measurerRef.current.children[0]?.children || []);
      if (children.length === 0) {
        setPages([]);
        return;
      }

      // 2. 分发DOM元素到各个页面
      const newPages = [];
      let currentPageElementsHTML = '';
      let currentPageHeight = 0;

      children.forEach(el => {
        const elementHeight = el.offsetHeight;
        
        if (currentPageHeight + elementHeight > MAX_CONTENT_HEIGHT && currentPageElementsHTML !== '') {
          newPages.push(currentPageElementsHTML);
          currentPageElementsHTML = el.outerHTML;
          currentPageHeight = elementHeight;
        } else {
          currentPageElementsHTML += el.outerHTML;
          currentPageHeight += elementHeight;
        }
      });
      
      if (currentPageElementsHTML !== '') {
        newPages.push(currentPageElementsHTML);
      }

      setPages(newPages);
    }, 50); // 短暂延迟以确保DOM测量准确
  }, 300), [content, config]);

  // 在主函数中，分页逻辑替换为块级分页
  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }
    const blocks = parseCustomBlocks(content);
    const pagesArr = renderBlocksToPages(blocks, config, measurerRef);
    setPages(pagesArr);
  }, [content, config]);
  
  const handleSmartLayout = (type) => {
    if (type === 'compact' && pages.length > 1) {
      setConfig(COMPACT_CONFIG);
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  };

  // 修改 generatePDF 函数，确保可以访问 setLoading
  const generatePDF = useCallback(async () => {
    if (!pageContainerRef.current || pages.length === 0) {
      alert('无内容可生成PDF');
      return;
    }

    setLoading(true);
    try {
      // 使用像素单位(pt)初始化PDF，1pt=1px(96dpi)
      const pdf = new jsPDF('p', 'pt', [A4_WIDTH_PX, A4_HEIGHT_PX]);
      const pageElements = pageContainerRef.current.querySelectorAll('.resume-page');

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        
        // 临时调整样式确保精确捕获
        const originalStyles = {
          transform: pageEl.style.transform,
          boxShadow: pageEl.style.boxShadow
        };
        pageEl.style.transform = 'none';
        pageEl.style.boxShadow = 'none';

        // 计算缩放比例（针对高分屏优化）
        const scale = 2; // 固定使用2倍缩放以确保清晰度
        
        const canvas = await html2canvas(pageEl, {
          scale,
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY
        });

        // 恢复原始样式
        pageEl.style.transform = originalStyles.transform;
        pageEl.style.boxShadow = originalStyles.boxShadow;

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        if (i > 0) {
          pdf.addPage([A4_WIDTH_PX, A4_HEIGHT_PX], 'p');
        }
        
        pdf.addImage(
          imgData, 
          'JPEG', 
          0, 
          0, 
          A4_WIDTH_PX, 
          A4_HEIGHT_PX
        );
      }

      // 生成PDF文件
      pdf.save(`${resumeData?.user_name || 'resume'}_简历.pdf`);
    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [pages, resumeData]);

  // 暴露 generatePDF 方法给父组件
  useImperativeHandle(ref, () => ({
    generatePDF
  }), [generatePDF]);

  // 样式选项
  const themeOptions = [
    { key: 'style1', label: '1' },
    { key: 'style2', label: '2' },
  ];
  const currentThemeLabel = themeOptions.find(opt => opt.key === theme)?.label || '1';

  // 点击切换主题
  const handleThemeChange = (key) => {
    setTheme(key);
    setMenuOpen(false);
  };

  // 只保留分页、内容渲染部分
  return (
    <div className={`h-full flex flex-col bg-gray-300 dark:bg-gray-900 resume-theme-${theme}`}>
      {/* Loading 遮罩 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-700">正在生成PDF...</span>
          </div>
        </div>
      )}
      
      <div ref={measurerRef} style={{ width: `${A4_WIDTH_PX - (PAGE_MARGIN_PX * 2)}px`, position: 'absolute', left: '-9999px', top: 0, zIndex: -1, visibility: 'hidden', pointerEvents: 'none' }}></div>
      {/* 预览内容区域 */}
      <div ref={pageContainerRef} className="flex-1 overflow-y-auto bg-gray-300 dark:bg-gray-900 p-8">
        {content && pages.length > 0 ? (
          pages.map((pageBlocks, index) => (
            <div
              key={index}
              className={`resume-page bg-white shadow-lg mx-auto mb-8 resume-preview-content`}
              style={{
                width: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
                padding: `${PAGE_MARGIN_PX}px`,
                fontFamily: config.font,
                fontSize: `${config.fontSize}pt`,
                lineHeight: config.lineHeight,
                position: 'relative',
              }}
            >
              {/* 顶部彩色条 */}
              {/* <div className="resume-color-bar"></div> */}
              <div className="prose prose-sm max-w-none resume-markdown dark:prose-invert">
                <CustomMarkdownPage blocks={pageBlocks} />
              </div>
              {/* 页脚图案 */}
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
      {/* 样式相关 style 保留 */}
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
      {/* 样式2：黑白灰 */}
      <style>{`
        .resume-theme-style2 .resume-color-bar {
          display: none;
        }
        .resume-theme-style2 .resume-page {
          background: #fff;
          border-radius: 0;
          // box-shadow: 0 2px 12px 0 #0002;
          border: 1.5px solid #e5e7eb;
        }
        .resume-theme-style2 .resume-markdown h1 {
          font-size: 2.1rem;
          font-weight: bold;
          color: #222;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 1.1rem;
          padding-bottom: 0.4rem;
          letter-spacing: 0.5px;
        }
        .resume-theme-style2 .resume-markdown h2 {
          font-size: 1.25rem;
          color: #222;
          margin-top: 1.3rem;
          margin-bottom: 0.8rem;
          font-weight: 600;
          background: #f5f5f5;
          border-left: 4px solid #bbb;
          padding-left: 0.5rem;
        }
        .resume-theme-style2 .resume-markdown h3 {
          font-size: 1.05rem;
          color: #444;
          margin-top: 0.8rem;
          margin-bottom: 0.4rem;
          font-weight: 500;
        }
        .resume-theme-style2 .resume-markdown strong {
          color: #111;
          font-weight: bold;
        }
        .resume-theme-style2 .resume-markdown ul {
          margin-left: 1.2rem;
          margin-bottom: 0.7rem;
        }
        .resume-theme-style2 .resume-markdown li {
          margin-bottom: 0.3rem;
        }
        .resume-theme-style2 .resume-markdown p {
          margin-bottom: 0.5rem;
        }
        .resume-theme-style2 .resume-markdown hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.1rem 0;
        }
        .resume-theme-style2 .resume-footer-decor {
          position: absolute;
          bottom: 14px;
          right: 24px;
          font-size: 0.9rem;
          color: #bbb;
          letter-spacing: 0.5px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
});
export default RenderPreview;