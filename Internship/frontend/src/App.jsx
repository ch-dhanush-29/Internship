import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MultiCamera from './pages/MultiCamera';
import Analytics from './pages/Analytics';
import SystemConfig from './pages/SystemConfig';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [camerasChangedCounter, setCamerasChangedCounter] = useState(0);

  const handleCamerasChanged = () => {
    setCamerasChangedCounter(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={`dash-${camerasChangedCounter}`} />;
      case 'multicamera':
        return <MultiCamera key={`multi-${camerasChangedCounter}`} />;
      case 'analytics':
        return <Analytics key={`analytics-${camerasChangedCounter}`} />;
      case 'config':
        return <SystemConfig onCamerasChanged={handleCamerasChanged} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-cyber-bg text-cyber-text overflow-hidden font-sans">
      
      {/* Interactive Collapsible Cyber Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Panel Content Window */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Animated Cyber Grid Scanning Overlay background */}
        <div className="absolute inset-0 cyber-grid-animate opacity-[0.15] pointer-events-none z-0" />
        
        {/* Scrollable Page Wrapper Container */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8 relative z-10 select-none">
          {renderContent()}
        </div>
      </main>
      
    </div>
  );
}

export default App;
