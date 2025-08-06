// PDF生成器 - 包含所有PDF生成相关函数
import { jsPDF } from 'jspdf';
import { parseCustomBlocks } from './markdownParser.js';
import { loadMsyhFont, setMsyhFont } from './msyhFontLoader.js';

// A4页面尺寸常量
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// PDF样式配置 - 完全匹配Word样式
const PDF_STYLE_CONFIG = {
  style1: {
    // 基础字体配置
    baseFont: 'helvetica',
    baseFontSize: 12, // pt
    lineHeight: 1.5,
    
    // 标题样式配置 - 完全匹配Word样式
    h1: {
      fontSize: 44, // 与Word保持一致：44pt
      color: [0, 0, 0], // 黑色
      bold: true,
      spacing: { after: 8, before: 4 },
    },
    h2: {
      fontSize: 32, // 与Word保持一致：32pt
      color: [0, 0, 0], // 黑色
      bold: true,
      spacing: { after: 5, before: 2 },
      border: { bottom: { style: 'solid', width: 0.3, color: [73, 73, 73] } },
    },
    h3: {
      fontSize: 24, // 与Word保持一致：24pt
      color: [37, 99, 235], // #2563eb 蓝色
      bold: true,
      spacing: { after: 5, before: 4 },
    },
    
    // 文本样式 - 匹配Word样式
    paragraph: {
      fontSize: 24, // 与Word保持一致：24pt
      color: [0, 0, 0],
      spacing: { after: 4 },
      lineHeight: 1.4,
    },
    
    // 列表样式 - 匹配Word样式
    list: {
      fontSize: 24, // 与Word保持一致：24pt
      color: [0, 0, 0],
      spacing: { after: 3 },
      indent: { left: 5 }, // 缩进 in mm
      bullet: '•'
    },
    
    // 强调文本
    strong: {
      color: [34, 34, 59], // #22223b
      bold: true
    },
    
    // 分割线 - 匹配Word样式
    hr: {
      color: [182, 198, 227], // #b6c6e3
      style: 'dashed',
      spacing: { after: 10, before: 10 }
    }
  }
};

// 动态生成PDF样式配置
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

// 渲染带内联格式的单行文本
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

    // 设置字体和样式
    try {
      doc.setFont(FONT_NAME, fontStyle);
      doc.setFontSize(FONT_SIZE);
      doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
    } catch (fontError) {
      console.warn(`设置字体失败: ${FONT_NAME} ${fontStyle}`, fontError);
      // 回退到普通字体
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(FONT_SIZE);
      doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
    }

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

// 渲染居中的带格式文本
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

    // 设置字体和样式
    try {
      doc.setFont(FONT_NAME, fontStyle);
      doc.setFontSize(FONT_SIZE);
      doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
    } catch (fontError) {
      console.warn(`设置字体失败: ${FONT_NAME} ${fontStyle}`, fontError);
      // 回退到普通字体
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(FONT_SIZE);
      doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
    }

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

// 主要的PDF生成函数 - 完全匹配Word渲染逻辑
export const generateAdvancedPdf = async (content, config, resumeData) => {
  if (!content) throw new Error('无内容可生成PDF');
  console.log('开始生成PDF，使用匹配Word的渲染逻辑...');

  try {
    // 确保msyh字体已加载
    await loadMsyhFont();
    console.log('✅ msyh字体加载完成');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const styleConfig = generatePdfStyleConfig(config);
    console.log('PDF样式配置:', styleConfig);
  
  // 智能字体选择函数 - 确保中文字体使用msyh
  const getFontForText = (text, baseFont = 'helvetica') => {
    if (!text || typeof text !== 'string') {
      return baseFont;
    }
    
    // 检测是否包含中文字符
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    
    if (hasChineseChars) {
      console.log('检测到中文字符，使用msyh字体');
      return 'msyh';
    }
    
    return baseFont;
  };

  // 智能字体样式选择函数 - 中文字符强制使用normal样式
  const getFontStyleForText = (text, desiredStyle = 'normal') => {
    if (!text || typeof text !== 'string') {
      return desiredStyle;
    }
    
    // 检测是否包含中文字符
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    
    if (hasChineseChars) {
      console.log('检测到中文字符，强制使用normal样式');
      return 'normal'; // 中文字符强制使用normal样式
    }
    
    return desiredStyle;
  };
  
  // 检测整体内容是否包含中文，用于设置默认字体
  const hasChineseChars = /[\u4e00-\u9fff]/.test(content);
  let DEFAULT_FONT = hasChineseChars ? 'msyh' : 'helvetica';
  
  if (hasChineseChars) {
    console.log('PDF内容包含中文字符，默认使用msyh字体');
  }
  
  // 设置基础字体
  doc.setFont(DEFAULT_FONT, 'normal');
  doc.setFontSize(styleConfig.baseFontSize);

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
  console.log('解析到的块数:', blocks.length);
  console.log('前几个块的内容:', blocks.slice(0, 3));

  // 获取对齐类型 - 匹配Word的逻辑
  const getAlignmentType = (alignment) => {
    switch (alignment) {
      case 'center':
      case 'solocenter':
        return 'center';
      case 'right':
      case 'soloright':
        return 'right';
      case 'left':
      case 'sololeft':
      default:
        return 'left';
    }
  };

  // 智能格式处理函数 - 处理格式优先级和嵌套（匹配Word逻辑）
  const processFormatWithPriority = (text, isHeading = false, headingLevel = 0) => {
    if (!text || typeof text !== 'string') {
      return text;
    }

    console.log(`PDF智能格式处理: "${text}", 是否标题: ${isHeading}, 标题级别: ${headingLevel}`);

    // 如果是标题，移除所有行内格式标记，保持标题的粗体效果
    if (isHeading) {
      // 移除粗体标记，因为标题本身就是粗体
      let processedText = text.replace(/\*\*(.*?)\*\*/g, '$1');
      // 移除斜体标记，因为标题不支持斜体
      processedText = processedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1');
      // 移除代码标记
      processedText = processedText.replace(/`([^`]+?)`/g, '$1');
      
      console.log(`PDF标题格式处理结果: "${processedText}"`);
      return processedText;
    }

    // 对于普通文本，正常处理所有格式
    return text;
  };

  // 渲染带格式的文本行 - 匹配Word的parseInlineFormatting逻辑
  const renderFormattedText = (doc, text, x, y, style, alignment = 'left') => {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    // 使用智能字体选择
    const FONT_NAME = getFontForText(text, style.baseFont || 'helvetica');
    const FONT_SIZE = style.fontSize;
    const NORMAL_COLOR = Array.isArray(style.color) ? style.color : [0,0,0];
    const STRONG_COLOR = Array.isArray(styleConfig.strong.color) ? styleConfig.strong.color : [34, 34, 59];

    // 处理粗体和斜体格式
    const parts = text.split(/(\*\*.*?\*\*|(?<!\*)\*[^*]+\*(?!\*))/g).filter(p => p);
    let currentX = x;

    parts.forEach(part => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      const isItalic = !isBold && part.startsWith('*') && part.endsWith('*') && !part.startsWith('**');
      
      let partText = part;
      let desiredStyle = 'normal';
      
      if (isBold) {
        partText = part.slice(2, -2);
        desiredStyle = 'bold';
      } else if (isItalic) {
        partText = part.slice(1, -1);
        desiredStyle = 'italic';
      }

      // 使用智能字体样式选择 - 中文字符强制使用normal样式
      const actualFontStyle = getFontStyleForText(partText, desiredStyle);
      const actualFontName = getFontForText(partText, FONT_NAME);

      // 设置字体和样式
      try {
        doc.setFont(actualFontName, actualFontStyle);
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
      } catch (fontError) {
        console.warn(`设置字体失败: ${actualFontName} ${actualFontStyle}`, fontError);
        // 回退到普通字体
        doc.setFont(actualFontName, 'normal');
        doc.setFontSize(FONT_SIZE);
        doc.setTextColor(...(isBold ? STRONG_COLOR : NORMAL_COLOR));
      }

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

    return currentX - x; // 返回文本宽度
  };

  // 解析Markdown到PDF元素 - 匹配Word的parseMarkdownToWordElements逻辑
  const parseMarkdownToPdfElements = (text, style, alignment = null) => {
    const elements = [];
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return elements;
    }
    
    try {
      console.log('PDF解析文本:', text);
      
      // 处理标题 - 修复正则表达式，允许前面有空格
      const headingMatch = text.trim().match(/^(#+)\s*(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        
        console.log(`PDF检测到${level}级标题: "${headingText}"`);
        
        // 使用智能格式处理，移除标题中的行内格式标记
        const processedHeadingText = processFormatWithPriority(headingText, true, level);
        
        let headingStyle;
        if (level === 1) {
          headingStyle = styleConfig.h1;
        } else if (level === 2) {
          headingStyle = styleConfig.h2;
        } else {
          headingStyle = styleConfig.h3;
        }
        
        elements.push({
          type: 'heading',
          level: level,
          text: processedHeadingText,
          style: headingStyle,
          alignment: alignment
        });
        
        console.log(`PDF处理${level}级标题: ${processedHeadingText}, 字体大小: ${headingStyle.fontSize}, 粗体: ${headingStyle.bold}`);
        return elements;
      }
      
      // 处理分割线
      if (text.trim() === '---' || text.trim() === '***') {
        elements.push({
          type: 'hr',
          style: styleConfig.hr,
          alignment: alignment
        });
        return elements;
      }
      
      // 处理列表项
      const listMatch = text.match(/^\s*[-*+]\s*(.+)$/);
      if (listMatch) {
        const listText = listMatch[1];
        elements.push({
          type: 'list',
          text: listText,
          style: styleConfig.list,
          alignment: alignment
        });
        return elements;
      }
      
      // 处理普通段落（包含行内格式）
      elements.push({
        type: 'paragraph',
        text: text,
        style: style,
        alignment: alignment
      });
      
    } catch (error) {
      console.error('PDF解析Markdown文本时出错:', error);
      elements.push({
        type: 'paragraph',
        text: text,
        style: style,
        alignment: alignment
      });
    }
    
    return elements;
  };

  // 渲染PDF元素 - 匹配Word的元素渲染逻辑
  const renderPdfElement = (doc, element, yPos, pageMargin, contentWidth, checkPageBreak, ptToMm, fontName) => {
    try {
      switch (element.type) {
        case 'heading': {
          const { level, text, style, alignment } = element;
          
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);
          
                     // 使用智能字体选择
           const headingFont = getFontForText(text, fontName);
           const headingStyle = getFontStyleForText(text, style.bold ? 'bold' : 'normal');
           
           // 设置标题字体和样式
           try {
             doc.setFont(headingFont, headingStyle);
           } catch (fontError) {
             console.warn('设置标题字体失败，使用普通字体:', fontError);
             doc.setFont(headingFont, 'normal');
           }
          doc.setFontSize(style.fontSize);
          doc.setTextColor(...style.color);
          
          const textLines = doc.splitTextToSize(text, contentWidth);
          const textHeight = textLines.length * ptToMm(style.fontSize) * (style.lineHeight || 1.2);
          
          yPos = checkPageBreak(yPos, textHeight);
          
          // 根据对齐方式渲染文本
          if (alignment === 'center') {
            doc.text(textLines, A4_WIDTH_MM / 2, yPos, { align: 'center' });
          } else if (alignment === 'right') {
            const textWidth = doc.getTextWidth(text);
            const rightX = A4_WIDTH_MM - pageMargin - textWidth;
            doc.text(textLines, rightX, yPos);
          } else {
            doc.text(textLines, pageMargin, yPos);
          }
          
          yPos += textHeight;
          
          // 处理H2下划线
          if (level === 2 && style.border) {
            const paddingBottomMm = ptToMm(styleConfig.baseFontSize) * 0.4;
            const underlineY = yPos + paddingBottomMm;
            
            yPos = checkPageBreak(underlineY, style.border.bottom.width);
            
            doc.setDrawColor(...style.border.bottom.color);
            doc.setLineWidth(style.border.bottom.width);
            doc.line(pageMargin, underlineY, A4_WIDTH_MM - pageMargin, underlineY);
            yPos = underlineY + 0.5;
          }
          
          yPos += style.spacing.after;
          break;
        }
        
        case 'paragraph': {
          const { text, style, alignment } = element;
          
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);
          
          // 使用智能字体选择
          const paragraphFont = getFontForText(text, fontName);
          doc.setFont(paragraphFont, 'normal');
          doc.setFontSize(style.fontSize);
          
          const textLines = doc.splitTextToSize(text, contentWidth);
          for (const textLine of textLines) {
            yPos = checkPageBreak(yPos, ptToMm(style.fontSize));
            
            // 根据对齐方式渲染文本
            if (alignment === 'center') {
              const textWidth = doc.getTextWidth(textLine);
              const centerX = (A4_WIDTH_MM - textWidth) / 2;
              renderFormattedText(doc, textLine, centerX, yPos, style, alignment);
            } else if (alignment === 'right') {
              const textWidth = doc.getTextWidth(textLine);
              const rightX = A4_WIDTH_MM - pageMargin - textWidth;
              renderFormattedText(doc, textLine, rightX, yPos, style, alignment);
            } else {
              renderFormattedText(doc, textLine, pageMargin, yPos, style, alignment);
            }
            
            yPos += ptToMm(style.fontSize) * style.lineHeight;
          }
          
          yPos += style.spacing.after;
          break;
        }
        
        case 'list': {
          const { text, style, alignment } = element;
          
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);
          
          // 使用智能字体选择
          const listFont = getFontForText(text, fontName);
          doc.setFont(listFont, 'normal');
          doc.setFontSize(style.fontSize);
          doc.setTextColor(...style.color);
          
          const textLines = doc.splitTextToSize(text, contentWidth - style.indent.left - 2);
          const textHeight = textLines.length * ptToMm(style.fontSize) * (styleConfig.paragraph.lineHeight || 1.2);
          yPos = checkPageBreak(yPos, textHeight);
          
          // 渲染项目符号
          doc.text(style.bullet, pageMargin, yPos);
          
          // 渲染列表文本
          for (const line of textLines) {
            renderFormattedText(doc, line, pageMargin + style.indent.left, yPos, styleConfig.paragraph, alignment);
            yPos += ptToMm(style.fontSize) * styleConfig.paragraph.lineHeight;
          }
          
          yPos += style.spacing.after;
          break;
        }
        
        case 'hr': {
          const { style } = element;
          
          yPos += style.spacing.before;
          yPos = checkPageBreak(yPos, 2);
          
          doc.setDrawColor(...style.color);
          doc.setLineWidth(0.5);
          doc.line(pageMargin, yPos, A4_WIDTH_MM - pageMargin, yPos);
          
          yPos += style.spacing.after;
          break;
        }
        
        default:
          console.warn('PDF未知元素类型:', element.type);
          break;
      }
    } catch (error) {
      console.error('PDF渲染元素时出错:', error, element);
      yPos = checkPageBreak(yPos);
      doc.setTextColor(255, 0, 0);
      doc.setFontSize(10);
      doc.text(`[渲染错误: ${element?.type || '未知类型'}]`, pageMargin, yPos);
      yPos += 5;
    }
    
    return yPos;
  };

  for (const block of blocks) {
    if (!block) continue;

    yPos = checkPageBreak(yPos);

    try {
      console.log(`PDF处理块: ${block.type}`, block);
      
      if (block.type === 'row') {
        // 左右分栏布局 - 匹配Word的逻辑
        const leftText = block.left || '';
        const rightText = block.right || '';
        
        if (leftText || rightText) {
          const style = styleConfig.paragraph;
          yPos += (style.spacing.before || 0);
          yPos = checkPageBreak(yPos);
          
          doc.setFont(DEFAULT_FONT, 'normal');
          doc.setFontSize(style.fontSize);
          
          if (leftText) {
            renderFormattedText(doc, leftText, PAGE_MARGIN, yPos, style, 'left');
          }
          
          if (rightText) {
            const rightCleanText = rightText.replace(/\*\*/g, '');
            const rightWidth = doc.getTextWidth(rightCleanText);
            const rightX = A4_WIDTH_MM - PAGE_MARGIN - rightWidth;
            renderFormattedText(doc, rightText, rightX, yPos, style, 'right');
          }

          yPos += ptToMm(style.fontSize) * style.lineHeight;
          yPos += style.spacing.after;
        }
      }
      else if (block.type === 'left' || block.type === 'right' || block.type === 'center' || 
               block.type === 'sololeft' || block.type === 'solocenter' || block.type === 'soloright') {
        // 对齐块处理 - 匹配Word的逻辑
        if (block.hasNested) {
          // 嵌套块，递归处理
          console.log(`PDF处理嵌套${block.type}块，包含${block.content.length}个子块`);
          for (const nestedBlock of block.content) {
            // 递归处理嵌套块，这里简化处理
            if (nestedBlock.content) {
              const content = Array.isArray(nestedBlock.content) ? nestedBlock.content.join('') : nestedBlock.content;
              const alignment = getAlignmentType(block.type);
              const elements = parseMarkdownToPdfElements(content, styleConfig.paragraph, alignment);
              
              for (const element of elements) {
                yPos = renderPdfElement(doc, element, yPos, PAGE_MARGIN, CONTENT_WIDTH, checkPageBreak, ptToMm, DEFAULT_FONT);
              }
            }
          }
        } else {
          const content = block.content || '';
          if (content) {
            // 处理内容，可能是字符串或数组
            let contentArray;
            if (Array.isArray(content)) {
              contentArray = content;
            } else if (typeof content === 'string') {
              contentArray = [content];
            } else {
              contentArray = [String(content)];
            }
            
            console.log(`PDF处理${block.type}对齐块，内容数组:`, contentArray);
            
            for (const contentLine of contentArray) {
              if (typeof contentLine === 'string' && contentLine.trim()) {
                console.log(`PDF处理${block.type}对齐块的内容行:`, contentLine);
                
                // 使用统一的Markdown解析函数，直接传递对齐参数
                const alignment = getAlignmentType(block.type);
                const elements = parseMarkdownToPdfElements(contentLine, styleConfig.paragraph, alignment);
                console.log(`PDF处理${block.type}对齐块，应用对齐方式:`, alignment);
                
                for (const element of elements) {
                  yPos = renderPdfElement(doc, element, yPos, PAGE_MARGIN, CONTENT_WIDTH, checkPageBreak, ptToMm, DEFAULT_FONT);
                }
              }
            }
          }
        }
      }
      else if (block.type === 'normal') {
        const text = block.content || '';
        if (text && typeof text === 'string' && text.trim()) {
          // 检查是否有对齐属性
          const alignment = block.alignment ? getAlignmentType(block.alignment) : null;
          const elements = parseMarkdownToPdfElements(text, styleConfig.paragraph, alignment);
          
          for (const element of elements) {
            yPos = renderPdfElement(doc, element, yPos, PAGE_MARGIN, CONTENT_WIDTH, checkPageBreak, ptToMm, DEFAULT_FONT);
          }
        }
      }
      // 保留其他块类型的处理（如果需要）
      else {
        console.warn('PDF未知块类型:', block.type);
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
    console.log('✅ PDF生成成功，使用匹配Word的渲染逻辑');
  } catch (saveError) {
    console.error('保存PDF文件时出错:', saveError);
    throw new Error(`保存PDF文件失败: ${saveError.message}`);
  }
  } catch (error) {
    console.error('生成PDF文档失败:', error);
    console.error('错误堆栈:', error.stack);
    throw new Error(`生成PDF文档失败: ${error.message}`);
  }
};

// 保留其他函数以保持兼容性
export const generateBasicPdf = generateAdvancedPdf;
export const generateSimpleChinesePdfV2 = generateAdvancedPdf;
export const generatePdfWithMsyhFont = generateAdvancedPdf;
export const generateSimplePdfV2 = generateAdvancedPdf;

// 添加字体测试函数
export const testFontInPdf = async () => {
  try {
    // 创建一个简单的测试内容
    const testContent = `# 字体测试
## 中文测试
**粗体文本测试**
*斜体文本测试*
\`代码文本测试\`

::: left
左对齐文本
:::
::: right
右对齐文本
:::
::: center
居中对齐文本
:::

- 列表项1
- 列表项2
- 列表项3

---

普通段落文本，包含中文字符和English characters。`;

    // 使用默认配置生成PDF
    await generateAdvancedPdf(testContent, {
      font: 'SimSun',
      fontSize: 12,
      lineHeight: 1.5
    }, { user_name: '字体测试' });

    return {
      success: true,
      message: 'PDF字体测试成功！',
      details: {
        font: 'SimSun',
        fontSize: 12,
        lineHeight: 1.5,
        contentLength: testContent.length
      }
    };
  } catch (error) {
    console.error('PDF字体测试失败:', error);
    return {
      success: false,
      error: error.message,
      details: {
        font: 'SimSun',
        fontSize: 12,
        lineHeight: 1.5
      }
    };
  }
};