import React from 'react';
import { ShieldAlert, Compass } from 'lucide-react';

const Radar3D = () => {
  return (
    <div className="glass-panel border-cyber-cyan/30 p-5 relative overflow-hidden flex flex-col justify-between h-[380px] shadow-neon-cyan bg-cyber-cyan/5">
      {/* HUD Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cyber-border/40 z-10">
        <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan flex items-center gap-2">
          <Compass className="animate-spin" style={{ animationDuration: '8s' }} size={16} />
          3D HOLOGRAM RADAR NODE
        </h3>
        <span className="text-[8px] font-orbitron bg-cyber-cyan/20 border border-cyber-cyan/40 px-2 py-0.5 rounded text-cyber-cyan">
          ONLINE // TARGET SEEKING
        </span>
      </div>

      {/* 3D Hologram Viewport */}
      <div className="flex-grow flex items-center justify-center relative hologram-viewport py-6 z-0">
        {/* Hologram Projector Light Flare */}
        <div className="absolute bottom-2 w-16 h-1 bg-cyber-cyan/70 blur-md rounded-full shadow-[0_0_15px_#00f0ff]" />
        <div className="absolute bottom-2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[180px] border-b-cyber-cyan/5 blur-sm pointer-events-none" />

        {/* 3D Container */}
        <div className="hologram-disk-container">
          {/* Main Rotating Grid Disk */}
          <div className="hologram-disk grid-primary">
            <div className="hologram-circle circle-1" />
            <div className="hologram-circle circle-2" />
            <div className="hologram-circle circle-3" />
            <div className="hologram-crossline cross-x" />
            <div className="hologram-crossline cross-y" />
            
            {/* Target Nodes floating on the disk */}
            <div className="hologram-target target-1"><div className="target-pulse" /></div>
            <div className="hologram-target target-2"><div className="target-pulse" /></div>
            <div className="hologram-target target-3"><div className="target-pulse" /></div>
          </div>
          
          {/* Secondary Counter-Rotating Ring */}
          <div className="hologram-disk grid-secondary">
            <div className="hologram-circle circle-dashed" />
          </div>

          {/* Floating Vertical 3D Scan Line */}
          <div className="hologram-scanner" />
        </div>
      </div>

      {/* Diagnostics Readout */}
      <div className="bg-cyber-dark/60 border border-cyber-border/40 rounded-xl p-3 z-10 font-orbitron text-[9px] text-cyber-muted space-y-1">
        <div className="flex justify-between">
          <span>COORDINATE SCAN RANGE:</span>
          <span className="text-white font-bold">120m RADIUS</span>
        </div>
        <div className="flex justify-between">
          <span>AI SEGMENT RESOLUTION:</span>
          <span className="text-cyber-green font-bold">3.2ms LATENCY</span>
        </div>
      </div>
    </div>
  );
};

export default Radar3D;
