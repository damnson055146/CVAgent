// src/services/CVagentAPI.jsx

const API_BASE_URL = 'http://127.0.0.1:8699';  // 后端地址，根据实际环境调整
const API_KEY = '9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4'; // 后端测试用API密钥

// 通用请求头
const getHeaders = () => ({
  'X-API-Key': API_KEY,
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
      headers: {
        'X-API-Key': API_KEY,
        // 不手动设置 Content-Type，浏览器会自动添加 boundary
      },
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
   */
  generateResumePDF: async (profileJson) => {
    const res = await fetch(`${API_BASE_URL}/generate-resume/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(profileJson),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.blob();
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
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>}
   */
  saveResume: async (content, userId) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/api/documents/resume/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
        content_md: content,
      }),
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

  /**
   * 获取简历历史版本列表
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>}
   */
  getResumeHistory: async (userId) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/api/documents/resume/history`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
      }),
    });
    return handleResponse(res);
  },

  /**
   * 获取指定版本的完整内容
   * @param {string} versionId - 版本ID
   * @returns {Promise<Object>}
   */
  getResumeVersion: async (versionId) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/api/versions/${versionId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  /**
   * 删除指定版本
   * @param {string} versionId - 版本ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>}
   */
  deleteResumeVersion: async (versionId, userId) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE_URL}/api/versions/${versionId}/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
      }),
    });
    return handleResponse(res);
  },
};

export default agentAPI;