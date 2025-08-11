import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Edit3, Loader2, ChevronUp, RefreshCw, Brain } from 'lucide-react';
import Styleswitch from '../comcomponents/icons/Styleswitch';
import ModelSelector from '../comcomponents/common/ModelSelector';
import Button from '../comcomponents/common/Button';
import { generatePersonalStatement, generateBrainstormQuestions } from '../services/PSagentAPI';
import BrainstormPanel from '../CVcomponents/BrainstormPanel';
import BrainstormToolbar from '../CVcomponents/BrainstormToolbar';


const PSGenerator = () => {
    const [inputText, setInputText] = useState('');
    const [generatedStatement, setGeneratedStatement] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showRegenerateDropdown, setShowRegenerateDropdown] = useState(false);
    const [selectedRegenerateModel, setSelectedRegenerateModel] = useState('ChatGPT-4o');
    
    // 头脑风暴相关状态
    const [showBrainstormPanel, setShowBrainstormPanel] = useState(false);
    const [showBrainstormToolbar, setShowBrainstormToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState('');
    const [isBrainstormProcessing, setIsBrainstormProcessing] = useState(false);

    const handleGenerate = async () => {
        if (!inputText.trim()) {
            alert('请输入个人陈述内容');
            return;
        }

        setIsLoading(true);
        try {
            const result = await generatePersonalStatement(inputText);
            setGeneratedStatement(result);
        } catch (error) {
            console.error('Generation error:', error);
            alert('生成个人陈述时出错，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const clearAll = () => {
        setInputText('');
        setGeneratedStatement(null);
    };

    const handleRegenerate = async () => {
        if (!generatedStatement) {
            alert('请先生成个人陈述');
            return;
        }

        setIsRegenerating(true);
        try {
            const result = await generatePersonalStatement(inputText);
            setGeneratedStatement(result);
        } catch (error) {
            console.error('Regeneration error:', error);
            alert('重新生成个人陈述时出错，请重试');
        } finally {
            setIsRegenerating(false);
        }
    };

    const regenerateModels = [
        { id: 'gpt4o', name: 'ChatGPT-4o' },
        { id: 'claude35', name: 'Claude-3.5' },
        { id: 'gpt4', name: 'ChatGPT-4' },
        { id: 'claude3', name: 'Claude-3' }
    ];

    const regenerateDropdownRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (regenerateDropdownRef.current && !regenerateDropdownRef.current.contains(event.target)) {
                setShowRegenerateDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 处理文本选择事件
    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            setSelectedText(selection.toString());
            setToolbarPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
                arrowLeft: '50%'
            });
            setShowBrainstormToolbar(true);
        } else {
            setShowBrainstormToolbar(false);
        }
    };

    // 处理头脑风暴
    const handleBrainstorm = async (prompt) => {
        setIsBrainstormProcessing(true);
        try {
            const result = await generateBrainstormQuestions({
                cvContent: '',
                manualInfo: {},
                promptTemplate: prompt,
                selectedText: selectedText
            });
            
            // 将头脑风暴结果添加到输入文本
            const brainstormResult = `\n\n头脑风暴问题：\n${prompt}\n\n基于以上问题，请继续完善您的个人陈述：`;
            setInputText(prev => prev + brainstormResult);
            
            setShowBrainstormToolbar(false);
        } catch (error) {
            console.error('Brainstorm failed:', error);
            alert('头脑风暴失败，请重试');
        } finally {
            setIsBrainstormProcessing(false);
        }
    };

    // 处理头脑风暴面板应用问题
    const handleApplyBrainstormQuestions = (questions) => {
        setInputText(prev => prev + `\n\n头脑风暴问题：\n${questions}\n\n基于以上问题，请继续完善您的个人陈述：`);
    };

    const copyToClipboard = () => {
        if (!generatedStatement || !generatedStatement.个人陈述) return;

        const paragraphOrder = [
            '开头与自我介绍与申请目标',
            '科研经历',
            '课外与领导',
            '职业规划',
            '择校理由',
            '结尾'
        ];

        const fullText = paragraphOrder
            .map(key => generatedStatement.个人陈述[key])
            .filter(content => content)
            .join('\n\n');

        navigator.clipboard.writeText(fullText)
            .then(() => alert('已复制到剪贴板'))
            .catch(() => alert('复制失败'));
    };

    const renderPersonalStatement = () => {
        if (!generatedStatement || !generatedStatement.个人陈述) return null;

        const paragraphOrder = [
            '开头与自我介绍与申请目标',
            '科研经历',
            '课外与领导',
            '职业规划',
            '择校理由',
            '结尾'
        ];

        return (
            <div className="space-y-4">
                <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">个人陈述</h3>
                {paragraphOrder.map((key, index) => {
                    const content = generatedStatement.个人陈述[key];
                    if (!content) return null;

                    return (
                        <p
                            key={index}
                            className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm indent-8 mb-4"
                        >
                            {content}
                        </p>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex-1 flex flex-row gap-4 p-4">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Edit3 className="text-gray-600 dark:text-gray-400" size={24} />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">原始个人陈述</h2>
                            </div>
                            <ModelSelector />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="ghost"
                                size="sm"
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                                onClick={() => setShowBrainstormPanel(true)}
                            >
                                <Brain size={16} className="mr-1" />
                                头脑风暴
                            </Button>
                            
                            <Button
                                type="ghost"
                                size="sm"
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                                onClick={handleGenerate}
                                disabled={isLoading || !inputText.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-1" size={16} />
                                        生成中
                                    </>
                                ) : (
                                    "润色"
                                )}
                            </Button>
                            
                            <div className="relative" ref={regenerateDropdownRef}>
                                <Button
                                    type="ghost"
                                    size="sm"
                                    className="hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 flex items-center gap-1"
                                    onClick={() => setShowRegenerateDropdown(!showRegenerateDropdown)}
                                    disabled={!generatedStatement}
                                >
                                    <RefreshCw size={16} />
                                    重生成
                                    <ChevronUp size={14} className={`transition-transform ${showRegenerateDropdown ? 'rotate-180' : ''}`} />
                                </Button>
                                
                                {showRegenerateDropdown && (
                                    <div className="absolute top-full mt-1 right-0 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg z-20">
                                        <div className="py-1">
                                            {regenerateModels.map((model) => (
                                                <div
                                                    key={model.id}
                                                    className={`px-3 py-2 cursor-pointer transition-colors duration-150
                                                      hover:bg-gray-50 dark:hover:bg-gray-600
                                                      ${selectedRegenerateModel === model.name ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : ''}`}
                                                    onClick={() => {
                                                        setSelectedRegenerateModel(model.name);
                                                        setShowRegenerateDropdown(false);
                                                        handleRegenerate();
                                                    }}
                                                >
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <Button
                                type="ghost"
                                size="sm"
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                                onClick={clearAll}
                            >
                                清空
                            </Button>
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onMouseUp={handleTextSelection}
                        onKeyUp={handleTextSelection}
                        placeholder="请在此输入您的个人陈述内容..."
                        className="w-full flex-1 p-4 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-gray-600 dark:text-gray-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">润色后的个人陈述</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                <Loader2 className="animate-spin mb-4" size={40} />
                                <p>正在生成润色版本，请稍候...</p>
                            </div>
                        ) : generatedStatement ? (
                            renderPersonalStatement()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                <FileText size={60} className="mb-4" />
                                <p className="text-center">润色后的个人陈述将在这里显示</p>
                                <p className="text-sm text-center mt-2">请在左侧输入原始内容并点击生成按钮</p>
                            </div>
                        )}
                    </div>

                    {generatedStatement && (
                        <div className="mt-4">
                            <button
                                onClick={copyToClipboard}
                                className="w-full bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                            >
                                复制全文
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* 头脑风暴面板 */}
            {showBrainstormPanel && (
                <BrainstormPanel
                    onClose={() => setShowBrainstormPanel(false)}
                    onApplyQuestions={handleApplyBrainstormQuestions}
                />
            )}
            
            {/* 头脑风暴浮动工具栏 */}
            {showBrainstormToolbar && (
                <BrainstormToolbar
                    position={toolbarPosition}
                    selectedText={selectedText}
                    onBrainstorm={handleBrainstorm}
                    isProcessing={isBrainstormProcessing}
                    onClose={() => setShowBrainstormToolbar(false)}
                    onPositionChange={setToolbarPosition}
                />
            )}
        </div>
    );
};

export default PSGenerator;