import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List, Dict

router = APIRouter(prefix="/videos", tags=["Videos"])

UPLOAD_DIR = os.path.abspath("backend/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    filename = file.filename
    _, ext = os.path.splitext(filename)
    
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
        
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logger_path = os.path.abspath(file_path)
        return {
            "filename": filename,
            "path": logger_path,
            "message": "Video uploaded successfully."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {e}"
        )

@router.get("", response_model=List[Dict[str, str]])
def list_videos():
    try:
        videos = []
        for file in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, file)
            if os.path.isfile(file_path) and os.path.splitext(file)[1].lower() in ALLOWED_EXTENSIONS:
                videos.append({
                    "name": file,
                    "path": os.path.abspath(file_path)
                })
        return videos
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read upload directory: {e}"
        )
