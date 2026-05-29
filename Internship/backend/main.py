import os
import sys
import asyncio

# Resolve relative path imports if executed directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.database import init_db, get_db, Camera
from backend.api import camera, video, analytics, reports
from backend.pipeline import start_camera_pipeline, get_camera_pipeline, stop_camera_pipeline

app = FastAPI(
    title="AI Traffic Vision API",
    description="Real-time GPU-accelerated Smart Traffic Monitoring and Accident Detection Platform",
    version="1.0.0"
)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database
init_db()

# Create directories for static files if they don't exist
os.makedirs(os.path.abspath("backend/uploads"), exist_ok=True)
os.makedirs(os.path.abspath("backend/snapshots"), exist_ok=True)

# Mount static files to access uploaded videos and accident snapshots
app.mount("/uploads", StaticFiles(directory=os.path.abspath("backend/uploads")), name="uploads")
app.mount("/snapshots", StaticFiles(directory=os.path.abspath("backend/snapshots")), name="snapshots")

# Register REST Routers
app.include_router(camera.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Traffic Vision",
        "version": "1.0.0",
        "gpu_acceleration": True
    }


@app.websocket("/api/live-detection/{camera_id}")
async def websocket_live_detection(websocket: WebSocket, camera_id: int):
    """
    WebSocket endpoint for real-time video frame and traffic metrics streaming.
    Dynamically spawns the YOLO inference pipeline if it's the first watcher, 
    and stops the pipeline when the last watcher disconnects.
    """
    await websocket.accept()
    print(f"WebSocket connected for Camera {camera_id}")
    
    # 1. Verify Camera exists in DB
    db = next(get_db())
    camera_record = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera_record:
        await websocket.send_json({"error": "Camera not found in database."})
        await websocket.close()
        return
    db.close()
    
    # 2. Start or fetch pipeline
    pipeline = start_camera_pipeline(camera_id)
    pipeline.add_client(websocket)
    
    try:
        # Keep connection open and listen for client messages/parameters (if any)
        while True:
            # Check for messages from client (e.g. ROI changes, speed limit adjustments)
            # This is non-blocking or blocking read on client commands
            data = await websocket.receive_json()
            
            # Example message processing:
            if "line_y" in data:
                # Update lane line position dynamically
                new_line_y = float(data["line_y"])
                if 0.1 <= new_line_y <= 0.9:
                    pipeline.tracker.line_y = new_line_y
                    print(f"Updated Lane Crossing Y line to {new_line_y} for Camera {camera_id}")
                    
            if "reset_counts" in data:
                pipeline.tracker.counted_ids.clear()
                pipeline.tracker.lane_counts = {"lane_1": 0, "lane_2": 0}
                pipeline.tracker.classifications = {"car": 0, "bus": 0, "truck": 0}
                pipeline.tracker.recorded_ids_classes.clear()
                print(f"Reset counts for Camera {camera_id}")
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for Camera {camera_id}")
    finally:
        # 3. Clean up client from pipeline
        remaining_clients = pipeline.remove_client(websocket)
        
        # If no more clients are watching this camera, stop the YOLO pipeline to free GPU memory
        if remaining_clients == 0:
            print(f"No clients remaining for Camera {camera_id}. Shutting down pipeline in 5 seconds if idle...")
            # We wait 5 seconds before stopping in case of page refresh
            await asyncio.sleep(5.0)
            # Recheck if clients are still 0
            if len(pipeline.clients) == 0:
                stop_camera_pipeline(camera_id)
                print(f"Pipeline stopped for Camera {camera_id} due to inactivity.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
