// Word文档生成器 - 修复格式渲染问题
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { parseCustomBlocks } from './markdownParser.js';

// Word样式配置 - 完全匹配预览区CSS
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
      spacing: { after: 20, before: 200 }, // 减少间距
      border: { bottom: { style: 'single', size: 6, color: '494949' } }, // 分隔线
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

// 动态生成Word样式配置
const generateWordStyleConfig = (config) => {
  const baseStyleConfig = WORD_STYLE_CONFIG.style1;
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
      fontSize: Math.round(baseFontSize * h1Ratio * 2), // docx单位是半点
      spacing: {
        after: Math.round(baseStyleConfig.h1.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h1.spacing.before * spacingRatio)
      }
    },
    h2: {
      ...baseStyleConfig.h2,
      fontSize: Math.round(baseFontSize * h2Ratio * 2),
      spacing: {
        after: Math.round(baseStyleConfig.h2.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h2.spacing.before * spacingRatio)
      }
    },
    h3: {
      ...baseStyleConfig.h3,
      fontSize: Math.round(baseFontSize * h3Ratio * 2),
      spacing: {
        after: Math.round(baseStyleConfig.h3.spacing.after * spacingRatio),
        before: Math.round(baseStyleConfig.h3.spacing.before * spacingRatio)
      }
    },
    paragraph: {
      ...baseStyleConfig.paragraph,
      fontSize: baseFontSize * 2, // docx单位是半点
      spacing: {
        after: Math.round(baseStyleConfig.paragraph.spacing.after * spacingRatio)
      }
    },
    list: {
      ...baseStyleConfig.list,
      fontSize: baseFontSize * 2,
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

// 改进的行内格式解析函数
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
    
    // 使用更精确的正则表达式来处理格式
    let currentIndex = 0;
    const totalLength = text.length;
    
    while (currentIndex < totalLength) {
      // 查找下一个格式标记
      const boldMatch = text.substring(currentIndex).match(/^\*\*(.*?)\*\*/);
      const italicMatch = text.substring(currentIndex).match(/^(?<!\*)\*([^*]+?)\*(?!\*)/);
      const codeMatch = text.substring(currentIndex).match(/^`([^`]+?)`/);
      
      let matchFound = false;
      
      // 处理粗体
      if (boldMatch && boldMatch.index === 0) {
        const content = boldMatch[1];
        textRuns.push(new TextRun({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont,
          bold: true,
          color: styleConfig.strong.color
        }));
        currentIndex += boldMatch[0].length;
        matchFound = true;
        console.log(`应用粗体格式: "${content}"`);
      }
      // 处理斜体（确保不与粗体冲突）
      else if (italicMatch && italicMatch.index === 0 && !text.substring(currentIndex).startsWith('**')) {
        const content = italicMatch[1];
        textRuns.push(new TextRun({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont,
          italics: true
        }));
        currentIndex += italicMatch[0].length;
        matchFound = true;
        console.log(`应用斜体格式: "${content}"`);
      }
      // 处理代码
      else if (codeMatch && codeMatch.index === 0) {
        const content = codeMatch[1];
        textRuns.push(new TextRun({
          text: content,
          size: styleConfig.paragraph.fontSize,
          font: 'Courier New',
          color: '666666'
        }));
        currentIndex += codeMatch[0].length;
        matchFound = true;
        console.log(`应用代码格式: "${content}"`);
      }
      
      // 如果没有找到格式，添加普通文本
      if (!matchFound) {
        // 找到下一个格式标记的位置
        const nextBold = text.indexOf('**', currentIndex);
        const nextItalic = text.indexOf('*', currentIndex);
        const nextCode = text.indexOf('`', currentIndex);
        
        let nextMarkIndex = totalLength;
        if (nextBold !== -1) nextMarkIndex = Math.min(nextMarkIndex, nextBold);
        if (nextItalic !== -1 && nextItalic !== nextBold) nextMarkIndex = Math.min(nextMarkIndex, nextItalic);
        if (nextCode !== -1) nextMarkIndex = Math.min(nextMarkIndex, nextCode);
        
        const plainText = text.substring(currentIndex, nextMarkIndex);
        if (plainText) {
          textRuns.push(new TextRun({
            text: plainText,
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
        }
        
        currentIndex = nextMarkIndex;
      }
    }
    
  } catch (error) {
    console.error('解析行内格式时出错:', error);
    textRuns.push(new TextRun({
      text: text,
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

// 改进的Markdown到Word元素解析函数
const parseMarkdownToWordElements = (text, styleConfig) => {
  const elements = [];
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    return elements;
  }
  
  try {
    // 处理标题
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
        spacing: headingStyle.spacing
      };

      // 为H2添加下划线
      if (level === 2 && headingStyle.border) {
        paragraphOptions.border = {
          bottom: {
            color: headingStyle.border.bottom.color,
            space: 1,
            value: 'single',
            size: headingStyle.border.bottom.size
          }
        };
        paragraphOptions.spacing.after = (paragraphOptions.spacing.after || 0) + 120;
      }
      
      elements.push(new Paragraph({
        ...paragraphOptions,
        children: [new TextRun({
          text: headingText,
          size: headingStyle.fontSize,
          font: styleConfig.baseFont,
          bold: headingStyle.bold,
          color: headingStyle.color
        })]
      }));
      
      console.log(`处理${level}级标题: ${headingText}`);
      return elements;
    }
    
    // 处理分割线
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
    
    // 处理列表项
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
    
    // 处理普通段落（包含行内格式）
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
          text: text,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont
        })
      ]
    }));
  }
  
  return elements;
};

// 获取对齐类型
const getAlignmentType = (alignment) => {
  switch (alignment) {
    case 'center':
    case 'solocenter':
      return AlignmentType.CENTER;
    case 'right':
    case 'soloright':
      return AlignmentType.RIGHT;
    case 'left':
    case 'sololeft':
    default:
      return AlignmentType.LEFT;
  }
};

// 改进的Word内容生成函数
const generateWordContent = (blocks, config) => {
  const children = [];
  
  for (const block of blocks) {
    try {
      switch (block.type) {
        case 'row':
          // 左右分栏布局
          const leftText = block.left || '';
          const rightText = block.right || '';
          
          if (leftText || rightText) {
            const leftRuns = leftText ? parseInlineFormatting(leftText, config) : [];
            const rightRuns = rightText ? parseInlineFormatting(rightText, config) : [];
            
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
          break;
          
        case 'left':
        case 'right':
        case 'center':
        case 'sololeft':
        case 'solocenter':
        case 'soloright':
          if (block.hasNested) {
            // 嵌套块，递归处理
            const nestedChildren = generateWordContent(block.content, config);
            children.push(...nestedChildren);
          } else {
            const content = block.content || '';
            if (content) {
              // 确保内容是数组形式
              const contentArray = Array.isArray(content) ? content : [content];
              
              for (const contentLine of contentArray) {
                if (typeof contentLine === 'string' && contentLine.trim()) {
                  // 使用统一的Markdown解析函数
                  const parsedElements = parseMarkdownToWordElements(contentLine, config);
                  
                  // 为每个元素设置对齐方式
                  parsedElements.forEach(element => {
                    if (element.options) {
                      element.options.alignment = getAlignmentType(block.type);
                    } else {
                      element.options = { alignment: getAlignmentType(block.type) };
                    }
                  });
                  
                  children.push(...parsedElements);
                }
              }
            }
          }
          break;
          
        case 'normal':
          const text = block.content || '';
          if (text && typeof text === 'string' && text.trim()) {
            const parsedContent = parseMarkdownToWordElements(text, config);
            children.push(...parsedContent);
          }
          break;
          
        default:
          console.warn('未知的块类型:', block.type);
          if (block.content) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(block.content),
                    size: config.paragraph.fontSize,
                    font: config.baseFont
                  })
                ]
              })
            );
          }
      }
    } catch (blockError) {
      console.error('处理Word块时出错:', blockError, block);
      // 添加错误处理段落
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[渲染错误: ${block?.type || '未知类型'} - ${String(block?.content || '').substring(0, 50)}...]`,
              size: config.paragraph.fontSize,
              font: config.baseFont,
              color: 'FF0000'
            })
          ]
        })
      );
    }
  }
  
  return children;
};

// 生成Word文档
export const generateWordDocument = async (content, config, resumeData) => {
  if (!content) throw new Error('无内容可生成Word文档');
  console.log('开始生成Word文档...');
  console.log('原始内容长度:', content.length);
  console.log('内容片段:', content.substring(0, 200));

  try {
    const blocks = parseCustomBlocks(content);
    console.log('解析到的块数:', blocks.length);
    console.log('前几个块的内容:', blocks.slice(0, 3));
    
    const styleConfig = generateWordStyleConfig(config);
    
    // 确保使用与预览区相同的字体配置
    styleConfig.baseFont = config.font || styleConfig.baseFont;
    styleConfig.baseFontSize = config.fontSize || styleConfig.baseFontSize;
    styleConfig.lineHeight = config.lineHeight || styleConfig.lineHeight;
    
    console.log('Word样式配置:', {
      baseFont: styleConfig.baseFont,
      baseFontSize: styleConfig.baseFontSize,
      h1FontSize: styleConfig.h1.fontSize,
      h2FontSize: styleConfig.h2.fontSize
    });
    
    const wordContent = generateWordContent(blocks, styleConfig);
    console.log('生成的Word内容元素数:', wordContent.length);
    
    const doc = new Document({
      sections: [{
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
        children: wordContent
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${resumeData?.user_name || 'resume'}_简历_Word版.docx`;
    saveAs(blob, fileName);
    
    console.log('✅ Word文档生成成功');
  } catch (error) {
    console.error('生成Word文档失败:', error);
    console.error('错误堆栈:', error.stack);
    throw new Error(`生成Word文档失败: ${error.message}`);
  }
};

// 生成Word内容（用于分页）
export const generateWordContentForPage = async (pageBlocks, styleConfig, isLastPage, isFirstPage) => {
  const children = [];
  
  // 如果不是第一页，添加分页符
  if (!isFirstPage) {
    children.push(new PageBreak());
  }
  
  for (const block of pageBlocks) {
    switch (block.type) {
      case 'heading':
        children.push(
          new Paragraph({
            text: block.content,
            heading: block.level === 1 ? HeadingLevel.HEADING_1 : 
                    block.level === 2 ? HeadingLevel.HEADING_2 : 
                    HeadingLevel.HEADING_3,
            alignment: getAlignmentType(block.alignment)
          })
        );
        break;
        
      case 'paragraph':
        children.push(
          new Paragraph({
            children: parseMarkdownToWordElements(block.content, styleConfig),
            alignment: getAlignmentType(block.alignment)
          })
        );
        break;
        
      case 'list':
        for (const item of block.items) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '• ',
                  bold: true
                }),
                ...parseMarkdownToWordElements(item, styleConfig)
              ],
              alignment: getAlignmentType(block.alignment)
            })
          );
        }
        break;
        
      case 'bold':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.content,
                bold: true,
                size: styleConfig.paragraph.fontSize
              })
            ],
            alignment: getAlignmentType(block.alignment)
          })
        );
        break;
        
      default:
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.content || '',
                size: styleConfig.paragraph.fontSize
              })
            ],
            alignment: getAlignmentType(block.alignment)
          })
        );
    }
  }
  
  return children;
};