import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db, Camera, AnalyticsHistory, Accident, Alert

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export")
def export_report(format: str = Query("csv", pattern="^(csv|json)$"), db: Session = Depends(get_db)):
    """
    Compiles and exports system analytics, cameras, and accident lists.
    """
    cameras = db.query(Camera).all()
    accidents = db.query(Accident).all()
    analytics = db.query(AnalyticsHistory).order_by(AnalyticsHistory.timestamp.desc()).limit(100).all()
    
    # 1. JSON Export
    if format == "json":
        data = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_cameras": len(cameras),
                "active_cameras": sum(1 for c in cameras if c.status == "active"),
                "total_logged_accidents": len(accidents),
                "unresolved_accidents": sum(1 for a in accidents if not a.resolved),
            },
            "cameras": [
                {"id": c.id, "name": c.name, "status": c.status, "url": c.url} for c in cameras
            ],
            "accidents": [
                {
                    "id": a.id,
                    "camera_id": a.camera_id,
                    "timestamp": a.timestamp.isoformat(),
                    "type": a.type,
                    "severity": a.severity,
                    "description": a.description,
                    "resolved": a.resolved
                } for a in accidents
            ],
            "analytics_log": [
                {
                    "id": l.id,
                    "camera_id": l.camera_id,
                    "timestamp": l.timestamp.isoformat(),
                    "car_count": l.car_count,
                    "bus_count": l.bus_count,
                    "truck_count": l.truck_count,
                    "total_count": l.total_count,
                    "avg_speed": l.avg_speed,
                    "congestion_rate": l.congestion_rate,
                    "traffic_status": l.traffic_status
                } for l in analytics
            ]
        }
        return JSONResponse(content=data)
        
    # 2. CSV Export
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header Info
        writer.writerow(["=== AI TRAFFIC VISION ANALYTICS REPORT ==="])
        writer.writerow(["Report Generated At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow([])
        
        # Cameras Summary
        writer.writerow(["--- CAMERA LIST ---"])
        writer.writerow(["ID", "Name", "Status", "Source URL"])
        for c in cameras:
            writer.writerow([c.id, c.name, c.status, c.url])
        writer.writerow([])
        
        # Accidents List
        writer.writerow(["--- RECORDED ACCIDENTS & INCIDENTS ---"])
        writer.writerow(["ID", "Camera ID", "Timestamp", "Type", "Severity", "Resolved", "Description"])
        for a in accidents:
            writer.writerow([a.id, a.camera_id, a.timestamp.strftime("%Y-%m-%d %H:%M:%S"), a.type, a.severity, "YES" if a.resolved else "NO", a.description])
        writer.writerow([])
        
        # Analytics Log
        writer.writerow(["--- RECENT VEHICLE LOGS (Last 100 entries) ---"])
        writer.writerow(["ID", "Camera ID", "Timestamp", "Car Count", "Bus Count", "Truck Count", "Total Count", "Avg Speed (km/h)", "Congestion Rate (%)", "Traffic Status"])
        for l in analytics:
            writer.writerow([
                l.id, l.camera_id, l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                l.car_count, l.bus_count, l.truck_count, l.total_count,
                round(l.avg_speed, 1), round(l.congestion_rate, 1), l.traffic_status
            ])
            
        output.seek(0)
        
        # Stream response
        filename = f"traffic_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers=headers
        )
