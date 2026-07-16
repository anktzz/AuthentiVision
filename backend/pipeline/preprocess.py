# resizes + normalizes each face crop for EfficientNet-B4, which expects 380x380 input
import cv2
import numpy as np
import torch

IMAGE_SIZE = 380  # EfficientNet-B4's native training resolution
def preprocess_faces(face_crops):
    tensors = []
    for crop in face_crops:
        # The input crops from face_detector.py are in RGB.
        # The model was fine-tuned on BGR face crops, so we convert back to BGR.
        bgr = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
        resized = cv2.resize(bgr, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_AREA)  # match training resolution
        normalized = (resized.astype(np.float32) / 127.5) - 1.0  # TF-style [-1, 1] scaling
        tensors.append(torch.from_numpy(normalized).permute(2, 0, 1).contiguous())
    return torch.stack(tensors)
