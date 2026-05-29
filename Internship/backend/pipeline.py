import os
import cv2
import time
import queue
import math
import base64
import asyncio
import logging
import threading
from datetime import datetime
from ultralytics import YOLO
from backend.tracker import TrafficTracker
from backend.database import SessionLocal, Camera, AnalyticsHistory, Accident, Alert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VideoPipeline")

# Global variables for model sharing and thread safety
MODEL_PATH = os.path.abspath("runs/detect/train/weights/best.pt")
GLOBAL_MODEL = None
model_lock = threading.Lock()

def get_yolo_model():
    global GLOBAL_MODEL
    if GLOBAL_MODEL is None:
        logger.info(f"Loading YOLO model from {MODEL_PATH}...")
        # Load model and verify CUDA
        GLOBAL_MODEL = YOLO(MODEL_PATH)
        # Try setting device to GPU if available
        import torch
        if torch.cuda.is_available():
            GLOBAL_MODEL.to("cuda")
            logger.info("YOLO model successfully loaded on CUDA GPU.")
        else:
            GLOBAL_MODEL.to("cpu")
            logger.info("YOLO model loaded on CPU (CUDA not available or torch issue).")
    return GLOBAL_MODEL


class VideoPipeline:
    def __init__(self, camera_id: int):
        self.camera_id = camera_id
        self.running = False
        self.cap = None
        self.thread = None
        
        # Clients connected to this pipeline's WebSockets
        self.clients = set()
        
        # Tracker for vehicle analytics
        self.tracker = TrafficTracker(fps=30.0, pixels_per_meter=15.0)
        
        # Lock for thread safety on camera resource/state
        self.state_lock = threading.Lock()
        
        # Last DB record timestamp
        self.last_analytics_db_write = 0
        
        # Save snapshot settings
        self.snapshots_dir = os.path.abspath("backend/snapshots")
        os.makedirs(self.snapshots_dir, exist_ok=True)
        
    def add_client(self, websocket):
        with self.state_lock:
            self.clients.add(websocket)
            logger.info(f"Client added to camera {self.camera_id}. Total clients: {len(self.clients)}")

    def remove_client(self, websocket):
        with self.state_lock:
            if websocket in self.clients:
                self.clients.remove(websocket)
            logger.info(f"Client removed from camera {self.camera_id}. Total clients: {len(self.clients)}")
            return len(self.clients)

    def start(self):
        with self.state_lock:
            if not self.running:
                self.running = True
                self.thread = threading.Thread(target=self._run_pipeline, daemon=True)
                self.thread.start()
                logger.info(f"Pipeline thread started for camera {self.camera_id}.")

    def stop(self):
        with self.state_lock:
            self.running = False
        if self.thread:
            self.thread.join(timeout=3.0)
            logger.info(f"Pipeline thread stopped for camera {self.camera_id}.")

    def _run_pipeline(self):
        # Fetch camera details from DB
        db = SessionLocal()
        camera = db.query(Camera).filter(Camera.id == self.camera_id).first()
        if not camera:
            logger.error(f"Camera ID {self.camera_id} not found in DB.")
            db.close()
            return
            
        camera_name = camera.name
        camera_url = camera.url
        db.close()
        
        # Convert numeric camera URLs (like "0" for webcam) to integer
        if camera_url.isdigit():
            source = int(camera_url)
            is_live = True
        else:
            source = camera_url
            # RTSP feeds or local webcams are considered live streams
            is_live = camera_url.startswith("rtsp://") or camera_url.startswith("http://") or camera_url.startswith("https://") or isinstance(source, int)
            
        logger.info(f"Opening VideoCapture source: {source} for Camera '{camera_name}' (is_live={is_live})")
        self.cap = cv2.VideoCapture(source)
        
        if not self.cap.isOpened():
            logger.error(f"Failed to open source {source} for Camera {self.camera_id}")
            self._log_offline_camera()
            return
            
        # Get frame properties
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or math.isnan(fps):
            fps = 30.0
        self.tracker.update_fps(fps)
        
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width <= 0 or height <= 0:
            width, height = 1280, 720
            
        logger.info(f"Camera {self.camera_id} Stream: {width}x{height} @ {fps} FPS")
        
        # Load model once
        model = get_yolo_model()
        
        frame_count = 0
        loop_count = 0
        
        # Queue and background thread for live streams (discards backlog to ensure zero lag)
        frame_queue = queue.Queue(maxsize=1)
        
        def _live_reader_worker():
            while True:
                with self.state_lock:
                    if not self.running:
                        break
                ret, frame_read = self.cap.read()
                if not ret:
                    break
                if frame_queue.full():
                    try:
                        frame_queue.get_nowait() # drop old frame
                    except queue.Empty:
                        pass
                frame_queue.put(frame_read)
        
        if is_live:
            reader_thread = threading.Thread(target=_live_reader_worker, daemon=True)
            reader_thread.start()
            
        while True:
            with self.state_lock:
                if not self.running:
                    break
            
            # Read frame based on feed type
            if is_live:
                try:
                    # Wait for next frame from live reader thread (max 2.0 seconds)
                    frame = frame_queue.get(timeout=2.0)
                except queue.Empty:
                    logger.warning(f"Timeout waiting for live frame on Camera {self.camera_id}")
                    continue
            else:
                ret, frame = self.cap.read()
                if not ret:
                    # If it's a file, loop it
                    if isinstance(source, str) and (source.endswith('.mp4') or source.endswith('.avi') or source.endswith('.mov')):
                        loop_count += 1
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        logger.info(f"Looping video file source for Camera {self.camera_id} (loop {loop_count})")
                        continue
                    else:
                        logger.warning(f"Connection lost for Camera {self.camera_id} stream.")
                        self._log_offline_camera()
                        break
                        
            frame_count += 1
            
            # OPTIMIZATION: Resize standard frame to native 640 width for ultra-high FPS
            process_width = 640
            process_height = int(height * (process_width / width))
            frame_resized = cv2.resize(frame, (process_width, process_height))
            
            start_time = time.time()
            
            # YOLO tracking inference
            yolo_tracks = []
            with model_lock:
                # Run YOLO tracking with custom model best.pt
                # Force CUDA execution and use ByteTrack to avoid optical flow CPU bottlenecks
                results = model.track(
                    source=frame_resized, 
                    persist=True, 
                    verbose=False,
                    conf=0.25,
                    iou=0.45,
                    device="cuda",
                    tracker="bytetrack.yaml"
                )
                
            # Parse predictions
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    # Check if box has an tracking id
                    if box.id is not None:
                        track_id = int(box.id[0])
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        # Get bbox coordinates [x1, y1, x2, y2]
                        x1, y1, x2, y2 = map(float, box.xyxy[0])
                        
                        cls_name = model.names[cls_id]
                        # Our custom classes are car, bus, truck. We verify and filter.
                        if cls_name in ["car", "bus", "truck"]:
                            yolo_tracks.append({
                                "id": track_id,
                                "bbox": [x1, y1, x2, y2],
                                "class": cls_name,
                                "conf": conf
                            })
                            
            # Update tracker and calculate analytics + check accidents
            active_tracks, new_alerts = self.tracker.update(yolo_tracks, process_width, process_height)
            
            # Handle alerts: database logging and emergency snapshots
            self._handle_alerts(new_alerts, frame_resized, camera_name)
            
            # Periodically write metrics to SQLite database (every 2 seconds)
            current_time = time.time()
            if current_time - self.last_analytics_db_write > 2.0:
                metrics = self.tracker.get_metrics(len(active_tracks))
                self._log_analytics(metrics, len(active_tracks))
                self.last_analytics_db_write = current_time
                
            # Draw overlay on frame
            # 1. Draw lanes line (visual boundary)
            line_y_pixel = int(self.tracker.line_y * process_height)
            cv2.line(frame_resized, (0, line_y_pixel), (process_width, line_y_pixel), (0, 240, 255), 2)
            cv2.putText(frame_resized, "LANE TRIGGER LINE", (10, line_y_pixel - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 240, 255), 1, cv2.LINE_AA)
            
            # 2. Draw vehicle bounding boxes
            for trk in active_tracks:
                x1, y1, x2, y2 = trk["bbox"]
                track_id = trk["id"]
                cls_name = trk["class"]
                speed = trk["speed"]
                
                # Assign neon colors based on class (BGR format)
                if cls_name == "car":
                    color = (255, 240, 0)      # Cyber Cyan
                elif cls_name == "bus":
                    color = (65, 240, 13)       # Matrix Green
                elif cls_name == "truck":
                    color = (0, 183, 255)      # Amber Orange
                else:
                    color = (255, 0, 85)       # Cyber Magenta
                    
                # Draw glowing box effect (two boxes: inner and outer)
                cv2.rectangle(frame_resized, (x1, y1), (x2, y2), color, 2)
                
                # Label content: "CAR #3 | 54 km/h"
                label = f"{cls_name.upper()} #{track_id} | {int(speed)} km/h"
                
                # Draw text background
                (w_lbl, h_lbl), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
                cv2.rectangle(frame_resized, (x1, y1 - h_lbl - 6), (x1 + w_lbl + 10, y1), color, -1)
                # Write text in black on the colored header
                cv2.putText(frame_resized, label, (x1 + 5, y1 - 4), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
                
                # Draw tracking dot (centroid)
                cx, cy = trk["center"]
                cv2.circle(frame_resized, (cx, cy), 3, color, -1)
                
            # 3. Draw overall overlay info (FPS, Active, Congestion)
            inference_time = time.time() - start_time
            current_fps = 1.0 / max(0.001, inference_time)
            
            # UI Info Panel (Glassmorphism overlay simulation)
            cv2.rectangle(frame_resized, (0, 0), (process_width, 45), (15, 10, 5), -1)
            cv2.line(frame_resized, (0, 45), (process_width, 45), (0, 240, 255), 1)
            
            metrics = self.tracker.get_metrics(len(active_tracks))
            stats_text = f"CAMS ACTIVE | VEHICLES IN FRAME: {len(active_tracks)} | CARS: {metrics['cars']} | BUSES: {metrics['buses']} | TRUCKS: {metrics['trucks']}"
            cv2.putText(frame_resized, stats_text, (15, 27), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 240, 255), 1, cv2.LINE_AA)
                        
            fps_text = f"FPS: {current_fps:.1f} | DENSITY: {metrics['congestion_rate']}% | STATUS: {metrics['status'].upper()}"
            cv2.putText(frame_resized, fps_text, (process_width - 240, 27), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 255), 1, cv2.LINE_AA)
            
            # Encode frame to Base64 JPEG for websockets
            _, buffer = cv2.imencode('.jpg', frame_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Construct websocket payload
            payload = {
                "frame": f"data:image/jpeg;base64,{frame_base64}",
                "fps": round(current_fps, 1),
                "metrics": {
                    "active_count": len(active_tracks),
                    "cars": metrics["cars"],
                    "buses": metrics["buses"],
                    "trucks": metrics["trucks"],
                    "lane_counts": metrics["lane_counts"],
                    "congestion_rate": metrics["congestion_rate"],
                    "status": metrics["status"]
                },
                "active_tracks": active_tracks
            }
            
            # Send message asynchronously to all clients
            self._broadcast_to_clients(payload)
            
            # Speed control:
            # - For live feeds, frame rate is dictated by incoming camera frames (no sleep)
            # - For files, we process as fast as possible, using a tiny 1ms sleep to prevent CPU thread starvation
            if not is_live:
                time.sleep(0.001)
            
        self.cap.release()
        logger.info(f"VideoCapture released for Camera {self.camera_id}")

    def _broadcast_to_clients(self, payload):
        if not self.clients:
            return
            
        # Get the running asyncio loop or start one if running in separate thread
        # In FastAPI, we can use asyncio.run_coroutine_threadsafe to send messages
        loop = None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running loop, try fetching loop from clients (or use the one in main thread)
            pass
            
        # Broadcast asynchronously
        for client in list(self.clients):
            try:
                # Run the sending task
                coro = client.send_json(payload)
                if loop and loop.is_running():
                    asyncio.run_coroutine_threadsafe(coro, loop)
                else:
                    # Fallback if no loop is running
                    asyncio.run(coro)
            except Exception as e:
                # Websocket might have disconnected
                logger.error(f"Error sending message to socket: {e}")
                self.clients.discard(client)

    def _handle_alerts(self, alerts, frame, camera_name):
        if not alerts:
            return
            
        db = SessionLocal()
        try:
            for alert in alerts:
                # 1. Trigger snapshot saving for accidents
                snapshot_file = None
                if alert["type"] == "accident":
                    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_name = f"accident_cam{self.camera_id}_{timestamp_str}_{alert['track_id']}.jpg"
                    snapshot_path = os.path.join(self.snapshots_dir, snapshot_name)
                    
                    # Draw a red warning overlay on the frame before saving
                    snapshot_frame = frame.copy()
                    x1, y1, x2, y2 = alert["bbox"]
                    cv2.rectangle(snapshot_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    cv2.putText(snapshot_frame, "ACCIDENT ALERT", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    
                    cv2.imwrite(snapshot_path, snapshot_frame)
                    # Use relative path for web access
                    snapshot_file = f"/snapshots/{snapshot_name}"
                    logger.warning(f"Accident snapshot saved: {snapshot_path}")
                    
                    # Log Accident in DB
                    db_accident = Accident(
                        camera_id=self.camera_id,
                        timestamp=datetime.utcnow(),
                        type=alert["description"].split(":")[0],  # Short type
                        snapshot_path=snapshot_file,
                        severity=alert["severity"],
                        description=alert["message"],
                        resolved=False
                    )
                    db.add(db_accident)
                    
                # Log Alert in DB
                db_alert = Alert(
                    camera_id=self.camera_id,
                    timestamp=datetime.utcnow(),
                    type=alert["type"],
                    message=alert["message"],
                    is_read=False
                )
                db.add(db_alert)
                
            db.commit()
        except Exception as e:
            logger.error(f"Error handling alerts in DB: {e}")
            db.rollback()
        finally:
            db.close()

    def _log_analytics(self, metrics, active_count):
        db = SessionLocal()
        try:
            # Estimate speed
            speeds = [trk["speed"] for trk in self.tracker.track_speeds.values() if trk]
            avg_speed = sum(speeds) / len(speeds) if speeds else 45.0 # fallback average speed
            
            # Log to DB
            db_history = AnalyticsHistory(
                camera_id=self.camera_id,
                timestamp=datetime.utcnow(),
                car_count=metrics["cars"],
                bus_count=metrics["buses"],
                truck_count=metrics["trucks"],
                total_count=active_count,
                avg_speed=avg_speed,
                congestion_rate=metrics["congestion_rate"],
                traffic_status=metrics["status"]
            )
            db.add(db_history)
            db.commit()
        except Exception as e:
            logger.error(f"Error logging analytics to DB: {e}")
            db.rollback()
        finally:
            db.close()

    def _log_offline_camera(self):
        db = SessionLocal()
        try:
            # Update camera status to offline
            cam = db.query(Camera).filter(Camera.id == self.camera_id).first()
            if cam:
                cam.status = "offline"
                db.commit()
                
            # Log alert
            alert = Alert(
                camera_id=self.camera_id,
                timestamp=datetime.utcnow(),
                type="camera_offline",
                message=f"Critical Alert: Connection lost to Camera '{cam.name if cam else self.camera_id}'. Feed is offline.",
                is_read=False
            )
            db.add(alert)
            db.commit()
        except Exception as e:
            logger.error(f"Error updating offline status in DB: {e}")
            db.rollback()
        finally:
            db.close()


# Registry of running pipelines
# camera_id -> VideoPipeline
active_pipelines = {}
pipelines_lock = threading.Lock()

def start_camera_pipeline(camera_id: int):
    with pipelines_lock:
        if camera_id not in active_pipelines:
            pipeline = VideoPipeline(camera_id)
            pipeline.start()
            active_pipelines[camera_id] = pipeline
        return active_pipelines[camera_id]

def get_camera_pipeline(camera_id: int):
    with pipelines_lock:
        return active_pipelines.get(camera_id)

def stop_camera_pipeline(camera_id: int):
    with pipelines_lock:
        if camera_id in active_pipelines:
            pipeline = active_pipelines.pop(camera_id)
            pipeline.stop()
            logger.info(f"Pipeline removed from active registry for camera {camera_id}.")
