import { API_BASE_URL, API_ENDPOINTS, API_KEY } from '../config/api.config';

// 复用已有的请求头和响应处理
const getHeaders = () => ({
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json',
});

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

export const generateRec = async (inputText) => {
  try {
    // #todo: 接口&请求改动至后端新的端口名 - 需要添加user_id和model到请求体，格式为 { user_id, text, model }
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REC.GENERATE}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text: inputText }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error generating recommendation letter:', error);
    throw error;
    throw error;
  }
};