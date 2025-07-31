// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Comcomponents/Sidebar';
import CVPage from './pages/CVpage';
import PSGenerator from './pages/PSGenerator';
import RecGenerator from './pages/RecGenerator';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const App = () => {
  const [activeItem, setActiveItem] = useState(-1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await fetch('http://127.0.0.1:8699/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('http://127.0.0.1:8699/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 未认证用户的路由 */}
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* 已认证用户的路由 */
          <>
            <Route 
              path="/" 
              element={
                <div className="h-screen flex bg-gray-50">
                  {activeItem !== -1 && (
                    <Sidebar 
                      activeItem={activeItem} 
                      onChange={setActiveItem}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className={`${activeItem !== -1 ? 'flex-1' : 'w-full'}`}>
                    {activeItem === -1 ? (
                      <LandingPage onStartExplore={() => setActiveItem(2)} />
                    ) : activeItem === 2 ? (
                      <CVPage />
                    ) : activeItem === 0 ? (
                      <PSGenerator />
                    ) : activeItem === 1 ? (
                      <RecGenerator />
                    ) : (
                      <LandingPage onStartExplore={() => setActiveItem(2)} />
                    )}
                  </div>
                </div>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
};

export default App;
