# single-process entry point: serves the built React app + the /detect API, run with `uvicorn main:app`
import base64
import tempfile
import time
import uuid
from pathlib import Path

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from pipeline.aggregate import aggregate_scores
from pipeline.classifier import DeepfakeClassifier
from pipeline.face_detector import detect_faces
from pipeline.frame_extraction import extract_frames
from pipeline.preprocess import IMAGE_SIZE, preprocess_faces
from utils.validation import is_allowed_extension, max_file_size_bytes

BACKEND_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"
NUM_SAMPLED_FRAMES = 30
THUMBNAIL_WIDTH = 160

app = FastAPI(title="Face-Swap Deepfake Detector")
classifier = DeepfakeClassifier()  # loaded once at startup, reused across every request


def _make_thumbnail(frame_bgr):
    h, w = frame_bgr.shape[:2]
    if w == 0:
        return None
    scale = THUMBNAIL_WIDTH / w
    resized = cv2.resize(frame_bgr, (THUMBNAIL_WIDTH, max(1, int(h * scale))))
    ok, buf = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
    return ("data:image/jpeg;base64," + base64.b64encode(buf).decode("ascii")) if ok else None


@app.get("/health")
async def health():
    return {
        "status": "ok" if classifier.load_error is None else "degraded",
        "using_finetuned_weights": classifier.using_finetuned_weights,
        "load_error": classifier.load_error,
        "architecture": "EfficientNet-B4",
        "input_resolution": IMAGE_SIZE,
        "sampled_frames_target": NUM_SAMPLED_FRAMES,
    }


@app.post("/detect")
async def detect(video: UploadFile = File(...)):
    if classifier.load_error is not None:
        raise HTTPException(503, f"Classifier failed to load its checkpoint: {classifier.load_error}")

    if not is_allowed_extension(video.filename):
        raise HTTPException(400, "Unsupported file type. Allowed: .mp4, .mov, .avi, .mkv, .webm")

    start = time.perf_counter()

    with tempfile.TemporaryDirectory() as tmpdir:
        ext = Path(video.filename).suffix.lower()
        tmp_path = Path(tmpdir) / f"upload{ext}"

        size, max_size = 0, max_file_size_bytes()
        with open(tmp_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):
                size += len(chunk)
                if size > max_size:
                    raise HTTPException(400, "File too large (max 250 MB)")
                f.write(chunk)

        indexed_frames, fps = extract_frames(str(tmp_path), num_frames=NUM_SAMPLED_FRAMES)
        if not indexed_frames:
            raise HTTPException(400, "Could not read any frames from the video")

        detections = detect_faces(indexed_frames)  # one entry per frame, same order as indexed_frames
        crops = [d["crop"] for d in detections if d["crop"] is not None]
        if not crops:
            raise HTTPException(400, "No faces were detected in the video")

        batch = preprocess_faces(crops)
        scores = classifier.predict(batch)

        score_iter = iter(scores)  # re-associates each score with the frame its crop came from
        gallery = []
        for (frame_idx, frame_bgr), detection in zip(indexed_frames, detections):
            face_detected = detection["crop"] is not None
            score = next(score_iter) if face_detected else None
            gallery.append({
                "index": frame_idx,
                "timestamp": round(frame_idx / fps, 2) if fps else None,
                "thumbnail": _make_thumbnail(frame_bgr),
                "face_detected": face_detected,
                "fake_probability": round(score, 4) if score is not None else None,
            })

    result = aggregate_scores(scores, expected_frames=len(indexed_frames))
    result["scan_id"] = uuid.uuid4().hex[:10]
    result["frames_extracted"] = len(indexed_frames)
    result["processing_ms"] = round((time.perf_counter() - start) * 1000)
    result["using_finetuned_weights"] = classifier.using_finetuned_weights
    result["frames"] = gallery
    return result


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")  # one-process serve
else:
    print(f"[main] {FRONTEND_DIST} not found — run `npm run build` in frontend/ to enable the UI")
