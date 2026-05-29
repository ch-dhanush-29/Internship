import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///./traffic_vision.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)  # RTSP stream URL, Webcam ID (e.g. '0'), or path to video file
    status = Column(String, default="active")  # 'active', 'offline'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    analytics = relationship("AnalyticsHistory", back_populates="camera", cascade="all, delete-orphan")
    accidents = relationship("Accident", back_populates="camera", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="camera", cascade="all, delete-orphan")

class AnalyticsHistory(Base):
    __tablename__ = "analytics_history"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    car_count = Column(Integer, default=0)
    bus_count = Column(Integer, default=0)
    truck_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    
    avg_speed = Column(Float, default=0.0)  # in km/h
    congestion_rate = Column(Float, default=0.0)  # percentage (0-100)
    traffic_status = Column(String, default="low")  # 'low', 'medium', 'heavy'

    # Relationships
    camera = relationship("Camera", back_populates="analytics")

class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    type = Column(String, nullable=False)  # 'collision', 'stopped_vehicle', 'overturned_vehicle', 'erratic_motion'
    snapshot_path = Column(String, nullable=True)  # path to screenshot
    severity = Column(String, default="medium")  # 'low', 'medium', 'high'
    description = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)

    # Relationships
    camera = relationship("Camera", back_populates="accidents")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    type = Column(String, nullable=False)  # 'accident', 'congestion', 'overspeed', 'camera_offline'
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)

    # Relationships
    camera = relationship("Camera", back_populates="alerts")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Pre-populate default cameras if empty
    db = SessionLocal()
    try:
        if db.query(Camera).count() == 0:
            demo_video = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "person-bicycle-car-detection.mp4")
            demo_video = os.path.abspath(demo_video)
            
            # Default cameras
            c1 = Camera(name="Main Highway - Westbound", url=demo_video, status="active")
            c2 = Camera(name="Intersection 4th Avenue", url="0", status="active") # Webcam 0
            
            db.add_all([c1, c2])
            db.commit()
            print("Database initialized with default cameras.")
    except Exception as e:
        print(f"Error initializing DB: {e}")
        db.rollback()
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
