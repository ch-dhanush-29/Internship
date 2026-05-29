import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Video, 
  UploadCloud, 
  Radio, 
  FolderOpen, 
  Check, 
  Loader2,
  ListRestart
} from 'lucide-react';
import { 
  getCameras, 
  addCamera, 
  deleteCamera, 
  getVideos, 
  uploadVideo 
} from '../utils/api';

const CameraManager = ({ onCamerasChanged }) => {
  const [cameras, setCameras] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [camName, setCamName] = useState('');
  const [sourceType, setSourceType] = useState('video'); // 'video', 'webcam', 'rtsp'
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [webcamId, setWebcamId] = useState('0');
  const [rtspUrl, setRtspUrl] = useState('rtsp://192.168.1.100:554/ch1');

  // Load cameras and uploads
  const refreshData = async () => {
    setLoading(true);
    try {
      const cams = await getCameras();
      setCameras(cams);
      const vids = await getVideos();
      setVideos(vids);
      if (vids.length > 0) {
        setSelectedVideoUrl(vids[0].path);
      }
    } catch (err) {
      console.error("Error fetching camera config data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!camName.trim()) return;

    let streamUrl = '';
    if (sourceType === 'webcam') {
      streamUrl = webcamId;
    } else if (sourceType === 'rtsp') {
      streamUrl = rtspUrl;
    } else {
      streamUrl = selectedVideoUrl;
    }

    if (!streamUrl) {
      alert("Please select or enter a valid video stream source URL.");
      return;
    }

    try {
      await addCamera({ name: camName, url: streamUrl });
      setCamName('');
      refreshData();
      if (onCamerasChanged) {
        onCamerasChanged();
      }
    } catch (err) {
      console.error("Error creating camera:", err);
    }
  };

  const handleDeleteCamera = async (id) => {
    if (!window.confirm("Are you sure you want to shut down and delete this camera stream config?")) return;
    try {
      await deleteCamera(id);
      refreshData();
      if (onCamerasChanged) {
        onCamerasChanged();
      }
    } catch (err) {
      console.error("Error deleting camera:", err);
    }
  };

  // Drag and drop video upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadVideo(file);
      alert(`Success: Video '${result.filename}' uploaded successfully to CUDA node!`);
      
      // Reload videos list
      const vids = await getVideos();
      setVideos(vids);
      // Select the newly uploaded video
      const uploadedFile = vids.find(v => v.name === result.filename);
      if (uploadedFile) {
        setSelectedVideoUrl(uploadedFile.path);
        setSourceType('video');
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload video to backend storage.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Add Camera Stream Form (Column 1 - 1/3) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan mb-4 pb-2 border-b border-cyber-border">
            ADD NEW COGNITIVE FEED CONFIG
          </h3>
          
          <form onSubmit={handleCreateCamera} className="space-y-4">
            
            {/* Camera Name */}
            <div>
              <label className="block text-[10px] font-orbitron text-cyber-muted mb-1.5 uppercase">Camera Location Name</label>
              <input 
                type="text" 
                value={camName}
                onChange={(e) => setCamName(e.target.value)}
                placeholder="e.g. Main Intersection Northbound" 
                className="w-full bg-cyber-dark/85 border border-cyber-border text-white text-xs rounded-lg px-3.5 py-2.5 outline-none focus:border-cyber-cyan focus:shadow-neon-cyan transition-all"
                required
              />
            </div>

            {/* Stream Type Selection */}
            <div>
              <label className="block text-[10px] font-orbitron text-cyber-muted mb-1.5 uppercase font-semibold">Feed Input Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType('video')}
                  className={`py-2 px-1 text-[9px] font-orbitron rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    sourceType === 'video' 
                      ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-neon-cyan' 
                      : 'bg-cyber-dark border-cyber-border text-cyber-muted hover:border-cyber-border/80'
                  }`}
                >
                  <FolderOpen size={14} />
                  <span>UPLOAD FILE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('webcam')}
                  className={`py-2 px-1 text-[9px] font-orbitron rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    sourceType === 'webcam' 
                      ? 'bg-cyber-green/15 border-cyber-green text-cyber-green shadow-neon-green' 
                      : 'bg-cyber-dark border-cyber-border text-cyber-muted hover:border-cyber-border/80'
                  }`}
                >
                  <Video size={14} />
                  <span>WEBCAM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('rtsp')}
                  className={`py-2 px-1 text-[9px] font-orbitron rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    sourceType === 'rtsp' 
                      ? 'bg-cyber-orange/15 border-cyber-orange text-cyber-orange shadow-neon-orange' 
                      : 'bg-cyber-dark border-cyber-border text-cyber-muted hover:border-cyber-border/80'
                  }`}
                >
                  <Radio size={14} />
                  <span>IP RTSP</span>
                </button>
              </div>
            </div>

            {/* Source Details Dynamic Inputs */}
            <div className="bg-cyber-dark/40 border border-cyber-border/40 rounded-xl p-3.5 mt-2">
              
              {/* Uploaded Videos Select */}
              {sourceType === 'video' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-orbitron text-cyber-muted mb-1.5">CHOOSE DEMO VIDEO FILE</label>
                    {videos.length === 0 ? (
                      <span className="text-[10px] text-cyber-magenta block">No video files found on node. Upload one below.</span>
                    ) : (
                      <select 
                        value={selectedVideoUrl}
                        onChange={(e) => setSelectedVideoUrl(e.target.value)}
                        className="w-full bg-cyber-dark border border-cyber-border text-white text-xs rounded-lg px-2 py-2 outline-none focus:border-cyber-cyan"
                      >
                        {videos.map((vid, idx) => (
                          <option key={idx} value={vid.path}>{vid.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* File Upload Trigger */}
                  <div className="border-t border-cyber-border/50 pt-2.5">
                    <label className="block text-[9px] font-orbitron text-cyber-muted mb-1.5">UPLOAD LOCAL MP4 VIDEO</label>
                    <label className="w-full border border-dashed border-cyber-border hover:border-cyber-cyan rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-cyber-bg/20">
                      {uploading ? (
                        <>
                          <Loader2 className="text-cyber-cyan animate-spin mb-1.5" size={20} />
                          <span className="text-[9px] font-orbitron text-cyber-cyan">UPLOADING & BUFFING...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="text-cyber-muted group-hover:text-cyber-cyan mb-1.5" size={20} />
                          <span className="text-[9px] font-orbitron text-cyber-muted text-center">CLICK TO SELECT MP4 FILE</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="video/mp4, video/x-msvideo, video/quicktime"
                        onChange={handleFileUpload}
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Webcam Select */}
              {sourceType === 'webcam' && (
                <div>
                  <label className="block text-[9px] font-orbitron text-cyber-muted mb-1.5">LOCAL WEBCAM DEVICE PORT ID</label>
                  <select 
                    value={webcamId}
                    onChange={(e) => setWebcamId(e.target.value)}
                    className="w-full bg-cyber-dark border border-cyber-border text-white text-xs rounded-lg px-2 py-2 outline-none focus:border-cyber-green"
                  >
                    <option value="0">Default Integrated Camera (0)</option>
                    <option value="1">External USB Port 2 (1)</option>
                    <option value="2">Secondary Input Port (2)</option>
                  </select>
                </div>
              )}

              {/* RTSP Stream Link */}
              {sourceType === 'rtsp' && (
                <div>
                  <label className="block text-[9px] font-orbitron text-cyber-muted mb-1.5">NETWORK RTSP STREAM URI</label>
                  <input 
                    type="text" 
                    value={rtspUrl}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    placeholder="rtsp://admin:pass@ip:port/h264" 
                    className="w-full bg-cyber-dark border border-cyber-border text-white text-xs rounded-lg px-2.5 py-2 outline-none focus:border-cyber-orange"
                  />
                  <span className="text-[8px] text-cyber-muted mt-1.5 block">Note: FFmpeg requires valid network camera RTSP codecs.</span>
                </div>
              )}

            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 rounded-lg border border-cyber-cyan bg-cyber-cyan/15 hover:bg-cyber-cyan text-cyber-cyan hover:text-black font-orbitron text-xs font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-neon-cyan"
            >
              <Plus size={16} />
              <span>INITIALIZE STREAM PIPELINE</span>
            </button>
          </form>
        </div>
      </div>

      {/* Cameras Registry List (Column 2 & 3 - 2/3) */}
      <div className="glass-panel border-cyber-border/40 p-5 flex flex-col h-full lg:col-span-2">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyber-border">
          <h3 className="text-xs font-orbitron font-bold tracking-widest text-cyber-cyan">
            ACTIVE CAMERA NODES REGISTRY
          </h3>
          <button 
            onClick={refreshData}
            className="text-[10px] text-cyber-muted hover:text-white flex items-center gap-1.5 font-orbitron"
          >
            <ListRestart size={12} />
            REFRESH NODES
          </button>
        </div>

        {/* Scrollable grid list of camera entries */}
        <div className="flex-grow overflow-y-auto space-y-3">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="text-cyber-cyan animate-spin" size={24} />
            </div>
          ) : cameras.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-cyber-muted text-xs p-8">
              <span>No CCTV feeds configured. Add one from the stream configuration panel.</span>
            </div>
          ) : (
            <div className="border border-cyber-border/50 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-cyber-dark/80 border-b border-cyber-border text-cyber-muted font-orbitron text-[10px] tracking-wider">
                    <th className="p-3">NODE ID</th>
                    <th className="p-3">LOCATION NAME</th>
                    <th className="p-3">SOURCE URL / PATH</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/30">
                  {cameras.map((cam) => (
                    <tr key={cam.id} className="hover:bg-cyber-dark/30 transition-colors">
                      <td className="p-3 font-orbitron font-bold text-cyber-cyan">#{cam.id}</td>
                      <td className="p-3 font-semibold text-white">{cam.name}</td>
                      <td className="p-3 font-mono text-[10px] text-cyber-muted truncate max-w-[200px]" title={cam.url}>
                        {cam.url.split('\\').pop()?.split('/').pop() || cam.url}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-orbitron ${
                          cam.status === 'active' 
                            ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40 shadow-neon-green' 
                            : 'bg-cyber-magenta/25 text-cyber-magenta border border-cyber-magenta/40'
                        }`}>
                          {cam.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleDeleteCamera(cam.id)}
                          className="p-1.5 border border-cyber-border hover:border-cyber-magenta rounded text-cyber-muted hover:text-cyber-magenta transition-all"
                          title="Delete Camera Configuration"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraManager;
