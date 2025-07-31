// src/pages/CVPage.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { convertJsonToMarkdown } from '../utils/resumeUtils.jsx';
import RenderPreview from '../CVcomponents/RenderPreview.jsx';
import UploadCV from '../CVcomponents/UploadCV.jsx';
import agentAPI from '../services/CVagentAPI.jsx';
import '../tailwind.css';
import Button from '../Comcomponents/common/Button.jsx';
import ResumeForm from '../CVcomponents/ResumeForm.jsx';
import PreviewEditor from '../CVcomponents/PreviewEditor.jsx';
import Editbar from '../CVcomponents/Editbar.jsx';
import { createHistoryItem, saveHistoryItem, AutoSaveManager } from '../utils/historyUtils.js';

const CVPage = () => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [resumeData, setResumeData] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [config, setConfig] = useState({ font: 'SimSun', fontSize: 12, lineHeight: 1.5 });
  const [showUploadCV, setShowUploadCV] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResumeForm, setShowResumeForm] = useState(false);
  const [theme, setTheme] = useState('style1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const previewRef = useRef();
  const autoSaveManagerRef = useRef();

  const handleUpload = (data) => {
    setResumeData(data);
    const markdownContent = convertJsonToMarkdown(data);
    setEditContent(markdownContent);
    setPreviewContent(markdownContent);
    setShowUploadCV(false);
    
    // 保存到历史记录
    const historyItem = createHistoryItem(markdownContent, config, data, 'upload');
    saveHistoryItem(historyItem);
    
    // 更新自动保存
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.update(markdownContent, config, data);
    }
  };

  const handleFormSubmit = (data) => {
    setResumeData(data);
    const markdownContent = convertJsonToMarkdown(data);
    setEditContent(markdownContent);
    setPreviewContent(markdownContent);
    setShowResumeForm(false);
    
    // 保存到历史记录
    const historyItem = createHistoryItem(markdownContent, config, data, 'form');
    saveHistoryItem(historyItem);
    
    // 更新自动保存
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.update(markdownContent, config, data);
    }
  };

  const addHistory = useCallback((content) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditContent(history[newIndex]);
      setPreviewContent(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditContent(history[newIndex]);
      setPreviewContent(history[newIndex]);
    }
  };

  useEffect(() => {
    if (editContent && (history.length === 0 || editContent !== history[historyIndex])) {
      addHistory(editContent);
    }
  }, [editContent]);

  const handleRender = (content) => {
    setEditContent(content);
    setPreviewContent(content);
    
    // 更新自动保存
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.update(content, config, resumeData);
    }
  };

  const handleAIAction = async (action) => {
    if (!editContent.trim()) {
      alert('请先输入内容');
      return;
    }
    setIsLoading(true);
    try {
      let result;
      switch (action) {
        case 'evaluate':
          if (!resumeData) {
            alert('请先上传或填写简历');
            return;
          }
          result = await agentAPI.evaluateResume(resumeData);
          alert(`简历测评结果：\n${result.processed_text}`);
          break;
        case 'polish':
          result = await agentAPI.optimizeSelection(editContent);
          setEditContent(result.rewritten_text);
          setPreviewContent(result.rewritten_text);
          // 保存AI操作到历史记录
          const polishHistoryItem = createHistoryItem(result.rewritten_text, config, resumeData, 'ai_polish');
          saveHistoryItem(polishHistoryItem);
          break;
        case 'expand':
          result = await agentAPI.expandSelection(editContent);
          setEditContent(result.expanded_text);
          setPreviewContent(result.expanded_text);
          // 保存AI操作到历史记录
          const expandHistoryItem = createHistoryItem(result.expanded_text, config, resumeData, 'ai_expand');
          saveHistoryItem(expandHistoryItem);
          break;
        case 'contract':
          result = await agentAPI.contractSelection(editContent);
          setEditContent(result.contracted_text);
          setPreviewContent(result.contracted_text);
          // 保存AI操作到历史记录
          const contractHistoryItem = createHistoryItem(result.contracted_text, config, resumeData, 'ai_contract');
          saveHistoryItem(contractHistoryItem);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('AI功能调用失败:', error);
      alert('AI功能调用失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePDF = useCallback(() => {
    try {
      if (previewRef.current?.generatePDF) {
        previewRef.current.generatePDF();
      } else {
        alert('PDF生成器未就绪，请稍后重试');
      }
    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    }
  }, []);

  // 处理历史记录恢复
  const handleRestoreHistory = useCallback((historyItem) => {
    console.log('收到历史记录恢复请求:', historyItem);
    
    if (historyItem && historyItem.content) {
      console.log('正在恢复内容，长度:', historyItem.content.length);
      
      // 恢复编辑内容
      setEditContent(historyItem.content);
      setPreviewContent(historyItem.content);
      
      // 恢复配置
      if (historyItem.config) {
        setConfig(historyItem.config);
      }
      
      // 恢复简历数据
      if (historyItem.resumeData) {
        setResumeData(historyItem.resumeData);
      }
      
      // 更新自动保存
      if (autoSaveManagerRef.current) {
        autoSaveManagerRef.current.update(historyItem.content, historyItem.config, historyItem.resumeData);
      }
      
      console.log('历史记录恢复完成');
    } else {
      console.error('历史记录恢复失败：无效的历史记录项');
      alert('历史记录恢复失败：无效的历史记录项');
    }
  }, []);

  // 自动保存回调
  const handleAutoSave = useCallback((historyItem) => {
    saveHistoryItem(historyItem);
  }, []);

  // 初始化自动保存管理器
  useEffect(() => {
    autoSaveManagerRef.current = new AutoSaveManager(handleAutoSave);
    
    // 页面关闭时保存
    const handleBeforeUnload = () => {
      if (autoSaveManagerRef.current) {
        autoSaveManagerRef.current.saveOnUnload();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (autoSaveManagerRef.current) {
        autoSaveManagerRef.current.stop();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleAutoSave]);

  // 当内容或配置变化时启动自动保存
  useEffect(() => {
    if (autoSaveManagerRef.current && editContent) {
      autoSaveManagerRef.current.start(editContent, config, resumeData);
    }
  }, [editContent, config, resumeData]);

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* 顶部导航栏 */}
      <header className="h-20 flex items-center px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 font-bold text-lg text-black-700 dark:text-white shadow-sm justify-between">
        <span>简历优化器</span>
        <div className="flex gap-3">
          <Button type="primary" size="sm" onClick={() => setShowUploadCV(true)}>上传简历</Button>
          <Button type="ghost" size="sm" onClick={() => setShowResumeForm(true)}>填写简历</Button>
        </div>
      </header>

      {/* 工具栏 */}
      <div className="relative z-10 border-b border-gray-200 bg-gray-50">
        <Editbar
          config={config}
          setConfig={setConfig}
          content={previewContent}
          handleAIAction={handleAIAction}
          handleFullTextAI={handleAIAction}
          isLoading={isLoading}
          resumeData={resumeData}
          onSavePDF={handleSavePDF}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          currentTheme={theme}
          setTheme={setTheme}
          onMenuStateChange={setIsMenuOpen}
          onRestoreHistory={handleRestoreHistory}
        />
      </div>

      {/* 编辑区 + 预览区 */}
      <div className="flex flex-1 overflow-hidden w-full" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="w-2/5 h-full border-r border-gray-200 dark:border-gray-700 bg-gray-900" style={{ backgroundColor: '#111827', minHeight: '100%' }}>
          <PreviewEditor content={editContent} onUpdate={handleRender} isLoading={isLoading} isMenuOpen={isMenuOpen} />
        </div>
        <div className="w-3/5 h-full overflow-auto bg-gray-50">
          <RenderPreview ref={previewRef} content={previewContent} config={config} resumeData={resumeData} theme={theme} setTheme={setTheme} />
        </div>
      </div>

      {/* 弹窗 */}
      {showUploadCV && <UploadCV onUpload={handleUpload} onClose={() => setShowUploadCV(false)} />}
      {showResumeForm && <ResumeForm onSubmit={handleFormSubmit} onClose={() => setShowResumeForm(false)} />}
    </div>
  );
};

export default CVPage;
