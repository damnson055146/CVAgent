const DEV_BASE_URL = 'http://127.0.0.1:8699';
const PROD_BASE_URL = '/api'; // 生产环境使用Nginx代理
const NGINX_BASE_URL = '/api'; // Nginx反向代理路径

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
    GENERATE_PDF: '/generate-resume/',
    EVALUATE: '/evaluate-resume/',
    OPTIMIZE: '/optimize-text/',
    EXPAND: '/expand-text/',
    CONTRACT: '/contract-text/',
    CUSTOM_PROMPT: '/modified-text-prompt/',
    SAVE: '/api/documents/resume/save',
    GET_DETAIL: '/documents/resume/',
    ADD_VERSION: '/documents/resume/{id}/versions',
    GET_HISTORY: '/api/documents/resume/history',
    GET_VERSION: '/api/versions/',
  },
  PS: {
    GENERATE: '/generate_statement/'
  },
  REC: {
    GENERATE: '/generate_recommendation/'
  },
  DOCUMENTS: {
    SAVE: '/api/documents_save/',
    GET: '/api/documents/'
  }
};