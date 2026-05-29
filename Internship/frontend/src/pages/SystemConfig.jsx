import React from 'react';
import CameraManager from '../components/CameraManager';
import { Settings, Cpu, HardDrive, ShieldAlert, Cpu as GpuIcon } from 'lucide-react';

const SystemConfig = ({ onCamerasChanged }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-cyber-border/40 pb-4">
        <h1 className="text-2xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-2">
          <Settings className="text-cyber-muted" size={24} />
          SYSTEM CONFIGURATION & HARDWARE
        </h1>
        <p className="text-xs text-cyber-muted font-sans mt-1.5">
          Configure cameras, manage uploaded video files, and monitor AI engine resource bindings.
        </p>
      </div>

      {/* Hardware Node Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* GPU Acceleration Diagnostic */}
        <div className="glass-panel border-cyber-green/30 shadow-neon-green p-4 flex items-center gap-4 bg-cyber-green/5">
          <div className="p-3 bg-cyber-green/20 border border-cyber-green/40 text-cyber-green rounded-lg">
            <GpuIcon size={20} />
          </div>
          <div>
            <span className="text-[9px] font-orbitron text-cyber-green font-bold block tracking-wider">GPU ACCELERATION ACTIVE</span>
            <span className="text-sm font-orbitron font-extrabold text-white">NVIDIA CUDA CORE CORES</span>
            <span className="text-[9px] text-cyber-muted block mt-0.5">Device: NVIDIA GPU binding (PyTorch default)</span>
          </div>
        </div>

        {/* AI Tracking Model */}
        <div className="glass-panel border-cyber-cyan/30 shadow-neon-cyan p-4 flex items-center gap-4 bg-cyber-cyan/5">
          <div className="p-3 bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan rounded-lg">
            <Cpu size={20} />
          </div>
          <div>
            <span className="text-[9px] font-orbitron text-cyber-cyan font-bold block tracking-wider">AI TRACKING MODEL BIND</span>
            <span className="text-sm font-orbitron font-extrabold text-white">YOLO CUSTOM MODEL</span>
            <span className="text-[9px] text-cyber-muted block mt-0.5">Model weights file: best.pt (19.1 MB)</span>
          </div>
        </div>

        {/* Tracker Pipeline Info */}
        <div className="glass-panel border-cyber-border/50 p-4 flex items-center gap-4 bg-cyber-dark/40">
          <div className="p-3 bg-cyber-dark border border-cyber-border text-cyber-muted rounded-lg">
            <HardDrive size={20} />
          </div>
          <div>
            <span className="text-[9px] font-orbitron text-cyber-muted font-bold block tracking-wider">TRACKING ALGORITHM</span>
            <span className="text-sm font-orbitron font-extrabold text-white">BYTETRACK / BOT-SORT</span>
            <span className="text-[9px] text-cyber-muted block mt-0.5">Multi-object unique tracking IDs persisted</span>
          </div>
        </div>

      </div>

      {/* Camera Manager (CRUD + Video Uploader) */}
      <div className="pt-2">
        <CameraManager onCamerasChanged={onCamerasChanged} />
      </div>
      
    </div>
  );
};

export default SystemConfig;
