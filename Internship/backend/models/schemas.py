from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

# Camera Schemas
class CameraBase(BaseModel):
    name: str
    url: str

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsResponse(BaseModel):
    id: int
    camera_id: int
    timestamp: datetime
    car_count: int
    bus_count: int
    truck_count: int
    total_count: int
    avg_speed: float
    congestion_rate: float
    traffic_status: str

    class Config:
        from_attributes = True

# Accident Schemas
class AccidentResponse(BaseModel):
    id: int
    camera_id: int
    timestamp: datetime
    type: str
    snapshot_path: Optional[str] = None
    severity: str
    description: Optional[str] = None
    resolved: bool

    class Config:
        from_attributes = True

# Alert Schemas
class AlertResponse(BaseModel):
    id: int
    camera_id: int
    timestamp: datetime
    type: str
    message: str
    is_read: bool

    class Config:
        from_attributes = True
