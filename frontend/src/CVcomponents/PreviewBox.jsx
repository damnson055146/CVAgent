import React from 'react';

const PreviewBox = ({ 
  selectedText, 
  aiPreview, 
  isVisible, 
  position, 
  onAdopt, 
  onCancel,
  isProcessing,
  processingType 
}) => {
  if (!isVisible || !selectedText) return null;

  return (
    <div
      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transform transition-all duration-200 z-[9998]"
      style={{
        left: `${position?.x || 0}px`,
        top: `${position?.y || 0}px`,
        width: '320px',
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? '0' : '10px'})`,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* 预览框头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            文本预览
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 原始文本 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            原始文本：
          </label>
          <div className="w-full max-h-24 overflow-y-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {selectedText}
          </div>
        </div>
      </div>

      {/* AI处理结果 */}
      {aiPreview && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              AI 修改结果：
            </label>
            <div className="w-full max-h-24 overflow-y-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {aiPreview}
            </div>
          </div>
        </div>
      )}

      {/* 处理状态 */}
      {isProcessing && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {processingType === 'optimize' && '正在优化...'}
              {processingType === 'expand' && '正在扩写...'}
              {processingType === 'contract' && '正在缩写...'}
              {processingType === 'custom' && '正在处理...'}
            </span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="p-3">
        <div className="flex justify-end space-x-2">
          {aiPreview && (
            <>
              <button
                onClick={onAdopt}
                className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                采用修改
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                取消
              </button>
            </>
          )}
          {!aiPreview && !isProcessing && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              关闭
            </button>
          )}
        </div>
      </div>

      {/* 小三角指示器 */}
      <div 
        className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"
        style={{
          bottom: '-4px',
          left: position?.arrowLeft || '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
};

export default PreviewBox; 