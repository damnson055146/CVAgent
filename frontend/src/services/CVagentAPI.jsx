// src/services/CVagentAPI.jsx

const API_BASE_URL = 'http://127.0.0.1:8700';  // 后端地址，根据实际环境调整

// 通用请求头
const getHeaders = () => ({
  'Content-Type': 'application/json',
});

// 带认证的请求头
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

// 统一响应处理
const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const agentAPI = {
  /**
   * 1. 上传 PDF 并解析 → JSON (/parse-resume/)
   * 
   */
  parsePDFResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/parse-resume/`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * 2. 上传简历文本并解析 → JSON (/parse-resume-text/)
   */
  parseTextResume: async (text) => {
    const res = await fetch(`${API_BASE_URL}/parse-resume-text/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  /**
   * 3. 生成 PDF 简历 → Blob (/generate-resume/)
   * 注意：后端暂未实现此端点
   */
  generateResumePDF: async (profileJson) => {
    throw new Error('PDF生成功能暂未实现');
  },

  
  /**
   * 5. 简历测评 → 文本 (/process_json_to_text/)
   *    直接传整个简历 JSON 对象
   */
  evaluateResume: async (resumeJson) => {
    const res = await fetch(`${API_BASE_URL}/evaluate-resume/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(resumeJson),
    });
    return handleResponse(res);
  },


  /**
   * 选区优化
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{rewritten_text: string}>}
   */
  optimizeSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}/optimize-text/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  /**
   * 选区扩写
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{expanded_text: string}>}
   */
  expandSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}/expand-text/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  /**
   * 选区缩句
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{contracted_text: string}>}
   */
  contractSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}/contract-text/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  /**
   * 自定义提示词修改选区
   * @param {string} text - 选中的文本内容
   * @param {string} prompt - 自定义提示词
   * @returns {Promise<{modified_text: string}>}
   */
  customPromptSelection: async (text, prompt) => {
    const res = await fetch(`${API_BASE_URL}/modified-text-prompt/`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ 
        text,
        prompt,
      }),
    });
    return handleResponse(res);
  },

  /**
   * 保存简历到数据库
   * @param {string} content - 简历内容
   * @returns {Promise<Object>}
   */
  saveResume: async (content) => {
    const formData = new FormData();
    formData.append('doc_type', 'resume');
    formData.append('title', '我的简历');
    formData.append('content', content);
    formData.append('content_format', 'markdown');

    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * 获取用户的简历列表
   * @returns {Promise<Array>}
   */
  getResumeList: async () => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/documents/resume`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  /**
   * 获取特定简历详情
   * @param {string} docId - 文档ID
   * @returns {Promise<Object>}
   */
  getResumeDetail: async (docId) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/documents/resume/${docId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  /**
   * 为简历添加新版本
   * @param {string} docId - 文档ID
   * @param {string} content - 新版本内容
   * @returns {Promise<Object>}
   */
  addResumeVersion: async (docId, content) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('content_format', 'markdown');

    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/documents/resume/${docId}/versions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(res);
  },
};

export default agentAPI;