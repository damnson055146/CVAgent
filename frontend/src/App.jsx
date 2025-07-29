// src/App.jsx
import React from 'react';
import Sidebar from './Comcomponents/Sidebar';
import CVPage from './pages/CVPage';
import PSGenerator from './pages/PSGenerator';
import RecGenerator from './pages/RecGenerator';

const App = () => {
  const [activeItem, setActiveItem] = React.useState(2); // 先默认简历优化器

  let content = null;
  if (activeItem === 2) {
    content = <CVPage />;
  } else if (activeItem === 0) {
    content = <PSGenerator />;
  } else if (activeItem === 1) {
    content = <RecGenerator />;
  } else {
    content = null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar activeItem={activeItem} onChange={setActiveItem} />    {/* 左侧功能区 */}
      {content}
    </div>
  );
};

export default App;
