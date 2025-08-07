// src/CVcomponents/RenderPreview.jsx
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';

// import { FONT_CONFIG, getAvailableProjectFonts, getAvailableSystemFonts, testFontLoading } from '../utils/fontUtils.js';
// import { initFonts, setMsyhFont } from '../utils/simpleFontLoader.js';
import { parseCustomBlocks, renderBlocksToPages } from '../utils/markdownParser.js';
import { generateWordDocument } from '../utils/wordGenerators.js';
import { generateAdvancedPdf } from '../utils/pdfGenerators.js';

import { 
  A4_WIDTH_PX, 
  A4_HEIGHT_PX, 
  PAGE_MARGIN_PX, 
  MAX_CONTENT_HEIGHT, 
  DEFAULT_CONFIG
} from '../config/constants.js';

// 初始化字体支持
// initFonts();







// 安全的Markdown组件 - 支持对齐块内的标题渲染
const SafeMarkdown = ({ children, alignment = 'left' }) => {
  try {
    // 确保children是字符串
    const content = typeof children === 'string' ? children : String(children || '');
    
    // 如果内容为空，直接返回空div
    if (!content.trim()) {
      return <div></div>;
    }
    
    // 自定义组件，处理标题的对齐
    const components = {
      h1: ({ children }) => (
        <h1 className="text-3xl font-bold mb-4" style={{ textAlign: alignment }}>
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-2xl font-semibold mb-3 pb-1 border-b border-gray-500" style={{ textAlign: alignment }}>
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-xl font-medium mb-2 text-blue-600" style={{ textAlign: alignment }}>
          {children}
        </h3>
      ),
      p: ({ children }) => (
        <p className="mb-2" style={{ textAlign: alignment }}>
          {children}
        </p>
      ),
      li: ({ children }) => (
        <li className="mb-1" style={{ textAlign: alignment }}>
          {children}
        </li>
      )
    };
    
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    );
  } catch (error) {
    console.error('Markdown渲染错误:', error);
    // 如果渲染失败，显示原始文本
    return (
      <div className="text-red-500 text-sm p-2 border border-red-300 rounded bg-red-50">
        <div className="font-medium">Markdown渲染错误</div>
        <div className="text-xs mt-1 whitespace-pre-wrap">
          {typeof children === 'string' ? children.substring(0, 100) : '无法显示内容'}
        </div>
      </div>
    );
  }
};

// 自定义Markdown页面组件
function CustomMarkdownPage({ blocks }) {
  const renderBlock = (block, idx, keyPrefix = '') => {
    const key = `${keyPrefix}-${idx}`;
    
    switch (block.type) {
      case 'row':
        return (
          <div key={key} className="flex justify-between mb-2">
            <div className="text-left flex-1">
              <SafeMarkdown alignment="left">{block.left || ''}</SafeMarkdown>
            </div>
            <div className="text-right flex-1">
              <SafeMarkdown alignment="right">{block.right || ''}</SafeMarkdown>
            </div>
          </div>
        );
        
      case 'heading':
        const level = block.level || 1;
        const headingTag = `h${level}`;
        
        // 标题样式遵循H1/H2/H3自己的规范，不受对齐块影响
        let headingClass = '';
        if (level === 1) {
          headingClass = 'text-3xl font-bold mb-4'; // H1: 22pt, 粗体, 下边距6mm
        } else if (level === 2) {
          headingClass = 'text-2xl font-semibold mb-3 pb-1 border-b border-gray-500'; // H2: 16pt, 粗体, 下划线, 下边距4mm
        } else {
          headingClass = 'text-xl font-medium mb-2 text-blue-600'; // H3: 12pt, 粗体, 蓝色, 下边距3mm
        }
        
        // 标题默认左对齐，对齐块不影响标题的字体样式
        return (
          <div key={key} className={headingClass}>
            <SafeMarkdown alignment="left">{block.content || ''}</SafeMarkdown>
          </div>
        );
        
      case 'left':
      case 'sololeft':
        return (
          <div key={key} className="text-left mb-2">
            {block.hasNested ? (
              <div className="nested-content">
                {block.content.map((nestedBlock, nestedIdx) => 
                  renderBlock(nestedBlock, nestedIdx, key)
                )}
              </div>
            ) : (
              <SafeMarkdown alignment="left">{block.content || ''}</SafeMarkdown>
            )}
          </div>
        );
        
      case 'right':
      case 'soloright':
        return (
          <div key={key} className="text-right mb-2">
            {block.hasNested ? (
              <div className="nested-content">
                {block.content.map((nestedBlock, nestedIdx) => 
                  renderBlock(nestedBlock, nestedIdx, key)
                )}
              </div>
            ) : (
              <SafeMarkdown alignment="right">{block.content || ''}</SafeMarkdown>
            )}
          </div>
        );
        
      case 'center':
      case 'solocenter':
        return (
          <div key={key} className="text-center mb-2">
            {block.hasNested ? (
              <div className="nested-content">
                {block.content.map((nestedBlock, nestedIdx) => 
                  renderBlock(nestedBlock, nestedIdx, key)
                )}
              </div>
            ) : (
              <SafeMarkdown alignment="center">{block.content || ''}</SafeMarkdown>
            )}
          </div>
        );
        
      case 'normal':
      default:
        return (
          <div key={key} className="mb-2">
            <SafeMarkdown alignment="left">{block.content || ''}</SafeMarkdown>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full">
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}

// 主渲染预览组件
const RenderPreview = forwardRef(({ 
  content, 
  config = DEFAULT_CONFIG, 
  className = "",
  resumeData = {}
}, ref) => {
  const [blocks, setBlocks] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  const measurerRef = useRef(null);

  // 解析内容为块
  useEffect(() => {
    if (content) {
      try {
        const parsedBlocks = parseCustomBlocks(content);
        setBlocks(parsedBlocks);
        
        // 将块分页
        const styleConfig = {
          font: config?.font || 'SimSun',
          fontSize: config?.fontSize || 12,
          lineHeight: config?.lineHeight || 1.5,
          maxContentHeight: MAX_CONTENT_HEIGHT
        };
        const pageBlocks = renderBlocksToPages(parsedBlocks, styleConfig, measurerRef);
        setPages(pageBlocks);
      } catch (error) {
        console.error('解析内容时出错:', error);
        setBlocks([]);
        setPages([]);
      }
    }
  }, [content, config]);



  // PDF生成函数
  const generatePDF = useCallback(async () => {
    setLoading(true);
    try {
      console.log('开始生成PDF，内容长度:', content?.length || 0);
      
      if (!content || content.trim() === '') {
        throw new Error('没有内容可生成PDF');
      }
      
      // 构建完整的配置对象
      const pdfConfig = {
        font: config?.font || 'SimSun',
        fontSize: config?.fontSize || 12,
        lineHeight: config?.lineHeight || 1.5,
        // 添加样式配置
        style: 'style1'
      };
      
      console.log('PDF生成配置:', pdfConfig);
      await generateAdvancedPdf(content, pdfConfig, resumeData);

    } catch (error) {
      console.error('生成PDF失败:', error);
      alert(`生成PDF失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [content, config, resumeData]);

  // Word生成函数
  const generateWord = useCallback(async () => {
    if (!content) {
      alert('无内容可生成Word文档');
      return;
    }

    setLoading(true);
    try {
      // 构建完整的配置对象，包含所有必要的样式配置
      const wordConfig = {
        font: config?.font || 'SimSun',
        fontSize: config?.fontSize || 12,
        lineHeight: config?.lineHeight || 1.5,
        // 添加样式配置
        style: 'style1',
        // 添加strong样式配置，用于粗体文本
        strong: {
          color: '22223B'
        }
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

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getBlocks: () => blocks,
    getPages: () => pages,
    generatePDF,
    generateWord
  }));



  return (
    <div className={`h-full flex flex-col bg-gray-300 dark:bg-gray-900 ${className}`}>
      {/* 加载状态 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-700">正在生成文档...</span>
          </div>
        </div>
      )}
      
      {/* 隐藏的测量器 */}
      <div 
        ref={measurerRef} 
        className="absolute invisible pointer-events-none"
        style={{ 
          width: A4_WIDTH_PX - PAGE_MARGIN_PX * 2,
          fontFamily: config.font,
          fontSize: config.fontSize,
          lineHeight: config.lineHeight
        }}
      />
      
      {/* 预览区域 */}
      <div className="flex-1 overflow-y-auto bg-gray-300 dark:bg-gray-900 p-8">
        {content && pages.length > 0 ? (
          pages.map((pageBlocks, pageIdx) => (
            <div
              key={pageIdx}
              className="resume-page bg-white shadow-lg mx-auto mb-8"
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
              <div className="prose prose-sm max-w-none h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
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
        .resume-page {
          border-radius: 12px;
          overflow: hidden;
        }
        .resume-page .prose {
          color: #000 !important;
        }
        .resume-page .prose * {
          color: inherit !important;
        }
        
        /* H1样式 - 匹配Word和PDF配置 */
        .resume-page .prose h1,
        .resume-page .text-3xl {
          font-size: calc(1.833 * ${config.fontSize}pt) !important;
          font-weight: bold !important;
          color: rgb(0, 0, 0) !important;
          margin-bottom: 1.2rem !important;
          margin-top: 0.6rem !important;
          line-height: 1.2 !important;
          letter-spacing: 0.5px !important;
        }
        
        /* H2样式 - 匹配Word和PDF配置 */
        .resume-page .prose h2,
        .resume-page .text-2xl {
          font-size: calc(1.25 * ${config.fontSize}pt) !important;
          font-weight: bold !important;
          color: rgb(0, 0, 0) !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          border-bottom: 1px solid rgb(73, 73, 73) !important;
          padding-bottom: 0.5rem !important;
          line-height: 1.3 !important;
        }
        
        /* H3样式 - 匹配Word和PDF配置 */
        .resume-page .prose h3,
        .resume-page .text-xl {
          font-size: calc(1.0 * ${config.fontSize}pt) !important;
          font-weight: bold !important;
          color: #2563eb !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          line-height: 1.4 !important;
        }
        
        .resume-page .prose strong {
          color: #22223b;
          font-weight: bold;
        }
        .resume-page .prose ul {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .resume-page .prose li {
          margin-bottom: 0.5rem;
        }
        .resume-page .prose p {
          margin-bottom: 0.7rem;
        }
        .resume-page .prose hr {
          border: none;
          border-top: 1.5px dashed #b6c6e3;
          margin: 1.5rem 0;
        }
      `}</style>
    </div>
  );
});

RenderPreview.displayName = 'RenderPreview';

export default RenderPreview;
