// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, PenTool, MessageSquare, CheckCircle, GraduationCap, Clock, Home } from 'lucide-react';
import Foldicon from './icons/Foldicon'; // 确保路径正确

const Sidebar = ({ activeItem, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    // 初始主题从localStorage读取
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const menuItems = [
    { icon: Home, label: '首页', color: 'black', id: -1 },
    { icon: PenTool, label: '个人陈述', color: 'black', id: 0 },
    { icon: MessageSquare, label: '推荐信助手', color: 'black', id: 1 },
    { icon: FileText, label: '简历优化器', color: 'black', id: 2 },
    { icon: CheckCircle, label: '文书审核', color: 'black', id: 3 },
    { icon: GraduationCap, label: '院校匹配', color: 'black', id: 4 },
    { icon: Clock, label: '申请进度', color: 'black', id: 5 },
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="h-full flex flex-col">
        {/* 顶部区域 */}
  <div className="p-4 border-b border-gray-100 flex items-center">
    {/* 左侧折叠图标 */}
    <div className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
      <Foldicon isCollapsed={isCollapsed} />
    </div>

    {/* 右侧留学助手（展开时才显示） */}
    {!isCollapsed && (
      <div className="ml-3 flex items-center space-x-2">
       
        <span className="font-semibold text-">留学助手</span>
      </div>
    )}
  </div>

          

        {/* 功能菜单 */}
        <div className="flex-1 p-3">
          <div className="space-y-1">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group relative ${isCollapsed ? 'justify-center' : 'justify-start space-x-3'} ${activeItem === item.id
                    ? 'bg-blue-50 dark:bg-gray-700 text-yellow-700 dark:text-yellow-300 shadow-sm'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
                  }`}
              >
                {/* 选中状态指示器 */}
                {activeItem === item.id && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gray-600 rounded-r-full" />
                )}

                <item.icon
                  className={`w-5 h-5 transition-colors duration-200 ${activeItem === item.id ? 'text-gray-600' : item.color
                    } ${isCollapsed ? '' : 'ml-2'}`}
                />

                {!isCollapsed && (
                  <span className="text-sm font-medium flex-1 text-left truncate">
                    {item.label}
                  </span>
                )}

                {/* 折叠状态下的悬停提示 */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-yellow-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 底部区域（可选） */}
        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs text-gray-600 dark:text-gray-200">U</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">用户</div>
                </div>
                {/* 主题切换器 */}
                <button
                  onClick={toggleTheme}
                  className="ml-2 px-2 py-1 rounded text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
                >
                  {theme === 'dark' ? '暗' : '亮'}
                </button>
              </div>
              
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;