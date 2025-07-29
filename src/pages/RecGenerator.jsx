import React, { useState } from 'react';
import { Send, FileText, Edit3, Loader2, ChevronUp } from 'lucide-react';
import { generateRec } from '../services/RecagentAPI';
import Button from '../Comcomponents/common/Button';
import ModelSelector from '../Comcomponents/common/ModelSelector';
import Styleswitch from '../Comcomponents/icons/Styleswitch';

const RecGenerator = () => {
    const [inputText, setInputText] = useState('');
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!inputText.trim()) {
            alert('请输入推荐信内容');
            return;
        }

        setIsLoading(true);
        try {
            const result = await generateRec(inputText);
            setGeneratedLetter(result);
        } catch (error) {
            console.error('Generation error:', error);
            alert('生成推荐信时出错，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const clearAll = () => {
        setInputText('');
        setGeneratedLetter(null);
    };

    const formatLetter = (letter) => {
        if (!letter || !letter.recommendation_letter) return '';
        
        const { header, date, recipient, salutation, body, closing } = letter.recommendation_letter;
        
        // 标题
        let formattedText = `Letter of Recommendation\n\n`;
        
        // header部分
        formattedText += `${header.institution}\n`;
        formattedText += `${header.department}\n`;
        formattedText += `${header.address}\n`;
        formattedText += `邮编 ${header.postal_code}，${header.country}\n`;
        formattedText += `电话：${header.phone}\n`;
        formattedText += `邮箱：${header.email}\n\n`;
        formattedText += `${date}\n\n`;
        
        // recipient部分
        formattedText += `${recipient.university}\n`;
        formattedText += `${recipient.address.replace(/, /g, '\n')}\n\n`;
        
        // salutation、body部分
        formattedText += `${salutation}\n\n`;
        formattedText += body.join('\n\n') + '\n\n';
        
        //closing部分
        formattedText += `${closing.sincerely}\n`;
        formattedText += `${closing.name}\n`;
        formattedText += `${closing.title}\n`;
        formattedText += `${closing.department}\n`;
        formattedText += `${closing.institution}\n`;
        formattedText += `电话：${closing.phone}\n`;
        formattedText += `邮箱：${closing.email}\n`;
        
        return formattedText;
    };

    const copyToClipboard = () => {
        if (!generatedLetter) return;
        const formattedText = formatLetter(generatedLetter);
        navigator.clipboard.writeText(formattedText)
            .then(() => alert('已复制到剪贴板'))
            .catch(() => alert('复制失败'));
    };

    const renderLetter = () => {
        if (!generatedLetter || !generatedLetter.recommendation_letter) return null;
        
        const formattedText = formatLetter(generatedLetter);
        
        return (
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {formattedText.split('\n').map((line, index) => (
                    <div key={index}>
                        {line}
                        {index < formattedText.split('\n').length - 1 && <br />}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
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
                        placeholder="请在此输入您的推荐信内容..."
                        className="w-full flex-1 p-4 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {/* 模型选择 */}
                    <ModelSelector />
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-gray-600 dark:text-gray-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">润色后的推荐信</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                <Loader2 className="animate-spin mb-4" size={40} />
                                <p>正在生成润色版本，请稍候...</p>
                            </div>
                        ) : generatedLetter ? (
                            renderLetter()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                <FileText size={60} className="mb-4" />
                                <p className="text-center">润色后的推荐信将在这里显示</p>
                                <p className="text-sm text-center mt-2">请在左侧输入原始内容并点击生成按钮</p>
                            </div>
                        )}
                    </div>

                    {generatedLetter && (
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

export default RecGenerator;