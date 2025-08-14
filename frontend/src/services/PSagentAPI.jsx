import { API_BASE_URL, API_ENDPOINTS, API_KEY } from '../config/api.config';

// 通用请求头
const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
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

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

export const generatePersonalStatement = async (inputText) => {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PS.GENERATE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text: inputText, 
        model: getDefaultModel() 
      }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error generating personal statement:', error);
    throw error;
  }
};

// 头脑风暴相关API
export const generateBrainstormQuestions = async (params) => {
  try {
    // 头脑风暴API是独立服务，使用完整URL
    const brainstormUrl = API_ENDPOINTS.PS.BRAINSTORM;
    const res = await fetch(brainstormUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
        cv_content: params.cvContent || '',
        manual_info: params.manualInfo || {},
        prompt_template: params.promptTemplate || '',
        model: params.model || getDefaultModel(),
        selected_text: params.selectedText || '',
        user_profile: params.userProfile || ''
      }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error generating brainstorm questions:', error);
    throw error;
  }
};

// 获取用户CV列表
export const getUserCVs = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_HISTORY}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error getting user CVs:', error);
    throw error;
  }
};

// 获取CV最新版本内容
export const getCVLatestVersion = async (docId) => {
  try {
    // 首先获取文档信息，找到最新版本ID
    const docRes = await fetch(`${API_BASE_URL}/api/documents/resume/history`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
    });
    const docList = await handleResponse(docRes);
    
    // 找到对应的文档
    const targetDoc = docList.find(doc => doc.id === docId);
    if (!targetDoc) {
      throw new Error('文档不存在');
    }
    
    // 如果有当前版本ID，获取版本内容
    if (targetDoc.current_version_id) {
      const versionRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${targetDoc.current_version_id}/content`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          user_id: getUserId(),
        }),
      });
      return handleResponse(versionRes);
    } else {
      throw new Error('文档没有可用版本');
    }
  } catch (error) {
    console.error('Error getting CV latest version:', error);
    throw error;
  }
};