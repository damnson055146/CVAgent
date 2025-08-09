// 中文字体加载器 - 用于jsPDF
import { jsPDF } from 'jspdf';
import { addSimheiFont, addMsyhFont } from './fontData.js';

// 字体数据 - 这里需要包含完整的字体base64数据
// 为了演示，我们创建一个加载函数
export const loadChineseFonts = async () => {
  try {
    // 方法1：尝试从字体文件加载
    const fontResponse = await fetch('/fonts/msyh.ttf');
    if (fontResponse.ok) {
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
      
      const callAddFont = function () {
        this.addFileToVFS('msyh-normal.ttf', fontBase64);
        this.addFont('msyh-normal.ttf', 'msyh', 'normal');
      };
      jsPDF.API.events.push(['addFonts', callAddFont]);
      console.log('✅ 微软雅黑字体加载成功');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ 字体文件加载失败:', error);
  }

  // 方法2：使用预编译的字体数据
  try {
    jsPDF.API.events.push(['addFonts', addSimheiFont]);
    jsPDF.API.events.push(['addFonts', addMsyhFont]);
    console.log('✅ 预编译字体加载成功');
    return true;
  } catch (error) {
    console.warn('⚠️ 预编译字体加载失败:', error);
  }

  // 方法3：备用方案 - 使用系统字体
  try {
    const callAddSystemFont = function () {
      const systemFonts = ['SimSun', 'Microsoft YaHei', 'SimHei'];
      for (const fontName of systemFonts) {
        try {
          this.addFont(fontName, fontName, 'normal');
          console.log(`✅ 系统字体 ${fontName} 添加成功`);
        } catch (e) {
          console.warn(`系统字体 ${fontName} 添加失败`);
        }
      }
    };
    jsPDF.API.events.push(['addFonts', callAddSystemFont]);
    return true;
  } catch (error) {
    console.warn('⚠️ 系统字体添加失败:', error);
  }

  return false;
};

// 获取可用的中文字体
export const getAvailableChineseFonts = () => {
  return ['msyh', 'simhei', 'SimSun', 'Microsoft YaHei', 'SimHei'];
};

// 设置PDF文档的中文字体
export const setChineseFont = (doc, fontName = 'msyh') => {
  try {
    doc.setFont(fontName, 'normal');
    console.log(`✅ 设置字体成功: ${fontName}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ 字体设置失败: ${fontName}`, error);
    return false;
  }
};

// 自动选择最佳中文字体
export const autoSetChineseFont = (doc) => {
  const fonts = getAvailableChineseFonts();
  
  for (const font of fonts) {
    if (setChineseFont(doc, font)) {
      return font;
    }
  }
  
  // 如果所有中文字体都失败，使用默认字体
  doc.setFont('helvetica', 'normal');
  console.log('⚠️ 使用默认字体 helvetica');
  return 'helvetica';
};

// 初始化字体加载
export const initChineseFonts = () => {
  loadChineseFonts().then(success => {
    if (success) {
      console.log('✅ 中文字体初始化完成');
    } else {
      console.warn('⚠️ 中文字体初始化失败');
    }
  });
}; 