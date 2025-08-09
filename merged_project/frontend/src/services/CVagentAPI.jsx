import { API_BASE_URL, API_ENDPOINTS, API_KEY } from '../config/api.config';

// 通用请求头
const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'api_key': API_KEY,
    'Content-Type': 'application/json',
  };
  
  // 如果有token，添加到Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加model和user_id到formData，格式为 { file, model, user_id }
    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'api_key': API_KEY,
      // 不手动设置 Content-Type，浏览器会自动添加 boundary
    };
    
    // 添加Authorization header
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.PARSE_PDF}`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * 2. 上传简历文本并解析 → JSON (/parse-resume-text/)
   */
  parseTextResume: async (text) => {
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id到请求体
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
    // #todo: 接口&请求改动至后端新的端口名 - 此接口在后端README中未找到，需要确认是否存在
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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, model, data: resumeJson }
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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, text, model }
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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, text, model }
    const res = await fetch(`${API_BASE_URL}/optimize-text/`, {
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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, text, model }
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
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, text, prompt, model }
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
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址需要修改为 /api/documents/resume/create，请求体格式正确
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.SAVE}`, {
      method: 'POST',
      headers: getHeaders(),
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
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址需要修改为 /api/versions/{doc_id}/content，需要添加user_id到请求体
    const res = await fetch(`${API_BASE_URL}/documents/resume/${docId}`, {
      method: 'GET',
      headers: getHeaders(),
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
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址需要修改为 /api/versions/{doc_id}/save，请求体格式需要修改为 { user_id, content_md, user_profile? }
    const formData = new FormData();
    formData.append('content', content);
    formData.append('content_format', 'markdown');

    const headers = {
      'api_key': API_KEY,
    };
    
    // 添加Authorization header
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/documents/resume/${docId}/versions`, {
      method: 'POST',
      headers: headers,
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
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址和请求体格式正确
    const res = await fetch(`${API_BASE_URL}/api/documents/resume/history`, {
      method: 'POST',
      headers: getHeaders(),
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
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址正确，但需要添加user_id到请求体，方法需要改为POST
    console.log('正在获取版本内容，版本ID:', versionId);
    console.log('请求URL:', `${API_BASE_URL}/api/versions/${versionId}/content`);
    console.log('请求头:', getHeaders());
    
    const res = await fetch(`${API_BASE_URL}/api/versions/${versionId}/content`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });
    
    console.log('响应状态:', res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API错误响应:', errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const result = await res.json();
    console.log('获取版本内容成功:', result);
    return result;
  },

  /**
   * 删除指定版本
   * @param {string} versionId - 版本ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>}
   */
  deleteResumeVersion: async (versionId, userId) => {
    // #todo: 接口&请求改动至后端新的端口名 - 接口地址和请求体格式正确
    console.log('正在删除版本，版本ID:', versionId, '用户ID:', userId);
    console.log('请求URL:', `${API_BASE_URL}/api/versions/${versionId}/delete`);
    console.log('请求头:', getHeaders());
    
    const res = await fetch(`${API_BASE_URL}/api/versions/${versionId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
      }),
    });
    
    console.log('删除响应状态:', res.status);
    
    // 删除成功返回204，没有响应体
    if (res.status === 204) {
      console.log('删除版本成功 (204)');
      return { success: true, message: 'Version deleted successfully' };
    }
    
    // 删除成功返回200，有响应体
    if (res.status === 200) {
      const result = await res.json();
      console.log('删除版本成功 (200):', result);
      return { success: true, ...result };
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('删除版本API错误响应:', errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    // 其他成功状态码
    console.log('删除版本成功 (其他状态码)');
    return { success: true };
  },
};

export default agentAPI;