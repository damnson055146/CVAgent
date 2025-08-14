import React, { useState, useEffect } from 'react';
import { Brain, FileText, Edit3, Loader2, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import Button from '../comcomponents/common/Button';
import ModelSelector from '../comcomponents/common/ModelSelector';
import { generateBrainstormQuestions, getUserCVs, getCVLatestVersion } from '../services/PSagentAPI';

const BrainstormPanel = ({ onClose, onApplyQuestions }) => {
  const [activeTab, setActiveTab] = useState('cv'); // 'cv' or 'manual'
  const [selectedCV, setSelectedCV] = useState(null);
  const [cvList, setCvList] = useState([]);
  const [cvContent, setCvContent] = useState('');
  const [manualInfo, setManualInfo] = useState({
    education: '',
    experience: '',
    research: '',
    target_program: '',
    target_school: '',
    career_goal: ''
  });
  const [promptTemplate, setPromptTemplate] = useState('');
  const [brainstormResults, setBrainstormResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCVs, setIsLoadingCVs] = useState(false);
  const [showCVDropdown, setShowCVDropdown] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // 默认提示词模板
  const defaultPromptTemplate = `基于以下信息，为留学个人陈述生成针对性的头脑风暴问题：

背景信息：
{cv_content}

目标信息：
{manual_info}

请从以下角度生成问题：
1. 背景与动机：关于申请动机、背景故事的问题
2. 能力与成就：关于技能、成就、领导力的问题  
3. 目标与规划：关于职业规划、学习目标的问题
4. 匹配度：关于与目标项目的匹配度问题
5. 挑战与成长：关于克服困难、个人成长的问题

每个类别生成3-5个具体、深入的问题，帮助申请人更好地思考和表达。`;

  useEffect(() => {
    loadCVList();
    setPromptTemplate(defaultPromptTemplate);
  }, []);

  const loadCVList = async () => {
    setIsLoadingCVs(true);
    try {
      const cvs = await getUserCVs();
      setCvList(cvs);
    } catch (error) {
      console.error('Failed to load CVs:', error);
    } finally {
      setIsLoadingCVs(false);
    }
  };

  const handleCVSelect = async (cv) => {
    setSelectedCV(cv);
    setShowCVDropdown(false);
    setIsLoading(true);
    
    try {
      const latestVersion = await getCVLatestVersion(cv.id);
      setCvContent(latestVersion.content || '');
    } catch (error) {
      console.error('Failed to load CV content:', error);
      setCvContent('无法加载CV内容');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBrainstorm = async () => {
    if (!cvContent && !Object.values(manualInfo).some(v => v.trim())) {
      alert('请选择CV或输入相关信息');
      return;
    }

    setIsLoading(true);
    try {
      const params = {
        cvContent: activeTab === 'cv' ? cvContent : '',
        manualInfo: activeTab === 'manual' ? manualInfo : {},
        promptTemplate: promptTemplate,
        model: 'deepseek-ai/DeepSeek-V3', // 可以根据ModelSelector调整
        userProfile: '' // 添加用户画像参数
      };

      const result = await generateBrainstormQuestions(params);
      setBrainstormResults(result);
    } catch (error) {
      console.error('Failed to generate brainstorm questions:', error);
      alert('生成头脑风暴问题失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyQuestions = () => {
    if (brainstormResults && onApplyQuestions) {
      const allQuestions = brainstormResults.questions.flatMap(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const questions = categoryObj[categoryName] || [];
        return questions.map(q => `• ${q.question}`);
      }).join('\n');
      onApplyQuestions(allQuestions);
      onClose();
    }
  };

  const copyToClipboard = () => {
    if (brainstormResults) {
      const text = brainstormResults.questions.map(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const questions = categoryObj[categoryName] || [];
        const categoryDisplayName = categoryName === 'academic' ? '学术背景' :
                                   categoryName === 'research' ? '研究经历' :
                                   categoryName === 'leadership' ? '领导力' :
                                   categoryName === 'personal' ? '个人特质' :
                                   categoryName === 'career' ? '职业规划' :
                                   categoryName === 'motivation' ? '申请动机' : categoryName;
        return `## ${categoryDisplayName}\n${questions.map(q => `• ${q.question}`).join('\n')}`;
      }).join('\n\n');
      
      navigator.clipboard.writeText(text)
        .then(() => alert('已复制到剪贴板'))
        .catch(() => alert('复制失败'));
    }
  };

  const renderCVSelector = () => (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择CV
        </label>
        <button
          onClick={() => setShowCVDropdown(!showCVDropdown)}
          className="w-full flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-left"
        >
          <span className="text-gray-900 dark:text-gray-100">
            {selectedCV ? `${selectedCV.title || '未命名CV'} (v${selectedCV.version_number})` : '请选择CV'}
          </span>
          {isLoadingCVs ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>
        
        {showCVDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {cvList.map((cv) => (
              <div
                key={cv.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                onClick={() => handleCVSelect(cv)}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {cv.title || '未命名CV'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  版本 {cv.version_number} • {new Date(cv.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cvContent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CV内容预览
          </label>
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 max-h-40 overflow-y-auto text-sm">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" size={16} />
                加载中...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {cvContent.substring(0, 500)}...
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderManualInput = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            教育背景
          </label>
          <textarea
            value={manualInfo.education}
            onChange={(e) => setManualInfo({...manualInfo, education: e.target.value})}
            placeholder="请输入您的教育背景..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            工作经验
          </label>
          <textarea
            value={manualInfo.experience}
            onChange={(e) => setManualInfo({...manualInfo, experience: e.target.value})}
            placeholder="请输入您的工作经验..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            研究经历
          </label>
          <textarea
            value={manualInfo.research}
            onChange={(e) => setManualInfo({...manualInfo, research: e.target.value})}
            placeholder="请输入您的研究经历..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            目标专业
          </label>
          <input
            type="text"
            value={manualInfo.target_program}
            onChange={(e) => setManualInfo({...manualInfo, target_program: e.target.value})}
            placeholder="请输入目标专业..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            目标学校
          </label>
          <input
            type="text"
            value={manualInfo.target_school}
            onChange={(e) => setManualInfo({...manualInfo, target_school: e.target.value})}
            placeholder="请输入目标学校..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            职业规划
          </label>
          <textarea
            value={manualInfo.career_goal}
            onChange={(e) => setManualInfo({...manualInfo, career_goal: e.target.value})}
            placeholder="请输入您的职业规划..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderPromptEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          提示词模板
        </label>
        <Button
          type="ghost"
          size="sm"
          onClick={() => setShowPromptEditor(!showPromptEditor)}
          className="text-xs"
        >
          {showPromptEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showPromptEditor ? '收起' : '编辑'}
        </Button>
      </div>
      
      {showPromptEditor && (
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder="请输入自定义提示词..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
          rows={8}
        />
      )}
      
      {!showPromptEditor && (
        <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 max-h-32 overflow-y-auto text-sm">
          <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {promptTemplate.substring(0, 200)}...
          </pre>
        </div>
      )}
    </div>
  );

  const renderBrainstormResults = () => {
    if (!brainstormResults) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            头脑风暴结果
          </h3>
          <div className="flex gap-2">
            <Button
              type="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-xs"
            >
              <Copy size={14} className="mr-1" />
              复制
            </Button>
            <Button
              type="primary"
              size="sm"
              onClick={handleApplyQuestions}
              className="text-xs"
            >
              应用到PS
            </Button>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {brainstormResults.questions.map((categoryObj, index) => {
            // 处理API返回的数据结构：每个categoryObj是一个对象，如{"academic": [...]}
            const categoryName = Object.keys(categoryObj)[0];
            const questions = categoryObj[categoryName] || [];
            
            return (
              <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {categoryName === 'academic' ? '学术背景' :
                   categoryName === 'research' ? '研究经历' :
                   categoryName === 'leadership' ? '领导力' :
                   categoryName === 'personal' ? '个人特质' :
                   categoryName === 'career' ? '职业规划' :
                   categoryName === 'motivation' ? '申请动机' : categoryName}
                </h4>
                <ul className="space-y-2">
                  {questions.map((questionObj, qIndex) => (
                    <li key={qIndex} className="text-sm text-gray-700 dark:text-gray-300">
                      • {questionObj.question}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Agent头脑风暴
            </h2>
          </div>
          <Button
            type="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('cv')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                选择CV
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Edit3 size={16} className="inline mr-2" />
                手动输入
              </button>
            </div>

            {/* Input Section */}
            <div className="space-y-4">
              {activeTab === 'cv' ? renderCVSelector() : renderManualInput()}
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择模型
              </label>
              <ModelSelector />
            </div>

            {/* Prompt Editor */}
            {renderPromptEditor()}

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                type="primary"
                onClick={handleGenerateBrainstorm}
                disabled={isLoading || (!cvContent && !Object.values(manualInfo).some(v => v.trim()))}
                className="px-8 py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    生成中...
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    生成头脑风暴问题
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {renderBrainstormResults()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrainstormPanel;
