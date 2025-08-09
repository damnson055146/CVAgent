import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import Styleswitch from '../icons/Styleswitch.jsx';

const ModelSelector = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ChatGPT-4o');

  const models = [
    { id: 'gpt4o', name: 'ChatGPT-4o' },
    { id: 'claude35', name: 'Claude-3.5' },
    { id: 'gpt4', name: 'ChatGPT-4' },
    { id: 'claude3', name: 'Claude-3' }
  ];

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model.name);
    setIsExpanded(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={handleToggle}
        aria-label="选择模型"
      >
        <Styleswitch />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedModel}</span>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg z-20">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">选择模型</span>
            <ChevronUp size={16} className="text-gray-500 dark:text-gray-400" />
          </div>

          <div className="py-1">
            {models.map((model) => (
              <div
                key={model.id}
                className={`px-3 py-2 cursor-pointer transition-colors duration-150
                  hover:bg-gray-50 dark:hover:bg-gray-600
                  ${selectedModel === model.name ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleModelSelect(model);
                }}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{model.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
