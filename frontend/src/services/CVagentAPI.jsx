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

// 获取用户ID
const getUserId = () => {
  return localStorage.getItem('user_id');
};

// 获取默认模型
const getDefaultModel = () => {
  return 'deepseek-ai/DeepSeek-V3';
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
   */
  parsePDFResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', getDefaultModel());
    formData.append('user_id', getUserId());

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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.PARSE_TEXT}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text, 
        model: getDefaultModel() 
      }),
    });
    return handleResponse(res);
  },

  /**
   * 3. 生成 PDF 简历 → Blob (/generate-resume/)
   * 注意：此接口在后端README中未找到，需要确认是否存在
   */
  generateResumePDF: async (profileJson) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GENERATE_PDF}`, {
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
   * 5. 简历测评 → 文本 (/evaluate-resume/)
   *    直接传整个简历 JSON 对象
   */
  evaluateResume: async (resumeJson) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.EVALUATE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        model: getDefaultModel(), 
        data: resumeJson 
      }),
    });
    return handleResponse(res);
  },

  /**
   * 选区优化
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{rewritten_text: string}>}
   */
  optimizeSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.OPTIMIZE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text, 
        model: getDefaultModel() 
      }),
    });
    return handleResponse(res);
  },

  /**
   * 选区扩写
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{expanded_text: string}>}
   */
  expandSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.EXPAND}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text, 
        model: getDefaultModel() 
      }),
    });
    return handleResponse(res);
  },

  /**
   * 选区缩句
   * @param {string} text - 选中的文本内容
   * @returns {Promise<{contracted_text: string}>}
   */
  contractSelection: async (text) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.CONTRACT}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text, 
        model: getDefaultModel() 
      }),
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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.CUSTOM_PROMPT}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text, 
        prompt, 
        model: getDefaultModel() 
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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.SAVE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: userId,
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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_DETAIL}${docId}/content`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.ADD_VERSION}${docId}/save`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
        content_md: content,
      }),
    });
    return handleResponse(res);
  },

  /**
   * 获取简历历史版本列表
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>}
   */
  getResumeHistory: async (userId) => {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_HISTORY}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: userId,
      }),
    });
    return handleResponse(res);
  },

  /**
   * 获取指定文档的版本历史
   * @param {string} docId - 文档ID
   * @returns {Promise<Array>}
   */
  getDocumentVersions: async (docId) => {
    const res = await fetch(`${API_BASE_URL}/api/versions/${docId}/history`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
    });
    return handleResponse(res);
  },

  /**
   * 获取所有简历文档的版本历史
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>}
   */
  getAllResumeVersions: async (userId) => {
    try {
      // 第一步：获取用户的简历文档列表
      const documents = await agentAPI.getResumeHistory(userId);
      console.log('获取到的简历文档列表:', documents);
      
      // 第二步：获取每个文档的版本历史
      const allVersions = [];
      for (const doc of documents) {
        try {
          const versions = await agentAPI.getDocumentVersions(doc.id);
          console.log(`文档 ${doc.id} 的版本历史:`, versions);
          
          // 为每个版本添加文档信息
          const versionsWithDocInfo = versions.map(version => ({
            ...version,
            document_id: doc.id,
            document_title: doc.title || '未命名文档'
          }));
          
          allVersions.push(...versionsWithDocInfo);
        } catch (error) {
          console.error(`获取文档 ${doc.id} 的版本历史失败:`, error);
          // 继续处理其他文档
        }
      }
      
      console.log('所有版本历史:', allVersions);
      return allVersions;
    } catch (error) {
      console.error('获取所有简历版本失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定版本的完整内容
   * @param {string} versionId - 版本ID
   * @returns {Promise<Object>}
   */
  getResumeVersion: async (versionId) => {
    console.log('正在获取版本内容，版本ID:', versionId);
    console.log('请求URL:', `${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${versionId}/content`);
    console.log('请求头:', getHeaders());
    
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${versionId}/content`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
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
    console.log('正在删除版本，版本ID:', versionId, '用户ID:', userId);
    console.log('请求URL:', `${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${versionId}/delete`);
    console.log('请求头:', getHeaders());
    
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${versionId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
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