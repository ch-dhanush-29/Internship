import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { getHistoricalStats, getCameras } from '../utils/api';
import { BarChart3, Calendar, Loader2, RefreshCw } from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const stats = await getHistoricalStats();
      setData(stats);
      const cams = await getCameras();
      setCameras(cams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Filter metrics based on selected camera if necessary (simulation filters)
  const filteredData = data; 

  // Custom tooltips styling for premium cyberpunk design
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-dark/95 border border-cyber-cyan/50 p-3 rounded-lg shadow-neon-cyan backdrop-blur-md text-xs font-orbitron">
          <p className="font-bold text-white mb-1.5 border-b border-cyber-border/40 pb-1">TIME NODE: {label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }} className="flex justify-between gap-4 font-semibold">
              <span>{entry.name.toUpperCase()}:</span>
              <span className="text-white font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-2">
            <BarChart3 className="text-cyber-orange" size={24} />
            ADVANCED COGNITIVE DATA ANALYTICS
          </h1>
          <p className="text-xs text-cyber-muted font-sans mt-1.5">
            Aggregated time-series traffic velocity, congestion levels, and volumetric distributions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadAnalytics}
            className="p-2 border border-cyber-border hover:border-cyber-cyan text-cyber-muted hover:text-cyber-cyan rounded-lg transition-colors bg-cyber-dark/40"
            title="Refresh Datasets"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <Loader2 className="text-cyber-cyan animate-spin" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main Traffic Volume Chart (Area Chart) */}
          <div className="glass-panel border-cyber-border/40 p-5">
            <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan mb-4 uppercase">
              Traffic Volumetric Flow (Cars / Buses / Trucks Density)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBuses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0df041" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0df041" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTrucks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffb700" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ffb700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontFamily: 'Orbitron', color: '#e2e8f0' }} />
                  <Area name="Cars" type="monotone" dataKey="cars" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCars)" />
                  <Area name="Buses" type="monotone" dataKey="buses" stroke="#0df041" strokeWidth={2} fillOpacity={1} fill="url(#colorBuses)" />
                  <Area name="Trucks" type="monotone" dataKey="trucks" stroke="#ffb700" strokeWidth={2} fillOpacity={1} fill="url(#colorTrucks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lower Grid (Congestion rate + Speed tracking) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Congestion Index (Bar Chart) */}
            <div className="glass-panel border-cyber-border/40 p-5">
              <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-orange mb-4 uppercase">
                Congestion Index Percentage
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.12)" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar name="Congestion Rate (%)" dataKey="congestion" fill="#ffb700" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Velocity aggregates (Line Chart) */}
            <div className="glass-panel border-cyber-border/40 p-5">
              <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-green mb-4 uppercase">
                Velocity Trajectory Aggregates (km/h)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.12)" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'Orbitron' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line name="Avg Speed" type="monotone" dataKey="speed" stroke="#0df041" strokeWidth={2.5} dot={{ r: 3, fill: '#0df041' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}
      
    </div>
  );
};

export default Analytics;
