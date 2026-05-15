from ultralytics import YOLO

# Load pretrained YOLO model
model = YOLO("yolo11n.pt")

# Run detection on an image
results = model("https://ultralytics.com/images/bus.jpg", save=True)

print("Detection completed")