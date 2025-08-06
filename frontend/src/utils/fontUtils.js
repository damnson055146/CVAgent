// 字体管理工具

// 字体配置
export const FONT_CONFIG = {
  // 项目内字体文件（优先级最高）
  projectFonts: [
    { name: 'SourceHanSans', file: '/fonts/SourceHanSans.ttf', displayName: '思源黑体' },
    { name: 'MicrosoftYaHei', file: '/fonts/msyh.ttf', displayName: '微软雅黑' },
    { name: 'SimSun', file: '/fonts/SimSun.ttf', displayName: '宋体' },
    { name: 'SimHei', file: '/fonts/SimHei.ttf', displayName: '黑体' },
    { name: 'Arial', file: '/fonts/Arial.ttf', displayName: 'Arial' },
    { name: 'TimesNewRoman', file: '/fonts/TimesNewRoman.ttf', displayName: 'Times New Roman' }
  ],
  // 系统字体（备用）
  systemFonts: [
    { name: 'SimSun', displayName: '宋体' },
    { name: 'Microsoft YaHei', displayName: '微软雅黑' },
    { name: 'SimHei', displayName: '黑体' },
    { name: 'PingFang SC', displayName: '苹方' },
    { name: 'Hiragino Sans GB', displayName: '冬青黑体' }
  ],
  // 默认字体
  defaultFont: { name: 'helvetica', displayName: 'Helvetica' }
};

// 检测字体文件是否存在
export const checkFontFile = async (fontPath) => {
  try {
    const response = await fetch(fontPath);
    return response.ok;
  } catch (error) {
    console.warn(`字体文件检查失败: ${fontPath}`, error);
    return false;
  }
};

// 获取可用的项目字体
export const getAvailableProjectFonts = async () => {
  const availableFonts = [];
  
  for (const font of FONT_CONFIG.projectFonts) {
    const isAvailable = await checkFontFile(font.file);
    if (isAvailable) {
      availableFonts.push(font);
    }
  }
  
  return availableFonts;
};

// 检测系统字体是否可用
export const checkSystemFont = (fontName) => {
  try {
    // 创建一个测试canvas来检测字体
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置字体
    ctx.font = `12px "${fontName}"`;
    
    // 如果字体设置成功，返回true
    return ctx.font.includes(fontName);
  } catch (error) {
    return false;
  }
};

// 获取可用的系统字体
export const getAvailableSystemFonts = () => {
  return FONT_CONFIG.systemFonts.filter(font => checkSystemFont(font.name));
};

// 获取所有可用字体
export const getAllAvailableFonts = async () => {
  const projectFonts = await getAvailableProjectFonts();
  const systemFonts = getAvailableSystemFonts();
  
  return {
    project: projectFonts,
    system: systemFonts,
    default: FONT_CONFIG.defaultFont
  };
};

// 字体加载状态
export const FONT_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  FAILED: 'failed',
  NOT_AVAILABLE: 'not_available'
};

// 检查字体加载状态
export const checkFontStatus = async (fontPath) => {
  try {
    const response = await fetch(fontPath);
    if (response.ok) {
      return FONT_STATUS.SUCCESS;
    } else {
      return FONT_STATUS.NOT_AVAILABLE;
    }
  } catch (error) {
    return FONT_STATUS.FAILED;
  }
};

// 获取字体信息
export const getFontInfo = (fontName) => {
  // 查找项目字体
  const projectFont = FONT_CONFIG.projectFonts.find(f => f.name === fontName);
  if (projectFont) {
    return {
      ...projectFont,
      type: 'project',
      source: '项目内字体文件'
    };
  }
  
  // 查找系统字体
  const systemFont = FONT_CONFIG.systemFonts.find(f => f.name === fontName);
  if (systemFont) {
    return {
      ...systemFont,
      type: 'system',
      source: '系统字体'
    };
  }
  
  // 默认字体
  if (fontName === FONT_CONFIG.defaultFont.name) {
    return {
      ...FONT_CONFIG.defaultFont,
      type: 'default',
      source: '默认字体'
    };
  }
  
  return null;
};

// 推荐字体组合
export const RECOMMENDED_FONT_COMBINATIONS = [
  {
    name: '中文简历',
    chinese: 'SimSun',
    english: 'Times New Roman',
    description: '传统中文简历常用组合'
  },
  {
    name: '现代简历',
    chinese: 'Microsoft YaHei',
    english: 'Arial',
    description: '现代简洁风格'
  },
  {
    name: '专业简历',
    chinese: 'SimHei',
    english: 'Arial',
    description: '专业商务风格'
  }
];

// 测试字体加载功能
export const testFontLoading = async () => {
  console.log('=== 开始测试字体加载 ===');
  
  try {
    // 测试项目字体
    const projectFonts = await getAvailableProjectFonts();
    console.log('可用的项目字体:', projectFonts.map(f => f.displayName));
    
    // 测试系统字体
    const systemFonts = getAvailableSystemFonts();
    console.log('可用的系统字体:', systemFonts.map(f => f.displayName));
    
    // 测试特定字体文件
    const testFonts = [
      '/fonts/SourceHanSans.ttf',
      '/fonts/msyh.ttf'
    ];
    
    for (const fontPath of testFonts) {
      const status = await checkFontStatus(fontPath);
      console.log(`字体 ${fontPath}: ${status}`);
    }
    
    console.log('=== 字体加载测试完成 ===');
    return {
      project: projectFonts,
      system: systemFonts,
      success: projectFonts.length > 0 || systemFonts.length > 0
    };
  } catch (error) {
    console.error('字体加载测试失败:', error);
    return { success: false, error: error.message };
  }
};

// 微软雅黑字体加载函数
export const loadMicrosoftYaHeiFont = async () => {
  try {
    console.log('开始加载微软雅黑字体...');
    
    // 检查字体JS文件是否存在
    const fontResponse = await fetch('/fonts/msyh-normal.js');
    if (fontResponse.ok) {
      console.log('✅ 微软雅黑字体JS文件存在');
      return {
        success: true,
        method: 'js_file',
        message: '微软雅黑字体JS文件已找到'
      };
    } else {
      console.warn('❌ 微软雅黑字体JS文件不存在');
    }
    
    // 检查TTF文件是否存在
    const ttfResponse = await fetch('/fonts/msyh.ttf');
    if (ttfResponse.ok) {
      console.log('✅ 微软雅黑TTF文件存在');
      return {
        success: true,
        method: 'ttf_file',
        message: '微软雅黑TTF文件已找到'
      };
    } else {
      console.warn('❌ 微软雅黑TTF文件不存在');
    }
    
    // 检查系统字体
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '12px "Microsoft YaHei"';
    const systemFontWidth = ctx.measureText('测试').width;
    
    if (systemFontWidth > 0) {
      console.log('✅ 系统微软雅黑字体可用');
      return {
        success: true,
        method: 'system_font',
        message: '系统微软雅黑字体可用'
      };
    } else {
      console.warn('❌ 系统微软雅黑字体不可用');
    }
    
    return {
      success: false,
      method: 'none',
      message: '未找到可用的微软雅黑字体'
    };
    
  } catch (error) {
    console.error('字体加载检查失败:', error);
    return {
      success: false,
      method: 'error',
      message: `字体加载检查失败: ${error.message}`
    };
  }
};

// 测试微软雅黑字体加载
export const testMicrosoftYaHeiFont = async () => {
  const result = await loadMicrosoftYaHeiFont();
  console.log('微软雅黑字体测试结果:', result);
  return result;
};

export default {
  FONT_CONFIG,
  checkFontFile,
  getAvailableProjectFonts,
  checkSystemFont,
  getAvailableSystemFonts,
  getAllAvailableFonts,
  FONT_STATUS,
  checkFontStatus,
  getFontInfo,
  RECOMMENDED_FONT_COMBINATIONS,
  testFontLoading,
  loadMicrosoftYaHeiFont,
  testMicrosoftYaHeiFont
}; 