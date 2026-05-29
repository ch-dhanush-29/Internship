# AI Traffic Vision

**AI Traffic Vision** is a full-stack, GPU-accelerated, real-time Smart Traffic Monitoring and Vehicle Detection web platform. It leverages a custom-trained YOLO model (`best.pt`) to detect cars, buses, and trucks, applies multi-object tracking (MOT) using BoT-SORT/ByteTrack, and analyzes traffic flow to estimate vehicle speeds, lanes, congestion levels, and critical incidents like accidents or overspeed violations. The frontend features a dark, futuristic cyberpunk-themed dashboard built with React, Tailwind CSS, Framer Motion, and Recharts.

---

## System Architecture & Features

```
               [ CAMERA / VIDEO STREAM FEED ]
                             │
                             ▼
                     [ OPENCV INPUT ]
                             │
                             ▼
              [ YOLOv8/v11 CUDA GPU INFERENCE ]  ◄── [ best.pt weights ]
                             │
                             ▼
                 [ MULTI-OBJECT TRACKING ]
                             │
                             ▼
        [ ACCIDENT & SPEED HEURISTICS EVALUATOR ]
                             │
                             ▼
                [ SQLITE DATABASE PERSIST ]
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
  [ WEBSOCKET STREAMING ]                [ REST API SERVER ]
  (base64 JPEGs + Metrics)               (CRUD, logs, reports)
         │                                       │
         └───────────────────┬───────────────────┘
                             ▼
                [ REACT CYBERPUNK CLIENT ]
```

### Core Features
1. **Real-time Vehicle Detection & Bounding Box Overlays**: Displays track IDs, vehicle classes, and speeds directly on the frame.
2. **Velocity Estimation**: Calculates speed dynamically by measuring displacement over successive frames scaled to real-world coordinates.
3. **Lane Crossing & Counts**: Tracks vehicle entries across virtual lines, classifying them into lanes.
4. **Accident Detection Engine**:
   - **Collisions**: Flags overlaps (high IoU) accompanied by immediate decelerations.
   - **Stationary Hazards**: Flags vehicles stopped in active traffic lanes for over 5 seconds.
   - **Overturned Vehicles**: Analyzes aspect ratio anomalies at slow speeds (e.g. side rollouts).
   - **Emergency Snapshots**: Saves visual overlays of accidents in the `snapshots/` folder.
5. **Vibrant Cyberpunk UI Dashboard**:
   - Glassmorphic grids with neon border glows.
   - Interactive lane slider calibration overlay communicating via WebSockets.
   - Dynamic charts tracking historical trends and species distributions.
   - CCTV Camera CRUD management and drag-and-drop MP4 video uploader.
   - PDF/CSV analytics reports downloader.

---

## Installation & Running Locally

### 1. Prerequisites
- **Python 3.11** (pip, virtualenv)
- **Node.js 20+** & **npm**
- **NVIDIA GPU** with CUDA toolkit installed (recommended for real-time inference)

---

### 2. Backend Setup
1. Open a terminal in the root directory.
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
   *Note: Ensure `torch` (with CUDA enablement) and `ultralytics` are installed in your environment.*
3. Launch the FastAPI server:
   ```bash
   python backend/main.py
   ```
   The backend will initialize the database, pre-configure default streams, and bind to `http://localhost:8000`.

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. The Vite application is configured to proxy API requests directly to the FastAPI server.

---

## Docker Deployment (Docker Compose)

To spin up the entire multi-container environment including frontend, backend, and static file routers:

1. Ensure Docker and Docker Compose are installed.
2. To enable NVIDIA GPU inference inside container, install the **NVIDIA Container Toolkit** on the host.
3. Run the compose command:
   ```bash
   docker-compose up --build
   ```
4. Access the web dashboard at `http://localhost:3000`.

---

## Backend API Endpoints

### REST Endpoints
* **`GET /api/cameras`** - Retrieve list of all cameras.
* **`POST /api/cameras`** - Register a camera source (Webcam `0`, RTSP URL, or uploaded video file path).
* **`DELETE /api/cameras/{id}`** - Delete camera configuration.
* **`POST /api/videos/upload`** - Upload a local MP4 file to the server.
* **`GET /api/videos`** - Get all uploaded video files.
* **`GET /api/analytics/realtime`** - Consolidate current counts across all camera slots.
* **`GET /api/analytics/historical`** - Time-series aggregate counts for graphs.
* **`GET /api/analytics/accidents`** - Fetch accident incident history.
* **`POST /api/analytics/accidents/{id}/resolve`** - Resolve an accident alert.
* **`GET /api/reports/export`** - Download analytical CSV/JSON report sheets.

### WebSocket Endpoint
* **`WS /api/live-detection/{camera_id}`** - Real-time binary/JSON frame stream.
  - Sends: base64 processed frames, current FPS, metrics, active track lists.
  - Receives: `line_y` lane marker coordinates updates, `reset_counts` trigger.
