import time
import math
from collections import defaultdict, deque
import numpy as np

class TrafficTracker:
    def __init__(self, fps=30.0, pixels_per_meter=15.0):
        self.fps = fps
        self.pixels_per_meter = pixels_per_meter
        
        # Track history: {track_id: deque of (x, y, timestamp)}
        self.track_history = defaultdict(lambda: deque(maxlen=30))
        
        # Track speeds: {track_id: list of speeds} for rolling average
        self.track_speeds = defaultdict(list)
        
        # Bbox history to calculate sudden deceleration and aspect ratios
        self.track_bboxes = defaultdict(lambda: deque(maxlen=30))
        
        # Lane configuration: y-coordinate of crossing line
        self.line_y = 0.6  # Normalized y (60% of frame height)
        
        # Multi-camera counted IDs to avoid double counting: {track_id: lane_crossed}
        self.counted_ids = set()
        
        # Lane counts
        self.lane_counts = {"lane_1": 0, "lane_2": 0}
        
        # Cumulative vehicle classifications
        self.classifications = {"car": 0, "bus": 0, "truck": 0}
        self.recorded_ids_classes = {}
        
        # Stopped vehicle timers: {track_id: start_timestamp}
        self.stopped_timers = {}
        
        # Triggered incidents to prevent duplicate alerts for the same event
        # Format: {(incident_type, track_id/ids): timestamp}
        self.triggered_incidents = {}
        self.incident_cooldown = 10.0  # seconds

    def update_fps(self, fps):
        if fps > 0:
            self.fps = fps

    def calculate_iou(self, boxA, boxB):
        # box: [x1, y1, x2, y2]
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        
        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0:
            return 0.0
            
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        
        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou

    def update(self, tracks, frame_width, frame_height):
        """
        tracks: list of dicts: [
            {"id": track_id, "bbox": [x1, y1, x2, y2], "class": name, "conf": confidence}
        ]
        returns: (active_tracks, new_alerts)
        """
        current_time = time.time()
        active_tracks = []
        new_alerts = []
        
        # Convert normalized line Y to pixel value
        line_y_pixel = self.line_y * frame_height
        
        current_frame_ids = set()
        
        for trk in tracks:
            track_id = trk["id"]
            bbox = trk["bbox"]
            cls_name = trk["class"]
            current_frame_ids.add(track_id)
            
            x1, y1, x2, y2 = bbox
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            
            # Record classification
            if track_id not in self.recorded_ids_classes:
                self.recorded_ids_classes[track_id] = cls_name
                self.classifications[cls_name] = self.classifications.get(cls_name, 0) + 1
            
            # Update trajectory history
            self.track_history[track_id].append((cx, cy, current_time))
            self.track_bboxes[track_id].append((x1, y1, x2, y2, current_time))
            
            # 1. SPEED ESTIMATION & DIRECTION
            speed_kmh = 0.0
            direction = "Unknown"
            
            history = self.track_history[track_id]
            if len(history) >= 2:
                # Calculate displacement over last few frames (e.g. 5 frames back or max)
                idx_prev = max(0, len(history) - 5)
                x_p, y_p, t_p = history[idx_prev]
                
                # Displacement in pixels
                disp_px = math.sqrt((cx - x_p)**2 + (cy - y_p)**2)
                time_diff = current_time - t_p
                
                if time_diff > 0:
                    # Speed = meters/sec * 3.6 = km/h
                    meters = disp_px / self.pixels_per_meter
                    speed_instant = (meters / time_diff) * 3.6
                    
                    # Smooth speed using running average
                    self.track_speeds[track_id].append(speed_instant)
                    if len(self.track_speeds[track_id]) > 10:
                        self.track_speeds[track_id].pop(0)
                    speed_kmh = sum(self.track_speeds[track_id]) / len(self.track_speeds[track_id])
                
                # Direction calculation
                dx = cx - history[0][0]
                dy = cy - history[0][1]
                if abs(dy) > abs(dx):
                    direction = "South" if dy > 0 else "North"
                else:
                    direction = "East" if dx > 0 else "West"
            
            # 2. LANE COUNTING (CROSSING LINE)
            # Check crossing
            if len(history) >= 2 and track_id not in self.counted_ids:
                prev_cy = history[-2][1]
                # Did it cross the line_y_pixel?
                # Direction South: prev_cy < line_y_pixel <= cy
                # Direction North: prev_cy > line_y_pixel >= cy
                crossed = False
                if (prev_cy < line_y_pixel <= cy) or (prev_cy > line_y_pixel >= cy):
                    crossed = True
                
                if crossed:
                    self.counted_ids.add(track_id)
                    # Determine lane by horizontal coordinate (left half vs right half)
                    if cx < frame_width / 2.0:
                        self.lane_counts["lane_1"] += 1
                        crossed_lane = "lane_1"
                    else:
                        self.lane_counts["lane_2"] += 1
                        crossed_lane = "lane_2"
            
            # 3. ACCIDENT / ANOMALY DETECTIONS
            # Heuristic A: Stopped Vehicle
            if speed_kmh < 3.0:
                if track_id not in self.stopped_timers:
                    self.stopped_timers[track_id] = current_time
                else:
                    stopped_duration = current_time - self.stopped_timers[track_id]
                    # Alert if stopped for > 5 seconds in active roadway (y between 15% and 85%)
                    if stopped_duration > 5.0 and (0.15 * frame_height < cy < 0.85 * frame_height):
                        alert_key = ("stopped_vehicle", track_id)
                        if alert_key not in self.triggered_incidents or (current_time - self.triggered_incidents[alert_key] > self.incident_cooldown):
                            self.triggered_incidents[alert_key] = current_time
                            new_alerts.append({
                                "type": "accident",
                                "severity": "high",
                                "message": f"Hazard Warning: {cls_name.upper()} (ID: {track_id}) stopped in active traffic lane.",
                                "track_id": track_id,
                                "bbox": [int(x) for x in bbox],
                                "description": f"Vehicle ID {track_id} stationary for {int(stopped_duration)} seconds."
                            })
            else:
                # Reset stopped timer if vehicle moves
                self.stopped_timers.pop(track_id, None)
                
            # Heuristic B: Overspeed Alert
            if speed_kmh > 90.0:  # > 90 km/h
                alert_key = ("overspeed", track_id)
                if alert_key not in self.triggered_incidents or (current_time - self.triggered_incidents[alert_key] > self.incident_cooldown):
                    self.triggered_incidents[alert_key] = current_time
                    new_alerts.append({
                        "type": "overspeed",
                        "severity": "medium",
                        "message": f"Overspeed Violation: {cls_name.upper()} (ID: {track_id}) traveling at {int(speed_kmh)} km/h.",
                        "track_id": track_id,
                        "bbox": [int(x) for x in bbox],
                        "description": f"Vehicle clocked at {int(speed_kmh)} km/h in 60 km/h zone."
                    })
            
            # Heuristic C: Overturned / Capsize vehicle
            # Check bounding box aspect ratio: width/height
            w = x2 - x1
            h = y2 - y1
            if h > 0:
                aspect_ratio = w / h
                # Normal cars are wider than tall (1.0 to 1.8) from high angle
                # If aspect ratio is extremely high (> 2.3) or extremely low (< 0.4) for trucks/buses/cars while stationary or slow
                if (aspect_ratio > 2.5 or aspect_ratio < 0.4) and speed_kmh < 5.0 and len(history) > 10:
                    alert_key = ("overturned_vehicle", track_id)
                    if alert_key not in self.triggered_incidents or (current_time - self.triggered_incidents[alert_key] > self.incident_cooldown):
                        self.triggered_incidents[alert_key] = current_time
                        new_alerts.append({
                            "type": "accident",
                            "severity": "high",
                            "message": f"Accident Alert: Overturned vehicle detected (ID: {track_id}, class: {cls_name}).",
                            "track_id": track_id,
                            "bbox": [int(x) for x in bbox],
                            "description": f"Critical abnormal vehicle posture (Aspect Ratio: {aspect_ratio:.2f}) at near-zero speed."
                        })
            
            active_tracks.append({
                "id": track_id,
                "bbox": [int(x) for x in bbox],
                "class": cls_name,
                "conf": float(trk["conf"]),
                "speed": round(speed_kmh, 1),
                "direction": direction,
                "center": [int(cx), int(cy)]
            })
            
        # Clean up old tracks that are no longer in frame
        for old_id in list(self.track_history.keys()):
            if old_id not in current_frame_ids:
                # If not seen for some time, delete tracking context
                # Wait, let's keep it in history but clean up if inactive for 30+ frames
                # For simplicity, if not in current frame, we pop after a timeout
                pass
                
        # Heuristic D: Collision (Between two active vehicles)
        # Check overlaps (IoU) of bboxes for current frames
        for i in range(len(tracks)):
            for j in range(i + 1, len(tracks)):
                idA, bboxA, clsA = tracks[i]["id"], tracks[i]["bbox"], tracks[i]["class"]
                idB, bboxB, clsB = tracks[j]["id"], tracks[j]["bbox"], tracks[j]["class"]
                
                iou = self.calculate_iou(bboxA, bboxB)
                
                if iou > 0.55:
                    # Check if speed of both is low (sudden crash)
                    speedA = sum(self.track_speeds[idA][-3:]) / max(1, len(self.track_speeds[idA][-3:])) if idA in self.track_speeds else 0
                    speedB = sum(self.track_speeds[idB][-3:]) / max(1, len(self.track_speeds[idB][-3:])) if idB in self.track_speeds else 0
                    
                    if speedA < 10.0 and speedB < 10.0:
                        # Ensure we don't trigger alert constantly
                        alert_key = ("collision", min(idA, idB), max(idA, idB))
                        if alert_key not in self.triggered_incidents or (current_time - self.triggered_incidents[alert_key] > self.incident_cooldown):
                            self.triggered_incidents[alert_key] = current_time
                            
                            # Combine bounding boxes for accident snap
                            x1 = min(bboxA[0], bboxB[0])
                            y1 = min(bboxA[1], bboxB[1])
                            x2 = max(bboxA[2], bboxB[2])
                            y2 = max(bboxA[3], bboxB[3])
                            
                            new_alerts.append({
                                "type": "accident",
                                "severity": "high",
                                "message": f"Critical Accident: Collision detected between ID {idA} ({clsA}) and ID {idB} ({clsB}).",
                                "track_id": f"{idA}-{idB}",
                                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                                "description": f"High impact overlap (IoU: {iou:.2f}) with immediate deceleration."
                            })
                            
        return active_tracks, new_alerts
        
    def get_metrics(self, current_active_count):
        # Calculate congestion rate
        # 0-5 vehicles: Low, 6-12: Medium, 13+: Heavy
        if current_active_count <= 4:
            congestion_rate = current_active_count * 10.0
            status = "low"
        elif current_active_count <= 10:
            congestion_rate = 40.0 + (current_active_count - 4) * 7.0
            status = "medium"
        else:
            congestion_rate = min(100.0, 82.0 + (current_active_count - 10) * 3.0)
            status = "heavy"
            
        # Get overall counts
        return {
            "cars": self.classifications["car"],
            "buses": self.classifications["bus"],
            "trucks": self.classifications["truck"],
            "lane_counts": self.lane_counts,
            "congestion_rate": round(congestion_rate, 1),
            "status": status
        }
