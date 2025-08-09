// 黑体字体数据 - 用于jsPDF
// 注意：这里只包含字体的开头部分，实际使用时需要完整的字体数据

export const simheiFontData = 'AAEAAAAVA...'; // 这里需要完整的字体base64数据

// 添加字体到jsPDF的函数
export const addSimheiFont = () => {
  const callAddFont = function () {
    this.addFileToVFS('simhei-normal.ttf', simheiFontData);
    this.addFont('simhei-normal.ttf', 'simhei', 'normal');
  };
  return callAddFont;
};

// 使用示例：
// import { jsPDF } from 'jspdf';
// import { addSimheiFont } from './simheiFont.js';
// 
// jsPDF.API.events.push(['addFonts', addSimheiFont]);
// 
// const doc = new jsPDF();
// doc.setFont('simhei'); 