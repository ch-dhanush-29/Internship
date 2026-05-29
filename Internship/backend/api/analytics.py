from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random
from backend.database import get_db, AnalyticsHistory, Accident, Alert, Camera
from backend.models.schemas import AnalyticsResponse, AccidentResponse, AlertResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/realtime")
def get_realtime_stats(db: Session = Depends(get_db)):
    """
    Returns consolidated current traffic stats across all active cameras.
    """
    # Find all cameras
    cameras = db.query(Camera).all()
    
    total_vehicles = 0
    total_cars = 0
    total_buses = 0
    total_trucks = 0
    total_speed = 0.0
    active_cameras_count = 0
    congestion_sum = 0.0
    
    for cam in cameras:
        # Get latest analytics record for this camera
        latest = db.query(AnalyticsHistory)\
                    .filter(AnalyticsHistory.camera_id == cam.id)\
                    .order_by(AnalyticsHistory.timestamp.desc())\
                    .first()
        
        if latest:
            active_cameras_count += 1
            total_vehicles += latest.total_count
            total_cars += latest.car_count
            total_buses += latest.bus_count
            total_trucks += latest.truck_count
            total_speed += latest.avg_speed
            congestion_sum += latest.congestion_rate
            
    avg_speed = total_speed / active_cameras_count if active_cameras_count > 0 else 0.0
    avg_congestion = congestion_sum / active_cameras_count if active_cameras_count > 0 else 0.0
    
    # Calculate vehicle types ratio
    total_typed = total_cars + total_buses + total_trucks
    if total_typed == 0:
        # No metrics yet
        car_p, bus_p, truck_p = 0, 0, 0
    else:
        car_p = int((total_cars / total_typed) * 100)
        bus_p = int((total_buses / total_typed) * 100)
        truck_p = int((total_trucks / total_typed) * 100)
        
    return {
        "active_cameras": len(cameras),
        "online_cameras": sum(1 for c in cameras if c.status == "active"),
        "total_vehicles_detected": total_vehicles,
        "average_speed": round(avg_speed, 1),
        "average_congestion": round(avg_congestion, 1),
        "vehicle_distribution": {
            "cars": car_p,
            "buses": bus_p,
            "trucks": truck_p
        },
        "congestion_status": "Heavy" if avg_congestion > 70 else "Moderate" if avg_congestion > 40 else "Fluid"
    }

@router.get("/historical")
def get_historical_analytics(db: Session = Depends(get_db)):
    """
    Returns actual time-series records from the SQLite database.
    """
    records = db.query(AnalyticsHistory).order_by(AnalyticsHistory.timestamp.asc()).all()
    
    chart_data = []
    # Return actual logs from SQLite
    for r in records:
        chart_data.append({
            "time": r.timestamp.strftime("%H:%M:%S"),
            "vehicles": r.total_count,
            "cars": r.car_count,
            "buses": r.bus_count,
            "trucks": r.truck_count,
            "speed": round(r.avg_speed, 1),
            "congestion": round(r.congestion_rate, 1)
        })
            
    return chart_data

@router.get("/accidents", response_model=List[AccidentResponse])
def get_accidents(db: Session = Depends(get_db)):
    return db.query(Accident).order_by(Accident.timestamp.desc()).all()

@router.post("/accidents/{accident_id}/resolve", response_model=AccidentResponse)
def resolve_accident(accident_id: int, db: Session = Depends(get_db)):
    accident = db.query(Accident).filter(Accident.id == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident event not found")
        
    accident.resolved = True
    db.commit()
    db.refresh(accident)
    return accident

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), limit: int = 50):
    return db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()

@router.post("/alerts/read-all")
def read_all_alerts(db: Session = Depends(get_db)):
    db.query(Alert).filter(Alert.is_read == False).update({Alert.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All alerts marked as read."}
