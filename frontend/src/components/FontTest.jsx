import React, { useState } from 'react';
import { testFontLoading, testMicrosoftYaHeiFont } from '../utils/fontUtils.js';
import { generatePdfWithMsyhFont, testFontInPdf } from '../utils/pdfGenerators.js';

const FontTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfTestResult, setPdfTestResult] = useState(null);

  const testFonts = async () => {
    setLoading(true);
    try {
      const result = await testFontLoading();
      setTestResult(result);
      console.log('字体测试结果:', result);
    } catch (error) {
      console.error('字体测试失败:', error);
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMicrosoftYaHei = async () => {
    setLoading(true);
    try {
      const result = await testMicrosoftYaHeiFont();
      setTestResult(result);
      console.log('微软雅黑字体测试结果:', result);
    } catch (error) {
      console.error('微软雅黑字体测试失败:', error);
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPdfFonts = async () => {
    setLoading(true);
    try {
      const result = await testFontInPdf();
      setTestResult(result);
      console.log('PDF字体测试结果:', result);
    } catch (error) {
      console.error('PDF字体测试失败:', error);
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPdfGeneration = async () => {
    setLoading(true);
    try {
      const testContent = `# 王田田  
## 基本信息

**电话：** 17891631521   
**邮箱：** 3065928860@qq.com    

## 教育背景

::: left
**上海大学**  
:::
::: right
2021/09 - 2025/06  
:::
- 专业：数字媒体技术（推免至上海大学计算机科学与技术）  
- 学位：工学学士  
- 毕业年份：2025  
- GPA：3.81/4.0  
- 语言成绩：CET-4/6  
- 详细信息：主修课程：计算机图形学，数字图像处理，数据结构，数据库原理，面向对象程序设计，计算机网络，操作系统，微机原理，游戏开发技术，虚拟现实和数字娱乐等`;

      await generatePdfWithMsyhFont(testContent, {
        font: 'MicrosoftYaHei',
        fontSize: 12,
        lineHeight: 1.5
      }, { user_name: '测试用户' });

      setPdfTestResult({ success: true, message: 'PDF生成成功！' });
    } catch (error) {
      console.error('PDF测试失败:', error);
      setPdfTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">字体测试工具</h1>
      
      {/* 字体测试 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">字体加载测试</h2>
        <div className="space-x-4">
          <button
            onClick={testFonts}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试字体加载'}
          </button>
          
          <button
            onClick={testMicrosoftYaHei}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试微软雅黑字体'}
          </button>
          
          <button
            onClick={testPdfFonts}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试PDF字体'}
          </button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-medium mb-2">测试结果:</h3>
            <div className="space-y-2">
              <p><strong>状态:</strong> {testResult.success ? '✅ 成功' : '❌ 失败'}</p>
              {testResult.project && testResult.project.length > 0 && (
                <div>
                  <p><strong>项目字体:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    {testResult.project.map(font => (
                      <li key={font.name}>{font.displayName} ({font.name})</li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.system && testResult.system.length > 0 && (
                <div>
                  <p><strong>系统字体:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    {testResult.system.map(font => (
                      <li key={font.name}>{font.displayName} ({font.name})</li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.error && (
                <p className="text-red-600"><strong>错误:</strong> {testResult.error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF生成测试 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">PDF生成测试</h2>
        <button
          onClick={testPdfGeneration}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '生成中...' : '测试PDF生成'}
        </button>
        
        {pdfTestResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-medium mb-2">PDF测试结果:</h3>
            <div className="space-y-2">
              <p><strong>状态:</strong> {pdfTestResult.success ? '✅ 成功' : '❌ 失败'}</p>
              {pdfTestResult.success && (
                <p className="text-green-600">{pdfTestResult.message}</p>
              )}
              {pdfTestResult.error && (
                <p className="text-red-600"><strong>错误:</strong> {pdfTestResult.error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 测试内容预览 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">测试内容预览</h2>
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-2">王田田</h3>
          <h4 className="text-md font-medium mb-2">基本信息</h4>
          <p><strong>电话：</strong> 17891631521</p>
          <p><strong>邮箱：</strong> 3065928860@qq.com</p>
          <h4 className="text-md font-medium mb-2">教育背景</h4>
          <div className="flex justify-between">
            <span><strong>上海大学</strong></span>
            <span>2021/09 - 2025/06</span>
          </div>
          <ul className="list-disc list-inside mt-2">
            <li>专业：数字媒体技术（推免至上海大学计算机科学与技术）</li>
            <li>学位：工学学士</li>
            <li>毕业年份：2025</li>
            <li>GPA：3.81/4.0</li>
            <li>语言成绩：CET-4/6</li>
          </ul>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">使用说明</h3>
        <ul className="text-sm space-y-1">
          <li>• 点击"测试字体加载"检查项目内字体是否可用</li>
          <li>• 点击"测试PDF生成"生成包含中文的PDF文件</li>
          <li>• 如果PDF生成成功且中文显示正常，说明字体配置正确</li>
          <li>• 如果出现问题，请检查浏览器控制台的详细错误信息</li>
        </ul>
      </div>
    </div>
  );
};

export default FontTest; 