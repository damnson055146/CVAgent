import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Edit3, Loader2, ChevronUp, RefreshCw } from 'lucide-react';
import { generateRec } from '../services/RecagentAPI';
import Button from '../comcomponents/common/Button';
import ModelSelector from '../comcomponents/common/ModelSelector';
import Styleswitch from '../comcomponents/icons/Styleswitch';

const RecGenerator = () => {
    const [inputText, setInputText] = useState('');
    const [generatedLetter, setGeneratedLetter] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showRegenerateDropdown, setShowRegenerateDropdown] = useState(false);
    const [selectedRegenerateModel, setSelectedRegenerateModel] = useState('ChatGPT-4o');
    
    // 信息栏状态
    const [selectedClient, setSelectedClient] = useState('周董');
    const [wordCount, setWordCount] = useState(250);
    const [recommenderName, setRecommenderName] = useState('杨俊, 经理人, 公司合伙人');
    const [recommenderEmail, setRecommenderEmail] = useState('yang@betamusic.com');
    const [customHighlights, setCustomHighlights] = useState('创造力和创新精神：周董的音乐风格独特,将多种音乐元素融合在一起,创造了广受欢迎的"周氏风格"。坚持与努力：周董从小就对音乐充满热情,并且在面对早期职业生涯的挑战时,始终坚持自己的音乐梦想。独立性和自主性：周董在音乐创作中拥有很强的独立性,通常自己作词作曲,并参与制作。他对自己的作品有很强的控制力,确保每一首歌都符合他的艺术标准。');

    const handleGenerate = async () => {
        if (!inputText.trim() && !customHighlights.trim()) {
            alert('请至少输入推荐信内容或定制亮点');
            return
        }

        setIsLoading(true);
        try {
            // 自动拼接所有字段信息
            const combinedContent = [
                `客户：${selectedClient}`,
                `推荐人：${recommenderName}`,
                `邮箱：${recommenderEmail}`,
                `定制亮点：${customHighlights}`,
                `原始推荐信内容：${inputText}`
            ].filter(item => item.split('：')[1]?.trim()).join('\n\n');

            // 传递拼接后的内容给API
            const result = await generateRec(combinedContent, {
                wordCount,
                originalText: inputText,
                customHighlights
            });
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

    const handleRegenerate = async () => {
        if (!generatedLetter) {
            alert('请先生成推荐信');
            return;
        }

        setIsRegenerating(true);
        try {
            // 自动拼接所有字段信息
            const combinedContent = [
                `客户：${selectedClient}`,
                `推荐人：${recommenderName}`,
                `邮箱：${recommenderEmail}`,
                `定制亮点：${customHighlights}`,
                `原始推荐信内容：${inputText}`
            ].filter(item => item.split('：')[1]?.trim()).join('\n\n');

            const result = await generateRec(combinedContent, {
                wordCount,
                originalText: inputText,
                customHighlights
            });
            setGeneratedLetter(result);
        } catch (error) {
            console.error('Regeneration error:', error);
            alert('重新生成推荐信时出错，请重试');
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
                                       <div className="flex items-center gap-4">
                                           <div className="flex items-center gap-2">
                                               <Edit3 className="text-gray-600 dark:text-gray-400" size={24} />
                                               <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">原始推荐信</h2>
                                           </div>
                                           <ModelSelector />
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
                                           
                                           <div className="relative" ref={regenerateDropdownRef}>
                                               <Button
                                                   type="ghost"
                                                   size="sm"
                                                   className="hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 flex items-center gap-1"
                                                   onClick={() => setShowRegenerateDropdown(!showRegenerateDropdown)}
                                                   disabled={!generatedLetter}
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
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="请在此输入您的推荐信内容..."
                        className="w-full flex-1 p-4 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                    />

                    {/* 信息栏 */}
                    <div className="mt-4 space-y-3">
                        {/* 客户选择 */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">客户:</span>
                            <input
                                type="text"
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="输入客户姓名"
                            />
                        </div>

                        {/* 推荐人信息 */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">推荐人:</span>
                            <input
                                type="text"
                                value={recommenderName}
                                onChange={(e) => setRecommenderName(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="姓名, 职位, 公司"
                            />
                        </div>

                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">邮箱:</span>
                            <input
                                type="email"
                                value={recommenderEmail}
                                onChange={(e) => setRecommenderEmail(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="推荐人邮箱"
                            />
                        </div>

                        {/* 定制亮点 */}
                        <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">定制亮点:</span>
                            <textarea
                                value={customHighlights}
                                onChange={(e) => setCustomHighlights(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                placeholder="输入定制亮点，描述客户的特点、成就、优势等"
                                rows="3"
                            />
                        </div>

                        {/* 字数控制与生成按钮 */}
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">字数:</span>
                            <input
                                type="range"
                                min="100"
                                max="500"
                                value={wordCount}
                                onChange={(e) => setWordCount(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">{wordCount}</span>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={isLoading || (!inputText.trim() && !customHighlights.trim())}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed text-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4" />
                                    <span>生成中...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>生成推荐信 AI</span>
                                </>
                            )}
                        </button>
                    </div>
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

// 添加滑块样式
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .dark .slider::-webkit-slider-thumb {
    background: #60a5fa;
  }
  
  .dark .slider::-moz-range-thumb {
    background: #60a5fa;
  }
`;

// 添加样式到页面
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = sliderStyles;
    document.head.appendChild(style);
}

export default RecGenerator;