import { API_BASE_URL, API_ENDPOINTS, API_KEY } from '../config/api.config';

// 复用已有的请求头和响应处理
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

export const generateRec = async (inputText, options = {}) => {
  const {
    wordCount = 250,
    originalText = '',
    customHighlights = ''
  } = options;

  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REC.GENERATE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        user_id: getUserId(), 
        text: inputText, 
        model: getDefaultModel(),
        word_count: wordCount,
        original_text: originalText,
        custom_highlights: customHighlights
      }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error generating recommendation letter:', error);
    throw error;
  }
};