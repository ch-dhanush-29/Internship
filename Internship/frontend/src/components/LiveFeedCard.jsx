import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Camera, 
  RefreshCw, 
  VolumeX, 
  Radio, 
  Sliders, 
  HelpCircle,
  AlertTriangle,
  Loader2,
  Maximize,
  Minimize
} from 'lucide-react';
import { WS_BASE_URL } from '../utils/api';

const LiveFeedCard = ({ camera, onMetricsUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [frameData, setFrameData] = useState(null);
  const [fps, setFps] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [lineY, setLineY] = useState(0.6); // Lane line threshold
  const [showConfig, setShowConfig] = useState(false);
  const [metrics, setMetrics] = useState({
    cars: 0,
    buses: 0,
    trucks: 0,
    congestion_rate: 0.0,
    status: 'low'
  });

  const ws = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Initialize and manage WebSocket connection
  useEffect(() => {
    if (!isPlaying) {
      if (ws.current) {
        ws.current.close();
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Connect to FastAPI pipeline
    const wsUrl = `${WS_BASE_URL}/live-detection/${camera.id}`;
    console.log(`Connecting WebSocket to: ${wsUrl}`);
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`WebSocket open for camera ${camera.id}`);
      setLoading(false);
      // Send initial configurations
      ws.current.send(JSON.stringify({ line_y: lineY }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.frame) {
          setFrameData(data.frame);
        }
        
        if (data.fps) {
          setFps(data.fps);
        }

        if (data.metrics) {
          const activeSpeeds = (data.active_tracks || []).map(t => t.speed).filter(s => s > 0);
          const avgSpd = activeSpeeds.length > 0 ? activeSpeeds.reduce((a, b) => a + b, 0) / activeSpeeds.length : 0.0;
          
          const liveMetrics = {
            ...data.metrics,
            average_speed: Math.round(avgSpd * 10) / 10
          };
          
          setMetrics(liveMetrics);
          setActiveCount(liveMetrics.active_count);
          // Bubble metrics up to Dashboard parent for aggregates
          if (onMetricsUpdate) {
            onMetricsUpdate(camera.id, liveMetrics);
          }
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.current.onerror = (event) => {
      console.error("WS connection error:", event);
      setError("Pipeline offline or failed to bind device.");
      setLoading(false);
    };

    ws.current.onclose = () => {
      console.log(`WebSocket closed for camera ${camera.id}`);
      setLoading(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [camera.id, isPlaying]);

  // Handle configuration changes (sent over websocket)
  const handleLineYChange = (e) => {
    const val = parseFloat(e.target.value);
    setLineY(val);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ line_y: val }));
    }
  };

  const handleResetCounts = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ reset_counts: true }));
    }
  };

  const takeScreenshot = () => {
    if (!frameData) return;
    const link = document.createElement('a');
    link.href = frameData;
    link.download = `traffic_snap_cam${camera.id}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className={`glass-panel border-cyber-border/40 relative overflow-hidden group flex flex-col transition-all duration-300 ${
      isFullscreen ? 'w-full h-full rounded-none border-none bg-black' : 'h-[400px]'
    }`}>
      
      {/* Top Title/Metric Bar */}
      <div className="px-4 py-2.5 bg-cyber-dark/80 border-b border-cyber-border flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            error ? 'bg-cyber-magenta animate-pulse shadow-neon-magenta' : 
            isPlaying ? 'bg-cyber-green animate-ping shadow-neon-green' : 'bg-cyber-muted'
          }`} />
          <span className="font-orbitron text-xs font-semibold tracking-wider text-cyber-text truncate max-w-[200px]">
            {camera.name.upper || camera.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-orbitron bg-cyber-bg border border-cyber-border px-2 py-0.5 rounded text-cyber-cyan">
            FPS: {fps}
          </span>
          <span className={`text-[10px] font-orbitron border px-2 py-0.5 rounded ${
            metrics.status === 'heavy' ? 'border-cyber-magenta/50 text-cyber-magenta bg-cyber-magenta/10 shadow-neon-magenta' :
            metrics.status === 'medium' ? 'border-cyber-orange/50 text-cyber-orange bg-cyber-orange/10 shadow-neon-orange' :
            'border-cyber-green/50 text-cyber-green bg-cyber-green/10 shadow-neon-green'
          }`}>
            {metrics.status.toUpperCase()} ({Math.round(metrics.congestion_rate)}%)
          </span>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-grow bg-black flex items-center justify-center overflow-hidden">
        
        {loading && (
          <div className="absolute inset-0 bg-cyber-bg/90 z-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="text-cyber-cyan animate-spin" size={32} />
            <span className="text-xs font-orbitron tracking-widest text-cyber-cyan">CONNECTING CUDA PIPELINE...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-cyber-bg/95 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle className="text-cyber-magenta shadow-neon-magenta animate-bounce" size={36} />
            <span className="text-sm font-orbitron font-bold text-cyber-magenta uppercase">Pipeline Bind Error</span>
            <span className="text-xs text-cyber-muted max-w-[300px]">{error}</span>
            <button 
              onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 200); }} 
              className="mt-2 text-xs font-orbitron px-4 py-1.5 border border-cyber-border rounded bg-cyber-dark/50 hover:border-cyber-cyan text-cyber-cyan hover:scale-105 transition-all"
            >
              RECONNECT FEED
            </button>
          </div>
        )}

        {!isPlaying && (
          <div className="absolute inset-0 bg-cyber-bg/80 z-20 flex flex-col items-center justify-center gap-3">
            <Radio className="text-cyber-muted animate-pulse" size={36} />
            <span className="text-xs font-orbitron tracking-widest text-cyber-muted uppercase">FEED STREAM PAUSED</span>
            <button 
              onClick={() => setIsPlaying(true)}
              className="px-4 py-1.5 border border-cyber-cyan/40 bg-cyber-cyan/10 hover:border-cyber-cyan text-cyber-cyan font-orbitron text-xs rounded shadow-neon-cyan transition-all hover:scale-105"
            >
              RESUME STREAM
            </button>
          </div>
        )}

        {/* Live Image Frame */}
        {frameData ? (
          <img 
            src={frameData} 
            alt={camera.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          !loading && !error && isPlaying && (
            <div className="absolute inset-0 bg-cyber-bg/90 z-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="text-cyber-cyan animate-spin" size={28} />
              <span className="text-xs font-orbitron tracking-widest text-cyber-cyan/80">AWAITING VIDEO STREAM SIGNAL...</span>
            </div>
          )
        )}

        {/* Hover Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
          
          {/* Quick Actions Panel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-cyber-dark/80 rounded-lg border border-cyber-border/80 text-cyber-text hover:border-cyber-cyan hover:text-cyber-cyan transition-all"
                title={isPlaying ? "Pause Stream" : "Play Stream"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button 
                onClick={takeScreenshot}
                disabled={!frameData}
                className="p-2 bg-cyber-dark/80 rounded-lg border border-cyber-border/80 text-cyber-text hover:border-cyber-cyan hover:text-cyber-cyan transition-all disabled:opacity-50 disabled:hover:text-cyber-text"
                title="Capture Snap"
              >
                <Camera size={16} />
              </button>
              <button 
                onClick={handleResetCounts}
                className="p-2 bg-cyber-dark/80 rounded-lg border border-cyber-border/80 text-cyber-text hover:border-cyber-magenta hover:text-cyber-magenta transition-all"
                title="Reset Statistics"
              >
                <RefreshCw size={16} />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="p-2 bg-cyber-dark/80 rounded-lg border border-cyber-border/80 text-cyber-text hover:border-cyber-cyan hover:text-cyber-cyan transition-all"
                title={isFullscreen ? "Toggle Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
            
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg border transition-all ${
                showConfig 
                  ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-neon-cyan' 
                  : 'bg-cyber-dark/80 border-cyber-border/80 text-cyber-text hover:border-cyber-cyan hover:text-cyber-cyan'
              }`}
              title="Calibration Overlay"
            >
              <Sliders size={16} />
            </button>
          </div>
        </div>

        {/* Calibration Settings Card Panel */}
        {showConfig && (
          <div className="absolute bottom-16 right-4 left-4 bg-cyber-dark/95 border border-cyber-cyan/35 rounded-xl p-3 z-30 shadow-neon-cyan backdrop-blur-lg transition-all duration-300">
            <h4 className="text-xs font-orbitron font-bold text-cyber-cyan mb-2 flex items-center justify-between">
              <span>CAMERA CALIBRATION PANEL</span>
              <button onClick={() => setShowConfig(false)} className="text-[10px] text-cyber-muted hover:text-white">CLOSE</button>
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-orbitron">
                  <span className="text-cyber-muted">LANE crossing Line Y Position:</span>
                  <span className="text-cyber-cyan font-bold">{Math.round(lineY * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.15" 
                  max="0.85" 
                  step="0.05" 
                  value={lineY} 
                  onChange={handleLineYChange}
                  className="w-full h-1 bg-cyber-border rounded-lg appearance-none cursor-pointer accent-cyber-cyan" 
                />
              </div>
              <div className="text-[9px] text-cyber-muted border-t border-cyber-border pt-1.5 flex items-center justify-between">
                <span>Total Vehicles Classifications Logged:</span>
                <span className="text-cyber-green font-bold font-orbitron">
                  C: {metrics.cars} | B: {metrics.buses} | T: {metrics.trucks}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-4 py-2 bg-cyber-dark/90 border-t border-cyber-border/60 flex items-center justify-between text-[11px] font-orbitron">
        <span className="text-cyber-muted">Active Vehicles in Bbox: <b className="text-white font-bold">{activeCount}</b></span>
        <span className="text-cyber-muted">Total Cumulative: <b className="text-cyber-green font-bold">{(metrics.cars + metrics.buses + metrics.trucks) || 0}</b></span>
      </div>
    </div>
  );
};

export default LiveFeedCard;
