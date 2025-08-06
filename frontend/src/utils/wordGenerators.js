// Word文档生成器 - 包含所有Word生成相关函数
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
    // 确保strong配置被正确传递
    strong: config.strong || baseStyleConfig.strong,
    
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

// 智能格式处理函数 - 处理格式优先级和嵌套
const processFormatWithPriority = (text, isHeading = false, headingLevel = 0) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  console.log(`智能格式处理: "${text}", 是否标题: ${isHeading}, 标题级别: ${headingLevel}`);

  // 如果是标题，移除所有行内格式标记，保持标题的粗体效果
  if (isHeading) {
    // 移除粗体标记，因为标题本身就是粗体
    let processedText = text.replace(/\*\*(.*?)\*\*/g, '$1');
    // 移除斜体标记，因为标题不支持斜体
    processedText = processedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1');
    // 移除代码标记
    processedText = processedText.replace(/`([^`]+?)`/g, '$1');
    
    console.log(`标题格式处理结果: "${processedText}"`);
    return processedText;
  }

  // 对于普通文本，正常处理所有格式
  return text;
};

// 智能字体样式选择函数 - 中文字符强制使用normal样式
const getFontStyleForText = (text, desiredStyle = 'normal') => {
  if (!text || typeof text !== 'string') {
    return desiredStyle;
  }
  
  // 检测是否包含中文字符
  const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
  
  if (hasChineseChars) {
    console.log('Word检测到中文字符，强制使用normal样式');
    return 'normal'; // 中文字符强制使用normal样式
  }
  
  return desiredStyle;
};

// 智能字体选择函数 - 确保中文字体使用msyh
const getFontForText = (text, baseFont = 'SimSun') => {
  if (!text || typeof text !== 'string') {
    return baseFont;
  }
  
  // 检测是否包含中文字符
  const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
  
  if (hasChineseChars) {
    console.log('Word检测到中文字符，使用msyh字体');
    return 'msyh';
  }
  
  return baseFont;
};

// 简化的行内格式解析函数 - 避免递归和性能问题
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
    
    // 使用简单的字符串分割方法，避免复杂的正则表达式
    let remainingText = text;
    let currentIndex = 0;
    
    while (remainingText.length > 0) {
      // 查找第一个格式标记
      const boldIndex = remainingText.indexOf('**');
      const italicIndex = remainingText.indexOf('*');
      const codeIndex = remainingText.indexOf('`');
      
      // 确定下一个要处理的格式
      let nextFormat = null;
      let nextIndex = -1;
      
      if (boldIndex !== -1 && (nextIndex === -1 || boldIndex < nextIndex)) {
        nextFormat = 'bold';
        nextIndex = boldIndex;
      }
      
      if (italicIndex !== -1 && italicIndex !== boldIndex && (nextIndex === -1 || italicIndex < nextIndex)) {
        nextFormat = 'italic';
        nextIndex = italicIndex;
      }
      
      if (codeIndex !== -1 && (nextIndex === -1 || codeIndex < nextIndex)) {
        nextFormat = 'code';
        nextIndex = codeIndex;
      }
      
      // 如果没有找到格式标记，添加剩余文本并退出
      if (nextFormat === null) {
        if (remainingText.trim()) {
          textRuns.push(new TextRun({
            text: remainingText,
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
        }
        break;
      }
      
      // 添加格式标记前的普通文本
      if (nextIndex > 0) {
        const plainText = remainingText.substring(0, nextIndex);
        if (plainText.trim()) {
          textRuns.push(new TextRun({
            text: plainText,
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
        }
      }
      
      // 处理格式标记
      if (nextFormat === 'bold') {
        const endIndex = remainingText.indexOf('**', nextIndex + 2);
        if (endIndex !== -1) {
          const content = remainingText.substring(nextIndex + 2, endIndex);
          const actualFont = getFontForText(content, styleConfig.baseFont);
          const actualBold = getFontStyleForText(content, true) === 'bold';
          
          textRuns.push(new TextRun({
            text: content,
            size: styleConfig.paragraph.fontSize,
            font: actualFont,
            bold: actualBold,
            color: styleConfig.strong?.color || '000000'
          }));
          console.log(`应用粗体格式: "${content}", 字体: ${actualFont}, 粗体: ${actualBold}, 颜色: ${styleConfig.strong?.color || '000000'}`);
          remainingText = remainingText.substring(endIndex + 2);
        } else {
          // 没有找到结束标记，作为普通文本处理
          console.log(`未找到粗体结束标记，将 "${remainingText.substring(nextIndex, nextIndex + 2)}" 作为普通文本处理`);
          textRuns.push(new TextRun({
            text: remainingText.substring(nextIndex, nextIndex + 2),
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
          remainingText = remainingText.substring(nextIndex + 2);
        }
      } else if (nextFormat === 'italic') {
        const endIndex = remainingText.indexOf('*', nextIndex + 1);
        if (endIndex !== -1 && endIndex !== nextIndex) {
          const content = remainingText.substring(nextIndex + 1, endIndex);
          const actualFont = getFontForText(content, styleConfig.baseFont);
          const actualItalic = getFontStyleForText(content, 'italic') === 'italic';
          
          textRuns.push(new TextRun({
            text: content,
            size: styleConfig.paragraph.fontSize,
            font: actualFont,
            italics: actualItalic
          }));
          console.log(`应用斜体格式: "${content}", 字体: ${actualFont}, 斜体: ${actualItalic}`);
          remainingText = remainingText.substring(endIndex + 1);
        } else {
          // 没有找到结束标记，作为普通文本处理
          console.log(`未找到斜体结束标记，将 "${remainingText.substring(nextIndex, nextIndex + 1)}" 作为普通文本处理`);
          textRuns.push(new TextRun({
            text: remainingText.substring(nextIndex, nextIndex + 1),
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
          remainingText = remainingText.substring(nextIndex + 1);
        }
      } else if (nextFormat === 'code') {
        const endIndex = remainingText.indexOf('`', nextIndex + 1);
        if (endIndex !== -1) {
          const content = remainingText.substring(nextIndex + 1, endIndex);
          const actualFont = getFontForText(content, 'Courier New');
          
          textRuns.push(new TextRun({
            text: content,
            size: styleConfig.paragraph.fontSize,
            font: actualFont,
            color: '666666'
          }));
          console.log(`应用代码格式: "${content}", 字体: ${actualFont}`);
          remainingText = remainingText.substring(endIndex + 1);
        } else {
          // 没有找到结束标记，作为普通文本处理
          textRuns.push(new TextRun({
            text: remainingText.substring(nextIndex, nextIndex + 1),
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont
          }));
          remainingText = remainingText.substring(nextIndex + 1);
        }
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
const parseMarkdownToWordElements = (text, styleConfig, alignment = null) => {
  const elements = [];
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    return elements;
  }
  
  try {
    console.log('解析文本:', text);
    
    // 处理标题 - 修复正则表达式，允许前面有空格
    const headingMatch = text.trim().match(/^(#+)\s*(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      
      console.log(`检测到${level}级标题: "${headingText}"`);
      
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
      
      if (alignment) {
        paragraphOptions.alignment = alignment;
      }
      
      const actualFont = getFontForText(processedHeadingText, styleConfig.baseFont);
      const actualBold = getFontStyleForText(processedHeadingText, headingStyle.bold ? 'bold' : 'normal') === 'bold';
      
      elements.push(new Paragraph({
        ...paragraphOptions,
        children: [new TextRun({
          text: processedHeadingText,
          size: headingStyle.fontSize,
          font: actualFont,
          bold: actualBold,
          color: headingStyle.color
        })]
      }));
      
      console.log(`处理${level}级标题: ${processedHeadingText}, 字体大小: ${headingStyle.fontSize}, 粗体: ${headingStyle.bold}`);
      return elements;
    }
    
    // 处理分割线
    if (text.trim() === '---' || text.trim() === '***') {
      const hrOptions = {
        spacing: styleConfig.hr.spacing,
        children: [
          new TextRun({
            text: '─'.repeat(50),
            size: styleConfig.paragraph.fontSize,
            font: styleConfig.baseFont,
            color: styleConfig.hr.color
          })
        ]
      };
      
      if (alignment) {
        hrOptions.alignment = alignment;
      }
      
      elements.push(new Paragraph(hrOptions));
      return elements;
    }
    
    // 处理列表项
    const listMatch = text.match(/^\s*[-*+]\s*(.+)$/);
    if (listMatch) {
      const listText = listMatch[1];
      const listTextRuns = parseInlineFormatting(listText, styleConfig);
      
      const listOptions = {
        bullet: {
          level: 0
        },
        spacing: styleConfig.list.spacing,
        indent: styleConfig.list.indent,
        children: listTextRuns
      };
      
      if (alignment) {
        listOptions.alignment = alignment;
      }
      
      elements.push(new Paragraph(listOptions));
      return elements;
    }
    
    // 处理普通段落（包含行内格式）
    const textRuns = parseInlineFormatting(text, styleConfig);
    
    const paragraphOptions = {
      spacing: styleConfig.paragraph.spacing,
      children: textRuns
    };
    
    if (alignment) {
      paragraphOptions.alignment = alignment;
    }
    
    elements.push(new Paragraph(paragraphOptions));
    
  } catch (error) {
    console.error('解析Markdown文本时出错:', error);
    const errorOptions = {
      spacing: styleConfig.paragraph.spacing,
      children: [
        new TextRun({
          text: text,
          size: styleConfig.paragraph.fontSize,
          font: styleConfig.baseFont
        })
      ]
    };
    
    if (alignment) {
      errorOptions.alignment = alignment;
    }
    
    elements.push(new Paragraph(errorOptions));
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
              // 处理内容，可能是字符串或数组
              let contentArray;
              if (Array.isArray(content)) {
                contentArray = content;
              } else if (typeof content === 'string') {
                contentArray = [content];
              } else {
                contentArray = [String(content)];
              }
              
              console.log(`处理${block.type}对齐块，内容数组:`, contentArray);
              
              for (const contentLine of contentArray) {
                if (typeof contentLine === 'string' && contentLine.trim()) {
                  console.log(`处理${block.type}对齐块的内容行:`, contentLine);
                  
                  // 使用统一的Markdown解析函数，直接传递对齐参数
                  const alignment = getAlignmentType(block.type);
                  const parsedElements = parseMarkdownToWordElements(contentLine, config, alignment);
                  console.log(`处理${block.type}对齐块，应用对齐方式:`, alignment);
                  
                  children.push(...parsedElements);
                }
              }
            }
          }
          break;
          
        case 'normal':
          const text = block.content || '';
          if (text && typeof text === 'string' && text.trim()) {
            // 检查是否有对齐属性
            const alignment = block.alignment ? getAlignmentType(block.alignment) : null;
            const parsedContent = parseMarkdownToWordElements(text, config, alignment);
            children.push(...parsedContent);
          }
          break;
          
        case 'heading':
          const headingText = block.content || '';
          const headingLevel = block.level || 1;
          
          if (headingText) {
            let headingStyle;
            if (headingLevel === 1) {
              headingStyle = config.h1;
            } else if (headingLevel === 2) {
              headingStyle = config.h2;
            } else {
              headingStyle = config.h3;
            }
            
            const paragraphOptions = {
              alignment: getAlignmentType(block.alignment || 'left'),
              spacing: headingStyle.spacing
            };

            // 为H2添加下划线
            if (headingLevel === 2 && headingStyle.border) {
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
            
            children.push(new Paragraph({
              ...paragraphOptions,
              children: [new TextRun({
                text: headingText,
                size: headingStyle.fontSize,
                font: config.baseFont,
                bold: headingStyle.bold,
                color: headingStyle.color
              })]
            }));
            
            console.log(`处理${headingLevel}级标题: ${headingText}, 字体大小: ${headingStyle.fontSize}, 粗体: ${headingStyle.bold}`);
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
      h2FontSize: styleConfig.h2.fontSize,
      strongColor: styleConfig.strong?.color
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