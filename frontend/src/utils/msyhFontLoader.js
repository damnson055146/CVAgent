// 微软雅黑字体加载器 - 使用现有的msyh-normal.js文件
import { jsPDF } from 'jspdf';

// 动态加载msyh-normal.js文件
export const loadMsyhFont = async () => {
  try {
    // 使用fetch加载字体文件
    const response = await fetch('/fonts/msyh-normal.js');
    if (response.ok) {
      const fontText = await response.text();
      
      // 尝试多种格式提取字体数据
      let fontData = null;
      
      // 格式1: var font = 'base64data'
      const fontDataMatch1 = fontText.match(/var\s+font\s*=\s*['"`]([^'"`]+)['"`]/);
      if (fontDataMatch1) {
        fontData = fontDataMatch1[1];
        console.log('✅ 找到格式1字体数据');
      }
      
      // 格式2: export default 'base64data'
      if (!fontData) {
        const fontDataMatch2 = fontText.match(/export\s+default\s*['"`]([^'"`]+)['"`]/);
        if (fontDataMatch2) {
          fontData = fontDataMatch2[1];
          console.log('✅ 找到格式2字体数据');
        }
      }
      
      // 格式3: module.exports = 'base64data'
      if (!fontData) {
        const fontDataMatch3 = fontText.match(/module\.exports\s*=\s*['"`]([^'"`]+)['"`]/);
        if (fontDataMatch3) {
          fontData = fontDataMatch3[1];
          console.log('✅ 找到格式3字体数据');
        }
      }
      
      // 格式4: 直接查找base64数据（假设数据很长）
      if (!fontData) {
        const base64Match = fontText.match(/['"`]([A-Za-z0-9+/]{1000,}={0,2})['"`]/);
        if (base64Match) {
          fontData = base64Match[1];
          console.log('✅ 找到格式4字体数据（base64）');
        }
      }
      
      if (fontData) {
        const callAddFont = function () {
          this.addFileToVFS('msyh-normal.ttf', fontData);
          this.addFont('msyh-normal.ttf', 'msyh', 'normal');
        };
        jsPDF.API.events.push(['addFonts', callAddFont]);
        console.log('✅ 微软雅黑字体加载成功 (从msyh-normal.js)');
        return true;
      } else {
        console.warn('⚠️ 无法从msyh-normal.js中提取字体数据');
      }
    }
  } catch (error) {
    console.warn('⚠️ 从fetch加载字体失败:', error);
  }

  // 备用方案：尝试加载TTF文件
  try {
    const response = await fetch('/fonts/msyh.ttf');
    if (response.ok) {
      const fontArrayBuffer = await response.arrayBuffer();
      const fontData = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
      
      const callAddFont = function () {
        this.addFileToVFS('msyh-normal.ttf', fontData);
        this.addFont('msyh-normal.ttf', 'msyh', 'normal');
      };
      jsPDF.API.events.push(['addFonts', callAddFont]);
      console.log('✅ 微软雅黑字体加载成功 (从TTF文件)');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ 从TTF文件加载字体失败:', error);
  }

  // 备用方案：尝试加载其他可能的字体文件
  const possibleFontFiles = [
    '/fonts/sourcehan.ttf',
    '/fonts/SimSun.ttf',
    '/fonts/SimHei.ttf'
  ];
  
  for (const fontFile of possibleFontFiles) {
    try {
      const response = await fetch(fontFile);
      if (response.ok) {
        const fontArrayBuffer = await response.arrayBuffer();
        const fontData = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
        
        const callAddFont = function () {
          this.addFileToVFS('chinese-font.ttf', fontData);
          this.addFont('chinese-font.ttf', 'chinese', 'normal');
        };
        jsPDF.API.events.push(['addFonts', callAddFont]);
        console.log(`✅ 中文字体加载成功 (从${fontFile})`);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ 从${fontFile}加载字体失败:`, error);
    }
  }

  console.warn('⚠️ 所有字体加载方案都失败了，将使用默认字体');
  return false;
};

// 设置PDF文档使用微软雅黑字体
export const setMsyhFont = (doc) => {
  try {
    // 尝试设置msyh字体
    doc.setFont('msyh', 'normal');
    console.log('✅ 设置微软雅黑字体成功');
    return true;
  } catch (error) {
    console.warn('⚠️ 设置微软雅黑字体失败，尝试chinese字体:', error);
    try {
      doc.setFont('chinese', 'normal');
      console.log('✅ 设置中文字体成功');
      return true;
    } catch (error2) {
      console.warn('⚠️ 设置中文字体也失败，使用默认字体:', error2);
      return false;
    }
  }
};

// 初始化字体
export const initMsyhFont = () => {
  loadMsyhFont().then(success => {
    if (success) {
      console.log('✅ 微软雅黑字体初始化完成');
    } else {
      console.warn('⚠️ 微软雅黑字体初始化失败');
    }
  });
}; 