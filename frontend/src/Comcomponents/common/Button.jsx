import React from 'react';
// src/components/common/Button.jsx
// 通用按钮组件，支持不同类型、尺寸和加载状态
/**
 * 通用美观按钮组件
 * @param {string} type - 按钮类型 primary/secondary/ghost/danger
 * @param {string} size - 按钮尺寸 md/sm/lg
 * @param {boolean} disabled - 是否禁用
 * @param {boolean} loading - 是否加载中
 * @param {ReactNode} icon - 图标
 * @param {string} className - 额外class
 * @param {function} onClick - 点击事件
 * @param {ReactNode} children - 按钮内容
 */
const typeMap = {
  primary: 'bg-black text-white hover:bg-black-700 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  ghost: 'bg-transparent text-black-600 hover:bg-black-50 border border-black-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600',
  danger: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-700 dark:text-white dark:hover:bg-red-600',
  default: 'bg-gray-200 text-black hover:bg-black-300 border border-black-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600',
};
const sizeMap = {
  md: 'px-4 py-2 text-base',
  sm: 'px-3 py-1.5 text-sm',
  small: 'px-3 py-1.5 text-sm', // 添加small尺寸支持
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  type = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg font-medium shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed ${typeMap[type]} ${sizeMap[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
      )}
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </button>
  );
} 