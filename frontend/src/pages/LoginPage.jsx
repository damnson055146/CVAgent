import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Comcomponents/common/Button';

const TEST_USER = {
  username: "testuser",
  password: "testpassword"
};

const LoginPage = ({ setIsAuthenticated }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 本地测试账号判断
    if (
      credentials.username === TEST_USER.username &&
      credentials.password === TEST_USER.password
    ) {
      localStorage.setItem("access_token", "test-token");
      localStorage.setItem("user_id", "test-id");
      localStorage.setItem("userInfo", JSON.stringify({ 
        username: TEST_USER.username,
        email: "testuser@example.com"
      }));
      setIsAuthenticated(true);
      setLoading(false);
      navigate("/");
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8699/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || '登录失败');
        return;
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('userInfo', JSON.stringify({ 
        username: data.username, 
        email: data.email 
      }));
      
      // 登录成功，设置认证状态并跳转到主页
      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到CV Agent
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            享受属于AI时代的工作效率
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="用户名"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                没有账号？去注册
              </a>
            </div>
            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                忘记密码？
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage; 