import os
import sys
import time
import torch
import cv2
from ultralytics import YOLO

# Add parent directory to path to allow direct imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.tracker import TrafficTracker

def run_pipeline_test():
    print("=== STARTING PIPELINE INTEGRATION TEST ===")
    
    # 1. Check CUDA Availability
    cuda_ok = torch.cuda.is_available()
    print(f"CUDA Available: {cuda_ok}")
    if cuda_ok:
        print(f"CUDA Device Name: {torch.cuda.get_device_name(0)}")
        
    # 2. Check Model file
    model_path = os.path.abspath("runs/detect/train/weights/best.pt")
    print(f"Model Path: {model_path}")
    if not os.path.exists(model_path):
        print(f"Error: Model file does not exist at {model_path}")
        return
    else:
        print("Model file exists. OK.")
        
    # 3. Check Video File
    video_path = os.path.abspath("person-bicycle-car-detection.mp4")
    print(f"Video Path: {video_path}")
    if not os.path.exists(video_path):
        print(f"Error: Test video file does not exist at {video_path}")
        return
    else:
        print("Test video file exists. OK.")
        
    # 4. Load YOLO Model
    print("Loading custom model...")
    t0 = time.time()
    model = YOLO(model_path)
    if cuda_ok:
        model.to("cuda")
    print(f"Model loaded in {time.time() - t0:.2f} seconds.")
    print("Model classes mapping:", model.names)
    
    # 5. Open Video and Process 30 Frames
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video file.")
        return
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    print(f"Video metrics: {width}x{height} @ {fps} FPS")
    
    # Initialize Tracker
    tracker = TrafficTracker(fps=fps, pixels_per_meter=15.0)
    
    print("\nProcessing 30 frames through GPU/CPU tracking pipeline...")
    frame_idx = 0
    t_start = time.time()
    
    while frame_idx < 30:
        ret, frame = cap.read()
        if not ret:
            print("Video ended early.")
            break
            
        frame_idx += 1
        
        # Resize frame
        process_width = 800
        process_height = int(height * (process_width / width))
        frame_resized = cv2.resize(frame, (process_width, process_height))
        
        # Run tracking
        results = model.track(frame_resized, persist=True, verbose=False)
        
        # Extract bboxes
        tracks = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for box in boxes:
                if box.id is not None:
                    track_id = int(box.id[0])
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    cls_name = model.names[cls_id]
                    
                    if cls_name in ["car", "bus", "truck"]:
                        tracks.append({
                            "id": track_id,
                            "bbox": [x1, y1, x2, y2],
                            "class": cls_name,
                            "conf": conf
                        })
                        
        # Update tracker heuristics
        active_tracks, alerts = tracker.update(tracks, process_width, process_height)
        
        if frame_idx % 10 == 0:
            metrics = tracker.get_metrics(len(active_tracks))
            print(f"Frame {frame_idx:02d}: Bboxes in frame={len(active_tracks)} | "
                  f"Total Cars={metrics['cars']}, Buses={metrics['buses']}, Trucks={metrics['trucks']} | "
                  f"Congestion={metrics['congestion_rate']}%")
            if alerts:
                for alert in alerts:
                    print(f"   [ALERT]: {alert['message']}")
                    
    total_time = time.time() - t_start
    avg_fps = frame_idx / total_time
    print(f"\nIntegration test complete. processed {frame_idx} frames in {total_time:.2f}s.")
    print(f"Average Pipeline FPS: {avg_fps:.1f} frames/sec")
    
    cap.release()
    print("=== PIPELINE TEST COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_pipeline_test()
