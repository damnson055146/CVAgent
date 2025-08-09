// 常量配置文件
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const PAGE_MARGIN_PX = 48;
export const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - (PAGE_MARGIN_PX * 2) - 400;

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// 默认配置
export const DEFAULT_CONFIG = {
  font: 'SimSun',
  fontSize: 12,
  lineHeight: 1.5
};

export const COMPACT_CONFIG = {
  font: 'SimSun',
  fontSize: 10.5,
  lineHeight: 1.3
};

// PDF样式配置
export const PDF_STYLE_CONFIG = {
  font: 'SimSun',
  fontSize: 12,
  lineHeight: 1.5,
  margin: 20,
  pageBreak: true
};

// 字体配置
export const FONT_CONFIG = {
  SimSun: {
    name: 'SimSun',
    fallback: 'serif'
  },
  MicrosoftYaHei: {
    name: 'Microsoft YaHei',
    fallback: 'sans-serif'
  },
  SimHei: {
    name: 'SimHei',
    fallback: 'sans-serif'
  }
};

// 对齐类型
export const ALIGNMENT_TYPES = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  SOLOLEFT: 'sololeft',
  SOLOCENTER: 'solocenter',
  SOLORIGHT: 'soloright'
};

// 块类型
export const BLOCK_TYPES = {
  HEADING: 'heading',
  PARAGRAPH: 'paragraph',
  LIST: 'list',
  ALIGNMENT: 'alignment',
  BOLD: 'bold'
};

// PDF生成类型
export const PDF_GENERATION_TYPES = {
  BASIC: 'basic',
  CHINESE: 'chinese',
  MSYH: 'msyh',
  SIMPLE: 'simple'
}; 