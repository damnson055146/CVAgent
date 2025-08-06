// 字体数据文件 - 用于jsPDF
// 注意：这里只包含示例数据，实际使用时需要完整的字体base64数据

// 黑体字体数据（示例）
export const simheiFontData = 'AAEAAAAVA...'; // 这里需要完整的字体base64数据

// 微软雅黑字体数据（示例）
export const msyhFontData = 'AAEAAAAVA...'; // 这里需要完整的字体base64数据

// 添加黑体字体到jsPDF
export const addSimheiFont = () => {
  const callAddFont = function () {
    this.addFileToVFS('simhei-normal.ttf', simheiFontData);
    this.addFont('simhei-normal.ttf', 'simhei', 'normal');
  };
  return callAddFont;
};

// 添加微软雅黑字体到jsPDF
export const addMsyhFont = () => {
  const callAddFont = function () {
    this.addFileToVFS('msyh-normal.ttf', msyhFontData);
    this.addFont('msyh-normal.ttf', 'msyh', 'normal');
  };
  return callAddFont;
};

// 使用示例：
/*
import { jsPDF } from 'jspdf';
import { addSimheiFont, addMsyhFont } from './fontData.js';

// 添加字体
jsPDF.API.events.push(['addFonts', addSimheiFont]);
jsPDF.API.events.push(['addFonts', addMsyhFont]);

// 创建PDF文档
const doc = new jsPDF();

// 使用黑体字体
doc.setFont('simhei');
doc.text('这是黑体字体', 10, 10);

// 使用微软雅黑字体
doc.setFont('msyh');
doc.text('这是微软雅黑字体', 10, 20);
*/ 