import React, { useState } from 'react';
import { Send, FileText, Edit3, Loader2 } from 'lucide-react';
import Styleswitch from '../comcomponents/icons/Styleswitch';
import ModelSelector from '../comcomponents/common/ModelSelector';
import { generatePersonalStatement } from '../services/PSagentAPI';
// Button
const Button = ({ children, type, size, className, onClick, disabled }) => {
  const baseClasses = "px-4 py-2 rounded font-medium transition-colors duration-200";
  const typeClasses = type === "ghost" ? "bg-transparent" : "bg-blue-500 text-white";
  const sizeClasses = size === "sm" ? "px-3 py-1 text-sm" : "";
  
  return (
    <button
      className={`${baseClasses} ${typeClasses} ${sizeClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};


const PSGenerator = () => {
    const [inputText, setInputText] = useState('');
    const [generatedStatement, setGeneratedStatement] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

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
                        <div className="flex items-center gap-2">
                            <Edit3 className="text-gray-600 dark:text-gray-400" size={24} />
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">原始个人陈述</h2>
                        </div>
                        <div className="flex gap-2">
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
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="请在此输入您的个人陈述内容..."
                        className="w-full flex-1 p-4 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    
                    {/* 模型选择 */}
                    <ModelSelector />
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
        </div>
    );
};

export default PSGenerator;