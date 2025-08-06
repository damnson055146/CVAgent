import React, { useState, useEffect } from 'react';
import { 
  getAllAvailableFonts, 
  FONT_STATUS, 
  checkFontStatus, 
  RECOMMENDED_FONT_COMBINATIONS 
} from '../utils/fontUtils.js';

const FontManager = () => {
  const [fonts, setFonts] = useState({
    project: [],
    system: [],
    default: null
  });
  const [loading, setLoading] = useState(true);
  const [fontStatuses, setFontStatuses] = useState({});

  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    try {
      setLoading(true);
      const availableFonts = await getAllAvailableFonts();
      setFonts(availableFonts);
      
      // 检查项目字体的状态
      const statuses = {};
      for (const font of availableFonts.project) {
        statuses[font.name] = await checkFontStatus(font.file);
      }
      setFontStatuses(statuses);
    } catch (error) {
      console.error('加载字体信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case FONT_STATUS.SUCCESS:
        return 'text-green-600';
      case FONT_STATUS.FAILED:
        return 'text-red-600';
      case FONT_STATUS.NOT_AVAILABLE:
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case FONT_STATUS.SUCCESS:
        return '可用';
      case FONT_STATUS.FAILED:
        return '加载失败';
      case FONT_STATUS.NOT_AVAILABLE:
        return '文件不存在';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">正在加载字体信息...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">字体管理</h2>
      
      {/* 项目字体 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-blue-600">项目内字体文件</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.project.map((font) => (
            <div key={font.name} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{font.displayName}</h4>
                <span className={`text-sm px-2 py-1 rounded ${getStatusColor(fontStatuses[font.name])}`}>
                  {getStatusText(fontStatuses[font.name])}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">文件名: {font.name}</p>
              <p className="text-xs text-gray-500">路径: {font.file}</p>
            </div>
          ))}
          {fonts.project.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>暂无项目内字体文件</p>
              <p className="text-sm mt-2">请将字体文件放置在 public/fonts/ 目录下</p>
            </div>
          )}
        </div>
      </div>

      {/* 系统字体 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-green-600">系统字体</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.system.map((font) => (
            <div key={font.name} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{font.displayName}</h4>
                <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-600">
                  可用
                </span>
              </div>
              <p className="text-sm text-gray-600">字体名: {font.name}</p>
            </div>
          ))}
          {fonts.system.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>未检测到可用的系统字体</p>
            </div>
          )}
        </div>
      </div>

      {/* 默认字体 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-600">默认字体</h3>
        <div className="border rounded-lg p-4 bg-white shadow-sm max-w-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{fonts.default?.displayName}</h4>
            <span className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-600">
              默认
            </span>
          </div>
          <p className="text-sm text-gray-600">字体名: {fonts.default?.name}</p>
        </div>
      </div>

      {/* 推荐字体组合 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-purple-600">推荐字体组合</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RECOMMENDED_FONT_COMBINATIONS.map((combo) => (
            <div key={combo.name} className="border rounded-lg p-4 bg-white shadow-sm">
              <h4 className="font-medium mb-2">{combo.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{combo.description}</p>
              <div className="text-xs text-gray-500">
                <p>中文: {combo.chinese}</p>
                <p>英文: {combo.english}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={loadFonts}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          刷新字体信息
        </button>
        <button
          onClick={() => window.open('/fonts/', '_blank')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          打开字体目录
        </button>
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">使用说明</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 将字体文件（.ttf, .otf, .woff, .woff2）放置在 public/fonts/ 目录下</li>
          <li>• 系统会自动检测并加载可用的字体文件</li>
          <li>• 项目内字体优先级高于系统字体</li>
          <li>• 如果所有字体都不可用，将使用默认字体</li>
          <li>• 刷新页面后字体信息会自动更新</li>
        </ul>
      </div>
    </div>
  );
};

export default FontManager; 