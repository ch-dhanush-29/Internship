import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Grid3X3, 
  BarChart3, 
  Settings as SettingsIcon, 
  ShieldAlert, 
  BrainCircuit, 
  ChevronLeft, 
  ChevronRight,
  Video
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, color: 'text-cyber-cyan' },
    { id: 'multicamera', name: 'Multi-Camera', icon: Grid3X3, color: 'text-cyber-green' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-cyber-orange' },
    { id: 'config', name: 'System Config', icon: SettingsIcon, color: 'text-cyber-muted' },
  ];

  return (
    <div 
      className={`h-screen bg-cyber-dark/95 border-r border-cyber-border backdrop-blur-lg flex flex-col justify-between transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 bg-cyber-bg border border-cyber-border rounded-full p-1 text-cyber-cyan hover:border-cyber-cyan shadow-neon-cyan hover:scale-105 transition-all"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top Logo Panel */}
      <div>
        <div className={`p-6 border-b border-cyber-border/60 flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative flex items-center justify-center bg-cyber-cyan/10 p-2.5 rounded-lg border border-cyber-cyan/35 shadow-neon-cyan animate-pulse">
            <BrainCircuit className="text-cyber-cyan" size={24} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-white to-cyber-magenta">
                TRAFFIC VISION
              </span>
              <span className="text-[9px] font-orbitron tracking-widest text-cyber-cyan/80">AI COGNITIVE MONITOR</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan shadow-neon-cyan' 
                    : 'bg-transparent border-transparent text-cyber-muted hover:bg-cyber-dark hover:text-cyber-text hover:border-cyber-border/40'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className={`${isActive ? 'text-cyber-cyan' : 'group-hover:text-cyber-text transition-colors'}`} />
                {!collapsed && (
                  <span className="font-orbitron tracking-wide text-xs font-semibold">{item.name}</span>
                )}
                {/* Active Dot indicator */}
                {isActive && !collapsed && (
                  <span className="absolute right-3 w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User status / Admin panel indicator */}
      <div className={`p-4 border-t border-cyber-border/60 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="bg-cyber-bg/40 border border-cyber-border/40 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyber-magenta/25 border border-cyber-magenta/40 flex items-center justify-center font-bold font-orbitron text-cyber-magenta text-sm">
              AD
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-cyber-text">Admin Terminal</span>
              <span className="text-[10px] text-cyber-green font-orbitron flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping" />
                SECURE // CUDA ON
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-cyber-magenta/25 border border-cyber-magenta/40 flex items-center justify-center font-bold text-cyber-magenta text-sm">
            A
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
