// 字体配置文件
// 定义项目中可用的字体和样式

export const FONT_CONFIG = {
  // 微软雅黑字体配置
  msyh: {
    name: 'msyh',
    displayName: '微软雅黑',
    availableStyles: ['normal'], // 只有 normal 样式可用
    fallbackStyles: {
      bold: 'normal', // bold 样式回退到 normal
      italic: 'normal', // italic 样式回退到 normal
      bolditalic: 'normal' // bolditalic 样式回退到 normal
    },
    fontSizeMultiplier: {
      bold: 1.2, // bold 效果通过增大字号实现
      italic: 1.0, // italic 效果暂时不实现
      bolditalic: 1.2
    }
  },
  
  // 系统字体配置
  system: {
    helvetica: {
      name: 'helvetica',
      displayName: 'Helvetica',
      availableStyles: ['normal', 'bold', 'italic', 'bolditalic'],
      fallbackStyles: {},
      fontSizeMultiplier: {
        bold: 1.0,
        italic: 1.0,
        bolditalic: 1.0
      }
    },
    times: {
      name: 'times',
      displayName: 'Times New Roman',
      availableStyles: ['normal', 'bold', 'italic', 'bolditalic'],
      fallbackStyles: {},
      fontSizeMultiplier: {
        bold: 1.0,
        italic: 1.0,
        bolditalic: 1.0
      }
    }
  }
};

// 获取字体配置
export const getFontConfig = (fontName) => {
  // 检查是否是微软雅黑
  if (fontName === 'msyh' || fontName === 'Microsoft YaHei') {
    return FONT_CONFIG.msyh;
  }
  
  // 检查系统字体
  if (FONT_CONFIG.system[fontName]) {
    return FONT_CONFIG.system[fontName];
  }
  
  // 默认返回 helvetica 配置
  return FONT_CONFIG.system.helvetica;
};

// 检查字体样式是否可用
export const isFontStyleAvailable = (fontName, style) => {
  const config = getFontConfig(fontName);
  return config.availableStyles.includes(style);
};

// 获取字体样式的回退样式
export const getFontStyleFallback = (fontName, style) => {
  const config = getFontConfig(fontName);
  
  // 如果样式可用，直接返回
  if (config.availableStyles.includes(style)) {
    return style;
  }
  
  // 否则返回回退样式
  return config.fallbackStyles[style] || 'normal';
};

// 获取字体样式的字号倍数
export const getFontSizeMultiplier = (fontName, style) => {
  const config = getFontConfig(fontName);
  return config.fontSizeMultiplier[style] || 1.0;
};

// 安全设置字体样式
export const safeSetFont = (doc, fontName, style = 'normal') => {
  try {
    const config = getFontConfig(fontName);
    const actualStyle = getFontStyleFallback(fontName, style);
    const fontSizeMultiplier = getFontSizeMultiplier(fontName, style);
    
    // 设置字体
    doc.setFont(config.name, actualStyle);
    
    // 如果需要模拟效果，调整字号
    if (style !== actualStyle && fontSizeMultiplier !== 1.0) {
      const currentFontSize = doc.getFontSize();
      doc.setFontSize(currentFontSize * fontSizeMultiplier);
    }
    
    return true;
  } catch (error) {
    console.warn(`字体设置失败: ${fontName} ${style}`, error);
    // 回退到默认字体
    try {
      doc.setFont('helvetica', 'normal');
      return false;
    } catch (fallbackError) {
      console.error('回退字体也失败:', fallbackError);
      return false;
    }
  }
};

// 恢复字体设置
export const restoreFont = (doc, originalFontSize) => {
  try {
    doc.setFontSize(originalFontSize);
  } catch (error) {
    console.warn('恢复字体大小失败:', error);
  }
}; 