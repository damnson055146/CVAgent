// src/App.jsx
import React from 'react';
import Sidebar from './Comcomponents/Sidebar';
import CVPage from './pages/CVPage';
import PSGenerator from './pages/PSGenerator';
import RecGenerator from './pages/RecGenerator';
import LandingPage from './pages/LandingPage';

const App = () => {
  const [activeItem, setActiveItem] = React.useState(-1); // -1 表示landing page

  let content = null;
  if (activeItem === -1) {
    content = <LandingPage onStartExplore={() => setActiveItem(2)} />;
  } else if (activeItem === 2) {
    content = <CVPage />;
  } else if (activeItem === 0) {
    content = <PSGenerator />;
  } else if (activeItem === 1) {
    content = <RecGenerator />;
  } else {
    content = <LandingPage onStartExplore={() => setActiveItem(2)} />;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {activeItem !== -1 && <Sidebar activeItem={activeItem} onChange={setActiveItem} />}
      <div className={`${activeItem !== -1 ? 'flex-1' : 'w-full'}`}>
        {content}
      </div>
    </div>
  );
};

export default App;
