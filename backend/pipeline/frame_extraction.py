# samples evenly-spaced frames from a video, returning each with its original index + the video's fps
import cv2
import numpy as np


def extract_frames(video_path, num_frames=30):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return [], 0.0

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    indexed_frames = []

    if total > 0:
        indices = np.linspace(0, total - 1, min(num_frames, total)).astype(int)  # fast path: seek directly
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, frame = cap.read()
            if ok:
                indexed_frames.append((int(idx), frame))
    else:
        all_frames, i = [], 0  # fallback for containers with unreliable frame counts
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            all_frames.append((i, frame))
            i += 1
        if all_frames:
            sel = np.linspace(0, len(all_frames) - 1, min(num_frames, len(all_frames))).astype(int)
            indexed_frames = [all_frames[i] for i in sel]

    cap.release()
    return indexed_frames, fps
