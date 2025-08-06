// 字体测试工具
import { getFontConfig, isFontStyleAvailable, getFontStyleFallback, getFontSizeMultiplier } from './fontConfig.js';

// 测试字体配置
export const testFontConfig = () => {
  console.log('=== 字体配置测试 ===');
  
  // 测试微软雅黑字体
  console.log('\n--- 微软雅黑字体测试 ---');
  const msyhConfig = getFontConfig('msyh');
  console.log('字体配置:', msyhConfig);
  
  console.log('normal 样式可用:', isFontStyleAvailable('msyh', 'normal'));
  console.log('bold 样式可用:', isFontStyleAvailable('msyh', 'bold'));
  console.log('italic 样式可用:', isFontStyleAvailable('msyh', 'italic'));
  
  console.log('bold 回退样式:', getFontStyleFallback('msyh', 'bold'));
  console.log('italic 回退样式:', getFontStyleFallback('msyh', 'italic'));
  
  console.log('bold 字号倍数:', getFontSizeMultiplier('msyh', 'bold'));
  console.log('italic 字号倍数:', getFontSizeMultiplier('msyh', 'italic'));
  
  // 测试 Helvetica 字体
  console.log('\n--- Helvetica 字体测试 ---');
  const helveticaConfig = getFontConfig('helvetica');
  console.log('字体配置:', helveticaConfig);
  
  console.log('normal 样式可用:', isFontStyleAvailable('helvetica', 'normal'));
  console.log('bold 样式可用:', isFontStyleAvailable('helvetica', 'bold'));
  console.log('italic 样式可用:', isFontStyleAvailable('helvetica', 'italic'));
  
  console.log('bold 回退样式:', getFontStyleFallback('helvetica', 'bold'));
  console.log('italic 回退样式:', getFontStyleFallback('helvetica', 'italic'));
  
  console.log('bold 字号倍数:', getFontSizeMultiplier('helvetica', 'bold'));
  console.log('italic 字号倍数:', getFontSizeMultiplier('helvetica', 'italic'));
  
  // 测试未知字体
  console.log('\n--- 未知字体测试 ---');
  const unknownConfig = getFontConfig('unknown-font');
  console.log('未知字体配置:', unknownConfig);
  
  console.log('normal 样式可用:', isFontStyleAvailable('unknown-font', 'normal'));
  console.log('bold 样式可用:', isFontStyleAvailable('unknown-font', 'bold'));
  
  console.log('bold 回退样式:', getFontStyleFallback('unknown-font', 'bold'));
  console.log('bold 字号倍数:', getFontSizeMultiplier('unknown-font', 'bold'));
};

// 在浏览器控制台中运行测试
if (typeof window !== 'undefined') {
  window.testFontConfig = testFontConfig;
  console.log('字体测试工具已加载，运行 window.testFontConfig() 进行测试');
} 