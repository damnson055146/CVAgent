// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, PenTool, MessageSquare, CheckCircle, GraduationCap, Clock, Home, ChevronDown, ChevronUp, LogOut, User } from 'lucide-react';
import Foldicon from './icons/Foldicon'; // 确保路径正确
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config.js';

const Sidebar = ({ activeItem, onChange, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    // 初始主题从localStorage读取
    return localStorage.getItem('theme') || 'light';
  });
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(true); // 控制工具栏折叠状态
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // 获取用户信息
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const user = await response.json();
          setUserInfo(user);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const menuItems = [
    { icon: Home, label: '首页', color: 'black', id: -1 },

  ];

  const toolItems = [
    { icon: PenTool, label: '个人陈述', color: 'black', id: 0 },
    { icon: MessageSquare, label: '推荐信助手', color: 'black', id: 1 },
    { icon: FileText, label: '简历优化器', color: 'black', id: 2 },
  ];

  const collapsedToolItems = [
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

            {/* 工具栏标题 */}
            {!isCollapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                工具栏
              </div>
            )}

            {/* 工具项 */}
            {!isCollapsed && (
              <div className="space-y-1">
                {toolItems.map((item, idx) => (
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

                {/* 可折叠的工具项 */}
                <button
                  onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
                  className="w-full flex items-center p-3 rounded-lg transition-all duration-200 group relative justify-between text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    {isToolsCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">更多工具</span>
                  </div>
                </button>

                {!isToolsCollapsed && (
                  <div className="space-y-1 ml-6">
                    {collapsedToolItems.map((item, idx) => (
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
                )}
              </div>
            )}
          </div>
          {/* 历史记录区域 */}
          {!isCollapsed && (
            <div className="mt-6">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                历史记录栏
              </div>
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                {/* 历史记录内容将在这里添加 */}
              </div>
            </div>
          )}
        </div>
        {/* 底部用户区域 */}
        <div className="p-3 border-t border-gray-100">
          {userInfo && (
            <div className={`flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-200" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userInfo.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userInfo.email}
                  </p>
                </div>
              )}
            </div>
          )}
          {/* 登出按钮 */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 text-red-600 dark:text-red-400 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && (
              <span className="text-sm font-medium">登出</span>
            )}
          </button>
          {/* 夜间模式切换按钮 */}
          <div className="mt-2 flex justify-between">
            <span className="text-xs text-gray-500">主题</span>
            <button
              onClick={toggleTheme}
              className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
            >
              {theme === 'dark' ? '暗' : '亮'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;