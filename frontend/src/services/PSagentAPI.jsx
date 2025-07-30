
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4';

// 通用请求头
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

export const generatePersonalStatement = async (inputText) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/generate_statement/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text: inputText }),
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Error generating personal statement:', error);
    throw error;
  }
};