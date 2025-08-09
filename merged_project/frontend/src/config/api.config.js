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
    GENERATE_PDF: '/generate-resume/',
    EVALUATE: '/evaluate-resume/',
    OPTIMIZE: '/optimize-text/',
    EXPAND: '/expand-text/',
    CONTRACT: '/contract-text/',
    CUSTOM_PROMPT: '/modified-text-prompt/',
    // #todo: 接口&请求改动至后端新的端口名 - 文档保存接口需要修改为 /api/documents/resume/create
    SAVE: '/api/documents/resume/save',
    // #todo: 接口&请求改动至后端新的端口名 - 文档详情接口需要修改为 /api/versions/{doc_id}/content
    GET_DETAIL: '/documents/resume/',
    // #todo: 接口&请求改动至后端新的端口名 - 添加版本接口需要修改为 /api/versions/{doc_id}/save
    ADD_VERSION: '/documents/resume/{id}/versions',
    // #todo: 接口&请求改动至后端新的端口名 - 获取历史接口需要修改为 /api/documents/resume/history
    GET_HISTORY: '/api/documents/resume/history',
    // #todo: 接口&请求改动至后端新的端口名 - 获取版本接口需要修改为 /api/versions/{version_id}/content
    GET_VERSION: '/api/versions/',
  },
  PS: {
    // #todo: 接口&请求改动至后端新的端口名 - 个人陈述生成接口需要修改为 /generate-statement/
    GENERATE: '/generate_statement/'
  },
  REC: {
    // #todo: 接口&请求改动至后端新的端口名 - 推荐信生成接口需要修改为 /generate-recommendation/
    GENERATE: '/generate_recommendation/'
  },
  DOCUMENTS: {
    // #todo: 接口&请求改动至后端新的端口名 - 文档保存接口需要修改为 /api/documents/{doc_type}/create
    SAVE: '/api/documents_save/',
    // #todo: 接口&请求改动至后端新的端口名 - 文档获取接口需要修改为 /api/documents/{doc_type}/history
    GET: '/api/documents/'
  }
};