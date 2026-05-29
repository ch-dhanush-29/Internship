import React from 'react';
import { 
  Activity, 
  Gauge, 
  TrafficCone, 
  ShieldAlert, 
  Car, 
  Bus, 
  Truck
} from 'lucide-react';

const StatPanel = ({ stats, alertsCount }) => {
  // Stats format:
  // { active_cameras: 2, online_cameras: 2, total_vehicles_detected: 10, average_speed: 48.5, average_congestion: 24.5, vehicle_distribution: { cars: 75, buses: 15, trucks: 10 }, congestion_status: 'Fluid' }
  
  const cards = [
    {
      title: 'TOTAL COGNITIVE DETECTIONS',
      value: stats.total_vehicles_detected || 0,
      icon: Activity,
      color: 'text-cyber-cyan',
      bgGlow: 'glass-panel-glow-cyan',
      desc: 'Cumulative vehicles logged in database'
    },
    {
      title: 'AVERAGE VELOCITY METRIC',
      value: `${stats.average_speed || 48.5} km/h`,
      icon: Gauge,
      color: 'text-cyber-green',
      bgGlow: 'glass-panel-glow-green',
      desc: 'Consolidated tracking speed'
    },
    {
      title: 'CONGESTION COEFFICIENT',
      value: `${stats.average_congestion || 24.5}%`,
      icon: TrafficCone,
      color: 'text-cyber-orange',
      bgGlow: 'glass-panel-glow-orange',
      desc: `Status rating: ${stats.congestion_status || 'Fluid'}`
    },
    {
      title: 'ACTIVE SYSTEM ALERTS',
      value: alertsCount || 0,
      icon: ShieldAlert,
      color: 'text-cyber-magenta',
      bgGlow: 'glass-panel-glow-magenta',
      desc: 'Active collisions, overspeed, or hazards'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`${card.bgGlow} p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]`}>
              {/* Abs Grid scan effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-orbitron font-bold tracking-widest text-cyber-muted">
                  {card.title}
                </span>
                <Icon className={card.color} size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-orbitron font-black text-white tracking-wider text-glow-cyan mb-1.5">
                  {card.value}
                </span>
                <span className="text-[10px] text-cyber-muted leading-relaxed">
                  {card.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vehicle Type Distribution Panel */}
      <div className="glass-panel border-cyber-border/40 p-5">
        <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan mb-4">
          VEHICLE SPECIES DISTRIBUTION (CONSOLIDATED RATIO)
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Cars Card */}
          <div className="bg-cyber-dark/40 border border-cyber-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center relative">
            <Car className="text-cyber-cyan mb-2" size={24} />
            <span className="text-xs text-cyber-muted font-orbitron mb-1">CARS</span>
            <span className="text-xl font-orbitron font-black text-white">
              {stats.vehicle_distribution?.cars || 75}%
            </span>
            <div className="w-full bg-cyber-dark rounded-full h-1 mt-2.5 overflow-hidden">
              <div 
                className="bg-cyber-cyan h-1 shadow-neon-cyan transition-all duration-500" 
                style={{ width: `${stats.vehicle_distribution?.cars || 75}%` }} 
              />
            </div>
          </div>

          {/* Buses Card */}
          <div className="bg-cyber-dark/40 border border-cyber-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center relative">
            <Bus className="text-cyber-green mb-2" size={24} />
            <span className="text-xs text-cyber-muted font-orbitron mb-1">BUSES</span>
            <span className="text-xl font-orbitron font-black text-white">
              {stats.vehicle_distribution?.buses || 15}%
            </span>
            <div className="w-full bg-cyber-dark rounded-full h-1 mt-2.5 overflow-hidden">
              <div 
                className="bg-cyber-green h-1 shadow-neon-green transition-all duration-500" 
                style={{ width: `${stats.vehicle_distribution?.buses || 15}%` }} 
              />
            </div>
          </div>

          {/* Trucks Card */}
          <div className="bg-cyber-dark/40 border border-cyber-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center relative">
            <Truck className="text-cyber-orange mb-2" size={24} />
            <span className="text-xs text-cyber-muted font-orbitron mb-1">TRUCKS</span>
            <span className="text-xl font-orbitron font-black text-white">
              {stats.vehicle_distribution?.trucks || 10}%
            </span>
            <div className="w-full bg-cyber-dark rounded-full h-1 mt-2.5 overflow-hidden">
              <div 
                className="bg-cyber-orange h-1 shadow-neon-orange transition-all duration-500" 
                style={{ width: `${stats.vehicle_distribution?.trucks || 10}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatPanel;
