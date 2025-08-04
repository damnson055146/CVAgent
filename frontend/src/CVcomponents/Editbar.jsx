// src/CVcomponents/Editbar.jsx
// 编辑栏组件，提供简历编辑相关功能，如字体设置、字号、行距设置、撤销/重做、样式切换等
import React, { useState } from 'react';
import Button from '../comcomponents/common/Button.jsx';
import { Undo2, Redo2 } from 'lucide-react';
import HistoryIcon from '../comcomponents/icons/Historyicon.jsx';
import HistoryPanel from '../CVcomponents/HistoryPanel.jsx';
import agentAPI from '../services/CVagentAPI.jsx';
import { createHistoryItem, saveHistoryItem } from '../utils/historyUtils.js';

const DEFAULT_CONFIG = { font: 'SimSun', fontSize: 12, lineHeight: 1.5 };
const COMPACT_CONFIG = { font: 'SimSun', fontSize: 10.5, lineHeight: 1.3 };

export default function Editbar({
  config,
  setConfig,
  content,
  handleAIAction,
  handleFullTextAI,
  isLoading,
  resumeData,
  onSavePDF,
  onSaveWord, // 确保这里有声明
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  setTheme,
  onRestoreHistory,
  previewRef // 新增：直接传递ref
}) {
  console.log('=== Editbar组件渲染 ===');
  console.log('onSaveWord prop:', onSaveWord);
  console.log('onSavePDF prop:', onSavePDF);
  console.log('content prop:', content);
  console.log('previewRef:', previewRef);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const themeOptions = [
    { key: 'style1', label: '样式1' },
    { key: 'style2', label: '样式2' },
  ];
  const currentThemeLabel = themeOptions.find(opt => opt.key === theme)?.label || '样式1';

  const handleSmartLayout = (type) => {
    if (type === 'compact') {
      setConfig(COMPACT_CONFIG);
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  };

  const handleThemeChange = (key) => {
    setTheme(key);
  };

  return (
    <div className="h-16 flex items-center gap-4 px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-w-fit overflow-x-visible">
      {/* 字体设置 */}
      <div className="relative flex-shrink-0">
        <select
          value={config.font}
          onChange={(e) => setConfig({ ...config, font: e.target.value })}
          className="appearance-none border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32 text-gray-700 dark:text-gray-200"
        >
          <option value="SimSun">宋体</option>
          <option value="Arial">Arial</option>
          <option value="KaiTi">楷体</option>
          <option value="Microsoft YaHei">微软雅黑</option>
          <option value="PingFang SC">苹方</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Helvetica">Helvetica</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>

      {/* 字号设置 */}
      <div className="relative flex-shrink-0">
        <select
          value={config.fontSize}
          onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
          className="appearance-none border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20 text-gray-700 dark:text-gray-200"
        >
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24].map(size => (
            <option key={size} value={size}>{size}pt</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>

      {/* 行距设置 */}
      <div className="relative flex-shrink-0">
        <select
          value={config.lineHeight}
          onChange={(e) => setConfig({ ...config, lineHeight: Number(e.target.value) })}
          className="appearance-none border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20 text-gray-700 dark:text-gray-200"
        >
          {[0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0].map(lineHeight => (
            <option key={lineHeight} value={lineHeight}>{lineHeight}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>

      {/* 撤销/重做按钮 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          type="ghost"
          size="sm"
          title="撤销 (Ctrl+Z)"
          aria-label="撤销"
          className="hover:bg-gray-200 disabled:opacity-50 w-8 h-8 flex items-center justify-center"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          type="ghost"
          size="sm"
          title="重做 (Ctrl+Y)"
          aria-label="重做"
          className="hover:bg-gray-200 disabled:opacity-50 w-8 h-8 flex items-center justify-center"
        >
          <Redo2 size={16} />
        </Button>
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>

      {/* 样式切换/分页按钮 */}
      <div className="relative flex-shrink-0">
        <select
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          className="appearance-none border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-24 text-gray-700 dark:text-gray-200"
        >
          {themeOptions.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      <Button
        onClick={() => handleSmartLayout('compact')}
        type="ghost"
        size="sm"
        className="hover:bg-gray-100 disabled:opacity-50 transition-colors whitespace-nowrap w-24"
        title="尝试通过调整字号和行距将内容压缩到一页"
      >
        智能单页
      </Button>
      <Button
        onClick={() => handleSmartLayout('default')}
        type="ghost"
        size="sm"
        className="hover:bg-gray-100 disabled:opacity-50 transition-colors whitespace-nowrap w-24"
      >
        默认布局
      </Button>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2 flex-shrink-0"></div>

      {/* 保存按钮组 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={async () => {
            try {
              // 获取用户ID
              const userId = localStorage.getItem('user_id');
              if (!userId) {
                alert('用户未登录，请先登录');
                return;
              }
              
              // 保存到后端并创建新版本
              const saveResult = await agentAPI.saveResume(content, userId);
              
              if (saveResult.id) {
                // 生成PDF
                onSavePDF();
                
                // 提示保存成功
                console.log('保存成功！简历已保存到后端');
                alert('保存成功！简历已保存到后端');
                
                // 如果历史记录面板是打开的，强制刷新
                if (showHistoryPanel) {
                  // 通过改变key来强制重新渲染HistoryPanel
                  setShowHistoryPanel(false);
                  setTimeout(() => setShowHistoryPanel(true), 100);
                }
              }
            } catch (error) {
              console.error('保存失败:', error);
              alert('保存失败，请重试');
            }
          }}
          disabled={!content}
          type="ghost"
          size="sm"
          className="whitespace-nowrap w-24"
        >
          保存简历
        </Button>
        
        {/* 新增：保存为Word按钮 */}
        <Button
          onClick={() => {
            if (!content) {
              alert('无内容可生成Word文档');
              return;
            }
            
            if (onSaveWord) {
              onSaveWord();
            } else {
              console.error('onSaveWord函数未定义');
              alert('Word生成器未就绪，请稍后重试');
            }
          }}
          disabled={!content}
          type="ghost"
          size="sm"
          className="whitespace-nowrap w-24 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
        >
          保存为Word
        </Button>
      </div>

      {/* 状态历史 */}
      <HistoryIcon 
        className="w-8 h-6" 
        title="历史记录" 
        onClick={() => setShowHistoryPanel(true)}
      />

      {/* 上拉菜单动画样式 */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.18s cubic-bezier(.4,0,.2,1); }
      `}</style>

      {/* 历史记录面板 */}
      <HistoryPanel
       className="w-8 h-6 text-gray-700 dark:text-white" 
        title="历史记录" 
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        onRestore={onRestoreHistory}
        key={showHistoryPanel ? 'open' : 'closed'} // 强制重新渲染
      />
    </div>
  );
}