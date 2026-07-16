# detects + crops one face per sampled frame, CPU only, one output entry per input frame (aligned order)
import cv2
from facenet_pytorch import MTCNN

_mtcnn = MTCNN(keep_all=False, device="cpu", post_process=False)


def detect_faces(indexed_frames, margin=10):
    results = []
    for idx, frame in indexed_frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        crop = None
        try:
            boxes, _ = _mtcnn.detect(rgb)
        except Exception:
            boxes = None  # treat a detector error as "no face" rather than failing the request
        if boxes is not None:
            x1, y1, x2, y2 = [int(v) for v in boxes[0]]
            h, w = rgb.shape[:2]
            x1, y1 = max(0, x1 - margin), max(0, y1 - margin)
            x2, y2 = min(w, x2 + margin), min(h, y2 + margin)
            if x2 > x1 and y2 > y1:
                crop = rgb[y1:y2, x1:x2]
        results.append({"index": idx, "crop": crop})
    return results
