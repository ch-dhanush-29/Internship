import axios from 'axios';

const PORT = 8000;
export const API_BASE_URL = `http://127.0.0.1:${PORT}/api`;
export const WS_BASE_URL = `ws://127.0.0.1:${PORT}/api`;
export const STATIC_BASE_URL = `http://127.0.0.1:${PORT}`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getCameras = async () => {
  const response = await api.get('/cameras');
  return response.data;
};

export const addCamera = async (cameraData) => {
  const response = await api.post('/cameras', cameraData);
  return response.data;
};

export const deleteCamera = async (cameraId) => {
  const response = await api.delete(`/cameras/${cameraId}`);
  return response.data;
};

export const getRealtimeStats = async () => {
  const response = await api.get('/analytics/realtime');
  return response.data;
};

export const getHistoricalStats = async () => {
  const response = await api.get('/analytics/historical');
  return response.data;
};

export const getAccidents = async () => {
  const response = await api.get('/analytics/accidents');
  return response.data;
};

export const resolveAccident = async (accidentId) => {
  const response = await api.post(`/analytics/accidents/${accidentId}/resolve`);
  return response.data;
};

export const getAlerts = async () => {
  const response = await api.get('/analytics/alerts');
  return response.data;
};

export const readAllAlerts = async () => {
  const response = await api.post('/analytics/alerts/read-all');
  return response.data;
};

export const getVideos = async () => {
  const response = await api.get('/videos');
  return response.data;
};

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getExportReportUrl = (format = 'csv') => {
  return `${API_BASE_URL}/reports/export?format=${format}`;
};
export default api;
