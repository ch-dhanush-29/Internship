import React, { useState } from 'react';
import { 
  BellRing, 
  ShieldAlert, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  MapPin,
  Eye,
  AlertTriangle,
  X
} from 'lucide-react';
import { resolveAccident, STATIC_BASE_URL } from '../utils/api';

const AlertPanel = ({ alerts, accidents, onResolveAccident, onMarkAllRead }) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const handleResolve = async (id) => {
    try {
      await resolveAccident(id);
      if (onResolveAccident) {
        onResolveAccident(id);
      }
    } catch (err) {
      console.error("Error resolving accident:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Live System Alerts (Column 1 - wide 1/3) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col h-[450px]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyber-border">
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan flex items-center gap-2">
            <BellRing className="text-cyber-cyan animate-bounce" size={16} />
            LIVE NOTIFICATION CONSOLE
          </h3>
          <button 
            onClick={onMarkAllRead}
            className="text-[9px] font-orbitron px-2 py-0.5 border border-cyber-border rounded hover:border-cyber-cyan text-cyber-cyan transition-colors"
          >
            CLEAR ALL
          </button>
        </div>

        {/* Scrollable alerts list */}
        <div className="flex-grow overflow-y-auto space-y-3 pr-1">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-cyber-muted text-xs gap-2">
              <CheckCircle size={24} className="text-cyber-green/60" />
              <span>System secure. No active alerts.</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`border rounded-lg p-3 flex gap-3 relative overflow-hidden bg-cyber-dark/35 transition-all hover:scale-[1.01] ${
                  alert.is_read ? 'border-cyber-border/50 opacity-60' : 
                  alert.type === 'accident' ? 'border-cyber-magenta/50 shadow-neon-magenta animate-pulse' :
                  alert.type === 'overspeed' ? 'border-cyber-orange/40 shadow-neon-orange' :
                  'border-cyber-yellow/40'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <ShieldAlert className={
                    alert.type === 'accident' ? 'text-cyber-magenta' :
                    alert.type === 'overspeed' ? 'text-cyber-orange' :
                    'text-cyber-yellow'
                  } size={18} />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[9px] text-cyber-muted font-orbitron">
                    <Clock size={10} />
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Accidents and Anomalies Table (Column 2 & 3 - wide 2/3) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col h-[450px] lg:col-span-2">
        <div className="mb-4 pb-2 border-b border-cyber-border">
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-magenta flex items-center gap-2">
            <AlertTriangle className="text-cyber-magenta animate-pulse" size={16} />
            CRITICAL INCIDENT HISTORY (ACCIDENTS LOG)
          </h3>
        </div>

        {/* Scrollable incidents list */}
        <div className="flex-grow overflow-y-auto pr-1">
          {accidents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-cyber-muted text-xs gap-2">
              <CheckCircle size={24} className="text-cyber-green/60" />
              <span>No critical incidents logged. Traffic flowing normally.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {accidents.map((accident) => (
                <div 
                  key={accident.id} 
                  className={`border rounded-xl p-4 bg-cyber-dark/20 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    accident.resolved ? 'border-cyber-border/40 opacity-70' : 'border-cyber-magenta/40 bg-cyber-magenta/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Visual snapshot thumbnail if available */}
                    {accident.snapshot_path ? (
                      <div 
                        onClick={() => setSelectedSnapshot(accident.snapshot_path)}
                        className="w-20 h-14 bg-black border border-cyber-border rounded-lg overflow-hidden cursor-pointer relative group flex-shrink-0"
                        title="Expand Image"
                      >
                        <img 
                          src={`${STATIC_BASE_URL}${accident.snapshot_path}`} 
                          alt="Snapshot"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={14} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-14 bg-cyber-dark border border-cyber-border/40 rounded-lg flex items-center justify-center flex-shrink-0 text-cyber-muted">
                        <ShieldAlert size={20} />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-orbitron font-bold px-2 py-0.5 rounded ${
                          accident.resolved ? 'bg-cyber-border/40 text-cyber-muted' : 'bg-cyber-magenta/25 border border-cyber-magenta/50 text-cyber-magenta shadow-neon-magenta'
                        }`}>
                          {accident.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                        </span>
                        <span className="text-[10px] font-orbitron font-bold text-cyber-cyan flex items-center gap-1">
                          <MapPin size={10} /> Camera #{accident.camera_id}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-normal">
                        {accident.description}
                      </h4>
                      <p className="text-[10px] text-cyber-muted font-orbitron flex items-center gap-1.5">
                        <Clock size={10} />
                        {new Date(accident.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!accident.resolved && (
                      <button 
                        onClick={() => handleResolve(accident.id)}
                        className="px-3 py-1.5 border border-cyber-green text-cyber-green bg-cyber-green/10 font-orbitron text-xs font-semibold rounded-lg hover:bg-cyber-green/20 hover:scale-105 transition-all shadow-neon-green"
                      >
                        RESOLVE INCIDENT
                      </button>
                    )}
                    {accident.snapshot_path && (
                      <button 
                        onClick={() => setSelectedSnapshot(accident.snapshot_path)}
                        className="p-1.5 border border-cyber-border rounded-lg text-cyber-muted hover:border-cyber-cyan hover:text-cyber-cyan transition-colors"
                        title="View Full Screenshot"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Visualizer Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-panel border-cyber-cyan/50 max-w-4xl w-full overflow-hidden flex flex-col shadow-neon-cyan animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-3.5 bg-cyber-dark border-b border-cyber-border flex items-center justify-between">
              <span className="font-orbitron text-xs font-bold text-cyber-cyan tracking-wider">
                AI TRAFFIC VISION // EMERGENCY SNAPSHOT EXPANSION
              </span>
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 rounded bg-cyber-dark border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-cyan"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center p-2 max-h-[70vh]">
              <img 
                src={`${STATIC_BASE_URL}${selectedSnapshot}`} 
                alt="Accident snapshot expansion"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="px-5 py-3 bg-cyber-dark/80 border-t border-cyber-border text-[10px] text-cyber-muted font-orbitron flex justify-between">
              <span>PATH: {selectedSnapshot}</span>
              <span>SNAP ID: {selectedSnapshot.split('_').pop()?.split('.')[0]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
