import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Download, 
  Map, 
  TrendingUp, 
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Loader2
} from 'lucide-react';
import { getExportReportUrl } from '../utils/api';

const InsightsPanel = ({ stats }) => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = (format) => {
    setDownloading(true);
    const url = getExportReportUrl(format);
    
    // Create an anchor and click it to download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setDownloading(false);
    }, 1500);
  };

  // Determine current AI metrics based on parent aggregated stats
  const avgCongest = stats.average_congestion || 0.0;
  const isCongested = avgCongest > 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* AI Traffic Trend Predictor (Column 1) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col justify-between h-[380px]">
        <div>
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan mb-4 pb-2 border-b border-cyber-border flex items-center gap-2">
            <TrendingUp size={16} />
            AI CONGESTION TREND FORECAST
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyber-cyan/15 rounded-lg border border-cyber-cyan/30 text-cyber-cyan mt-1 flex-shrink-0">
                <Sparkles size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Rush Hour Wave Imminent</span>
                <p className="text-[10px] text-cyber-muted leading-relaxed">
                  Inference model predicts traffic volume at <b>Westbound Highway</b> will swell by 35% over the next 45 minutes due to standard evening commute cyclic peaks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-cyber-border/30 pt-3">
              <div className="p-2 bg-cyber-orange/15 rounded-lg border border-cyber-orange/30 text-cyber-orange mt-1 flex-shrink-0">
                <Clock size={16} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Next Inflow Peak Prediction</span>
                <p className="text-[10px] text-cyber-muted leading-relaxed font-orbitron">
                  Expected Peak: <b className="text-cyber-orange">17:30 - 18:45</b> <br />
                  Estimated Volume: <b className="text-white">84 vehicles/min</b> <br />
                  Congestion Rate: <b className="text-cyber-magenta">74.5% (High)</b>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current status summary */}
        <div className="bg-cyber-dark/40 border border-cyber-border/30 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <span className="text-cyber-muted font-orbitron">ESTIMATED TREND:</span>
          {isCongested ? (
            <span className="text-cyber-magenta font-orbitron font-black text-glow-magenta flex items-center gap-1">
              <TrendingUp size={14} /> INCURRING TRAFFIC
            </span>
          ) : (
            <span className="text-cyber-green font-orbitron font-black text-glow-green flex items-center gap-1">
              <TrendingDown size={14} /> FLUID / CLEAR
            </span>
          )}
        </div>
      </div>

      {/* Alternate Route Planner (Column 2) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col justify-between h-[380px]">
        <div>
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-green mb-4 pb-2 border-b border-cyber-border flex items-center gap-2">
            <Map size={16} />
            COGNITIVE ROUTE DIVERTER
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-orbitron">
                <span className="text-cyber-muted">CONGESTED ARTERY:</span>
                <span className="text-cyber-magenta font-bold">Main Highway (West)</span>
              </div>
              <div className="flex items-center gap-2 justify-between bg-cyber-dark/80 px-3 py-2 border border-cyber-border/40 rounded-lg">
                <div className="flex flex-col text-[10px]">
                  <span className="text-white font-bold">Route A - Standard</span>
                  <span className="text-cyber-muted font-orbitron">Travel Time: 28 min</span>
                </div>
                <div className="text-[10px] text-cyber-magenta font-bold font-orbitron">
                  {avgCongest}% Density
                </div>
              </div>
            </div>

            <div className="flex justify-center text-cyber-muted animate-pulse">
              <ArrowRight size={16} className="rotate-90" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-orbitron">
                <span className="text-cyber-muted">RECOMMENDED DETOUR:</span>
                <span className="text-cyber-green font-bold">4th Avenue Bypass</span>
              </div>
              <div className="flex items-center gap-2 justify-between bg-cyber-green/5 border border-cyber-green/20 px-3 py-2 rounded-lg">
                <div className="flex flex-col text-[10px]">
                  <span className="text-white font-bold">Route B - Bypass detour</span>
                  <span className="text-cyber-green font-orbitron">Travel Time: 12 min</span>
                </div>
                <div className="text-[10px] text-cyber-green font-bold font-orbitron">
                  18% Density
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-cyber-muted leading-snug">
          Detour status: <b className="text-cyber-green font-bold uppercase">Optimal</b>. Signage boards can be updated dynamically via REST hooks.
        </div>
      </div>

      {/* Analytics Reports Exporter (Column 3) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col justify-between h-[380px]">
        <div>
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-orange mb-4 pb-2 border-b border-cyber-border flex items-center gap-2">
            <BrainCircuit size={16} />
            COGNITIVE DATA EXPORTER
          </h3>
          
          <p className="text-xs text-cyber-muted leading-relaxed mb-4">
            Compile complete system parameters, including camera network status, logged speed violation events, incident records, and database telemetry.
          </p>

          <div className="bg-cyber-dark/40 border border-cyber-border/40 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between text-[10px] font-orbitron">
              <span>Total Active Nodes:</span>
              <span className="text-cyber-cyan font-bold">{stats.active_cameras || 2}</span>
            </div>
            <div className="flex justify-between text-[10px] font-orbitron">
              <span>Logged Traffic Records:</span>
              <span className="text-cyber-green font-bold">{stats.total_vehicles_detected || 0}</span>
            </div>
            <div className="flex justify-between text-[10px] font-orbitron border-t border-cyber-border/30 pt-1.5 mt-1.5">
              <span>Inference Core Device:</span>
              <span className="text-cyber-orange font-bold font-orbitron">NVIDIA CUDA GPU</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            onClick={() => handleExport('csv')}
            disabled={downloading}
            className="py-2.5 px-3 border border-cyber-cyan bg-cyber-cyan/10 hover:bg-cyber-cyan text-cyber-cyan hover:text-black font-orbitron text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-neon-cyan disabled:opacity-50"
          >
            {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            <span>EXPORT CSV</span>
          </button>
          
          <button 
            onClick={() => handleExport('json')}
            disabled={downloading}
            className="py-2.5 px-3 border border-cyber-orange bg-cyber-orange/10 hover:bg-cyber-orange text-cyber-orange hover:text-black font-orbitron text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-neon-orange disabled:opacity-50"
          >
            {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default InsightsPanel;
