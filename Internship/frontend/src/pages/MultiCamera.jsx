import React, { useState, useEffect } from 'react';
import { getCameras } from '../utils/api';
import LiveFeedCard from '../components/LiveFeedCard';
import { Loader2, Radio } from 'lucide-react';

const MultiCamera = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCameras = async () => {
    try {
      const cams = await getCameras();
      setCameras(cams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-cyber-border/40 pb-4">
        <h1 className="text-2xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-2">
          <Radio className="text-cyber-green animate-pulse" size={24} />
          MULTI-FEED GRAPHIC GRID MONITOR
        </h1>
        <p className="text-xs text-cyber-muted font-sans mt-1.5">
          Simultaneous real-time execution of object tracking pipelines across all registered nodes.
        </p>
      </div>

      {/* Grid container */}
      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <Loader2 className="text-cyber-cyan animate-spin" size={32} />
        </div>
      ) : cameras.length === 0 ? (
        <div className="glass-panel border-cyber-border/40 h-[300px] flex flex-col items-center justify-center text-cyber-muted text-xs p-6">
          <Radio size={36} className="mb-2 animate-pulse" />
          <span>No CCTV camera channels configured. Initialize nodes in System Configuration.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <LiveFeedCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}
      
    </div>
  );
};

export default MultiCamera;
