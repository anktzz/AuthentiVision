# AuthentiVision: Developer Log & Project Journey

When we set out to build AuthentiVision, we wanted a robust face-swap deepfake detector that could run locally on a regular CPU without freezing. Over the course of the project, we went through multiple iterations, refactored the pipeline, and fought some really annoying dependency, color-space, and latency bugs. 

Here is the log of how this project actually evolved, the design choices we made, and how we solved our biggest roadblocks.

---

## 1. Architectural Planning & Consolidating to One Process

At the very beginning, we planned to run a split setup: a standalone React frontend server and a Python FastAPI backend server running on separate ports. But during planning, we realized this was too bloated for local use and staging. We decided to simplify:
* **Single-Process Mounting**: We configured FastAPI to mount and serve the built static React assets directly from `/frontend/dist`. Now, both the API endpoints (`/detect`, `/health`) and the frontend load from a single port.
* **School Report Setup**: To present this project at USAR, we formatted our architecture notes, file validation, and system configurations into a neat academic "student report" style, while keeping the main scripts clean.

---

## 2. Fighting Compatibility and Headless Server Bugs

Setting up the local environment presented a few tricky dependency clashes:
* **The Python 3.14 / facenet-pytorch Conflict**: The `facenet-pytorch` library has rigid, outdated version requirements for packages like NumPy and PyTorch. It completely failed to install on modern environments. We solved this by force-installing it with the `--no-deps` flag in our `setup.sh` and manually installing modern, compatible versions of NumPy and Pillow (Pillow >= 12.0.0 is needed for prebuilt wheels on newer systems).
* **Headless Linux Crashes**: When running on headless Linux servers, OpenCV kept crashing because it couldn't find graphical libraries (specifically `libxcb.so.1`). We resolved this by pinning `opencv-python-headless==4.13.0.92` as the core backend dependency.

---

## 3. Shifting to EfficientNet-B4 & Dealing with State Dicts

We started the project with a lightweight Xception classification model, but ended up upgrading to a heavier, more accurate **EfficientNet-B4** backbone. This shift introduced key-matching issues when loading the custom checkpoint (`effnb4_best.pth`):
* **State Dict Translation**: The checkpoint weights were saved with wrapper prefixes depending on how the model was initialized during training.
* **Adaptive Weight Loader**: We wrote a loader in `classifier.py` that dynamically tries four fallback key-naming patterns (such as stripping `backbone.` prefixes or prepending `efficientnet.`) to make sure different checkpoints load without crashing the FastAPI app. If a checkpoint is completely incompatible, the app handles the error gracefully, updates its health status badge, and returns a clear `503` error instead of serving corrupt logits.

---

## 4. The Color Space Mismatch (Our "Aha!" Moment)

When we first tested the pipeline on real videos, the classification accuracy was terrible. It flagged almost everything as fake—even a genuine, clean camera feed returned an 85.0% fake score. 

We spent hours digging through the pipeline and discovered a classic mismatch:
* **RGB vs BGR**: The MTCNN face detector crops faces in standard **RGB**, but the checkpoint had been fine-tuned on **BGR** face crops. By passing RGB crops directly to the classifier, we were accidentally swapping the Red and Blue color channels.
* **Normalization Alignment**: The backbone was originally using standard ImageNet normalizations, while the fine-tuned checkpoint was trained using TensorFlow-style `[-1, 1]` scaling.
* **The Fix**: We updated `preprocess.py` to convert crops using `cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)`, applied the proper `(x / 127.5) - 1.0` scaling, and padded crops with a 10px margin. The classification immediately fixed itself—the real video average fake probability dropped from 85% to a healthy 38.7%.

---

## 5. CPU Latency and the ONNX Runtime Speedup

EfficientNet-B4 is a heavy network (requiring 4.5 GFLOPs per frame). On a standard mobile CPU (like an 11th Gen Intel i3), processing 30 frames took a staggering **107.27 seconds**—unusable for a responsive web app.
* **Pytorch Optimizations Failed**: We tried PyTorch JIT tracing, dynamic quantization (int8), and BF16 precision, but none of these native methods gave us any noticeable speedup.
* **Integrating ONNX Runtime**: We set up the backend to automatically compile and export the PyTorch model to `model.onnx` on the very first startup. 
* **The Result**: Serving inference via ONNX Runtime with 4 intra-op threads reduced the 30-frame scan time from **107 seconds down to 37.20 seconds** (a 2.88x speedup) with absolutely zero change in the output logits.

---

## 6. Refining the User Interface

We iterated on the frontend UI to make it look clean and professional:
* **2-Column Layout**: Structured with the uploader dropzone and file readout on the left, and the detailed results cards on the right.
* **Interactive Scope Chart**: Upgraded the SVG line chart with vertical grid lines, Y-axis labels, a 0.5 decision threshold boundary, and hover tooltips showing exact frame numbers, timestamps, and confidence.
* **Layout Revert & Text Centering**: We reverted the vertical panel stretching to let both cards sit at their natural heights. We also cleaned up the per-frame statistics (`Min`, `Max`, `Spread` scores) centered under the graph, styling them in standard-weight sans-serif text to keep the dashboard looking clean, functional, and developer-made.
