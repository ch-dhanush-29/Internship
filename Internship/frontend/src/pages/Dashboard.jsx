import React, { useState, useEffect } from 'react';
import { 
  getCameras, 
  getRealtimeStats, 
  getAlerts, 
  getAccidents, 
  readAllAlerts 
} from '../utils/api';
import LiveFeedCard from '../components/LiveFeedCard';
import StatPanel from '../components/StatPanel';
import AlertPanel from '../components/AlertPanel';
import InsightsPanel from '../components/InsightsPanel';
import Radar3D from '../components/Radar3D';
import { Radio, ShieldAlert, Loader2, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(null);
  const [stats, setStats] = useState({
    active_cameras: 0,
    online_cameras: 0,
    total_vehicles_detected: 0,
    average_speed: 0.0,
    average_congestion: 0.0,
    vehicle_distribution: { cars: 0, buses: 0, trucks: 0 },
    congestion_status: 'Fluid'
  });
  
  const [alerts, setAlerts] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Keep a local dictionary of camera metrics from WebSockets to update dashboard aggregates in real-time
  const [cameraLiveMetrics, setCameraLiveMetrics] = useState({});

  // Load cameras once on mount
  useEffect(() => {
    const loadCamerasList = async () => {
      try {
        const cams = await getCameras();
        setCameras(cams);
        if (cams.length > 0) {
          setActiveCamera(cams[0]);
        }
      } catch (err) {
        console.error("Error loading cameras:", err);
      } finally {
        setLoading(false);
      }
    };
    loadCamerasList();
  }, []);

  // Poll stats and alert metrics periodically without resetting activeCamera
  const pollMetrics = async () => {
    try {
      const realStats = await getRealtimeStats();
      setStats(prev => ({
        ...realStats,
        // Preserve live metrics if active
        vehicle_distribution: prev.total_vehicles_detected > 0 ? prev.vehicle_distribution : realStats.vehicle_distribution
      }));
      
      const alertLogs = await getAlerts();
      setAlerts(alertLogs);
      
      const accidentLogs = await getAccidents();
      setAccidents(accidentLogs);
    } catch (err) {
      console.error("Error polling metrics:", err);
    }
  };

  useEffect(() => {
    pollMetrics();
    const interval = setInterval(pollMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update aggregated statistics dynamically in real-time when WebSocket events fire in components
  const handleLiveMetricsUpdate = (camId, metrics) => {
    setCameraLiveMetrics(prev => {
      const updated = { ...prev, [camId]: metrics };
      
      const activeIds = Object.keys(updated);
      let totalCars = 0;
      let totalBuses = 0;
      let totalTrucks = 0;
      let totalSpeedSum = 0;
      let totalCongestSum = 0;
      let activeFeedsCount = 0;
      
      activeIds.forEach(id => {
        const m = updated[id];
        // Only aggregate active streams
        if (m.active_count > 0 || m.congestion_rate > 0) {
          activeFeedsCount++;
          totalCars += m.cars || 0;
          totalBuses += m.buses || 0;
          totalTrucks += m.trucks || 0;
          totalSpeedSum += m.average_speed || 0;
          totalCongestSum += m.congestion_rate || 0;
        }
      });
      
      const avgCongest = activeFeedsCount > 0 ? totalCongestSum / activeFeedsCount : 0.0;
      const avgSpeed = activeFeedsCount > 0 ? totalSpeedSum / activeFeedsCount : 0.0;
      const totalTyped = totalCars + totalBuses + totalTrucks;
      const car_p = totalTyped > 0 ? Math.round((totalCars / totalTyped) * 100) : 0;
      const bus_p = totalTyped > 0 ? Math.round((totalBuses / totalTyped) * 100) : 0;
      const truck_p = totalTyped > 0 ? Math.round((totalTrucks / totalTyped) * 100) : 0;
      
      setStats(prevStats => ({
        ...prevStats,
        average_congestion: Math.round(avgCongest * 10) / 10,
        average_speed: Math.round(avgSpeed * 10) / 10,
        vehicle_distribution: { cars: car_p, buses: bus_p, trucks: truck_p },
        congestion_status: avgCongest > 70 ? 'Heavy' : avgCongest > 40 ? 'Moderate' : 'Fluid'
      }));

      return updated;
    });
  };

  const handleResolveAccident = (id) => {
    setAccidents(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  const handleMarkAllRead = async () => {
    try {
      await readAllAlerts();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && cameras.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-cyber-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-cyber-cyan animate-spin" size={36} />
          <span className="text-sm font-orbitron tracking-widest text-cyber-cyan">BOOTING COGNITIVE ENGINE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Dashboard Top Header Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-2">
            <Sparkles className="text-cyber-cyan animate-pulse" size={24} />
            AI TRAFFIC VISION COCKPIT
          </h1>
          <p className="text-xs text-cyber-muted font-sans mt-1.5">
            Real-time GPU-accelerated multi-object vehicular tracking and emergency response system.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 border border-cyber-green/45 bg-cyber-green/5 text-cyber-green font-orbitron text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-neon-green">
            <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping" />
            CUDA DEVICE BINDING: OK (GPU ACCELERATED)
          </div>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Player Viewer & Switcher) - 2/3 Wide */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Selected Stream Player Card */}
          {activeCamera ? (
            <LiveFeedCard 
              camera={activeCamera} 
              onMetricsUpdate={handleLiveMetricsUpdate} 
            />
          ) : (
            <div className="glass-panel border-cyber-border/40 h-[400px] flex flex-col items-center justify-center text-cyber-muted text-xs">
              <Radio size={36} className="mb-2 animate-pulse" />
              <span>No active streams configured.</span>
            </div>
          )}

          {/* Camera Selection Switcher Buttons */}
          {cameras.length > 1 && (
            <div className="glass-panel border-cyber-border/40 p-4">
              <h4 className="text-[10px] font-orbitron font-bold tracking-widest text-cyber-muted mb-2.5 uppercase">
                SWITCH MONITOR FEEDS
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setActiveCamera(cam)}
                    className={`px-4 py-2 text-xs font-orbitron font-semibold border rounded-lg transition-all ${
                      activeCamera?.id === cam.id
                        ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-neon-cyan'
                        : 'bg-cyber-dark/60 border-cyber-border/50 text-cyber-muted hover:border-cyber-border hover:text-white'
                    }`}
                  >
                    FEED #{cam.id}: {cam.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Numerical aggregates) - 1/3 Wide */}
        <div className="space-y-6">
          <StatPanel stats={stats} alertsCount={alerts.filter(a => !a.is_read).length} />
          <Radar3D />
        </div>
      </div>

      {/* AI Insights Diverter and Predictor */}
      <InsightsPanel stats={stats} />

      {/* Incident logs and snapshot visualizer */}
      <div className="border-t border-cyber-border/40 pt-6">
        <AlertPanel 
          alerts={alerts} 
          accidents={accidents} 
          onResolveAccident={handleResolveAccident}
          onMarkAllRead={handleMarkAllRead}
        />
      </div>
      
    </div>
  );
};

export default Dashboard;
