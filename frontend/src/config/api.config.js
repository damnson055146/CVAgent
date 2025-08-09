const DEV_BASE_URL = 'http://127.0.0.1:8699';
const PROD_BASE_URL = 'https://api.cvagent.com'; // 生产环境地址

// 检查是否存在环境变量，否则使用默认值
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PROD_BASE_URL : DEV_BASE_URL);
export const API_KEY = import.meta.env.VITE_API_KEY || '9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me'
  },
  CV: {
    PARSE_PDF: '/parse-resume/',
    PARSE_TEXT: '/parse-resume-text/',
    // 注意：generate-resume接口在后端README中未找到，暂时保留但标记为待确认
    GENERATE_PDF: '/generate-resume/',
    EVALUATE: '/evaluate-resume/',
    OPTIMIZE: '/optimize-text/',
    EXPAND: '/expand-text/',
    CONTRACT: '/contract-text/',
    CUSTOM_PROMPT: '/modified-text-prompt/',
    // 修复：文档保存接口改为 /api/documents/resume/create
    SAVE: '/api/documents/resume/create',
    // 修复：文档详情接口改为 /api/versions/{doc_id}/content
    GET_DETAIL: '/api/versions/',
    // 修复：添加版本接口改为 /api/versions/{doc_id}/save
    ADD_VERSION: '/api/versions/',
    // 修复：获取历史接口改为 /api/documents/resume/history
    GET_HISTORY: '/api/documents/resume/history',
    // 修复：获取版本接口改为 /api/versions/{version_id}/content
    GET_VERSION: '/api/versions/',
  },
  PS: {
    // 修复：个人陈述生成接口改为 /generate-statement/
    GENERATE: '/generate-statement/'
  },
  REC: {
    // 修复：推荐信生成接口改为 /generate-recommendation/
    GENERATE: '/generate-recommendation/'
  },
  DOCUMENTS: {
    // 修复：文档保存接口改为 /api/documents/{doc_type}/create
    SAVE: '/api/documents/',
    // 修复：文档获取接口改为 /api/documents/{doc_type}/history
    GET: '/api/documents/'
  }
};