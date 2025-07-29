// src/services/CVagentAPI.jsx

const API_BASE_URL = 'http://127.0.0.1:8699';  // 后端地址，根据实际环境调整
const API_KEY = '9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4'; // 待改

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
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  /**
   * 选区缩写
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{contracted_text: string}>}
   */
  contractSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}/contract-text/`, {
      method: 'POST',
      headers: getHeaders(),
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
      body: JSON.stringify({ 
        text,
        prompt,
      }),
    });
    return handleResponse(res);
  },

  /**
   * 保存简历到后端（创建新版本）
   * @param {Object} resumeData - 简历的结构化JSON数据，用于AI分析和数据处理
   * @param {string} content - Markdown格式的简历内容，用于展示和预览
   * @returns {Promise<Object>} 保存结果
   */
  saveResume: async (content) => {
    const res = await fetch(`${API_BASE_URL}/api/documents_save/resume`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
        content_md: content,     // Markdown格式文本，用于展示
        
      })
    });
    return handleResponse(res);
  },

  /**
   * 获取简历历史记录
   * @returns {Promise<Array>} 历史记录列表
   */
  getResumeHistory: async () => {
    const res = await fetch(`${API_BASE_URL}/api/documents/resume`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id')
      })
    });
    return handleResponse(res);
  },
};

export default agentAPI;