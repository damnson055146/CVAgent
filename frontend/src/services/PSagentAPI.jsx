import { API_BASE_URL, API_ENDPOINTS, API_KEY } from '../config/api.config';

// 通用请求头
const getHeaders = () => ({
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json',
});

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
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PS.BRAINSTORM}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
        cv_content: params.cvContent || '',
        manual_info: params.manualInfo || {},
        prompt_template: params.promptTemplate || '',
        model: params.model || getDefaultModel(),
        selected_text: params.selectedText || ''
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
export const getCVLatestVersion = async (cvId) => {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CV.GET_VERSION}${cvId}/content`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: getUserId(),
      }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error getting CV latest version:', error);
    throw error;
  }
};