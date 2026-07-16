# loads an EfficientNet-B4 checkpoint (CPU only, no network calls) and exposes predict()
from pathlib import Path
import warnings

import torch

from .backbone import EfficientNetB4

WEIGHTS_DIR = Path(__file__).resolve().parent.parent / "models" / "weights"


def _strip_prefix(state_dict, prefix):
    return {
        k[len(prefix) :] if k.startswith(prefix) else k: v
        for k, v in state_dict.items()
    }  # drop a leading prefix


def _add_prefix(state_dict, prefix):
    return {
        prefix + k: v for k, v in state_dict.items()
    }  # add a leading prefix to every key


class DeepfakeClassifier:
    def __init__(self):
        self.using_finetuned_weights = False
        self.load_error = None
        self.ort_session = None
        self.model = EfficientNetB4(
            num_classes=2
        )  # random weights until a checkpoint loads below

        weights_path = self._find_weights_file()
        if weights_path is None:
            self.load_error = f"No .pt/.pth checkpoint found in {WEIGHTS_DIR}"
            print(f"[classifier] WARNING: {self.load_error}")
        else:
            self._load_checkpoint(weights_path)

        self.model.eval()
        
        # If successfully loaded weights, try to initialize ONNX Runtime session for speedup
        if self.using_finetuned_weights and self.load_error is None:
            self._init_onnx_runtime()

    def _find_weights_file(self):
        matches = sorted(WEIGHTS_DIR.glob("*.pt")) + sorted(
            WEIGHTS_DIR.glob("*.pth")
        )  # accepts either extension
        return matches[0] if matches else None

    def _load_checkpoint(self, weights_path):
        raw = torch.load(weights_path, map_location="cpu")
        if isinstance(raw, dict) and "state_dict" in raw:
            raw = raw["state_dict"]  # unwrap a training-script checkpoint dict
        elif isinstance(raw, dict) and "model" in raw:
            raw = raw["model"]

        # --- NEW CODE START ---
        fixed_raw = {}
        for k, v in raw.items():
            # 1. Drop BatchNorm tracking keys that ruin strict=True
            if "num_batches_tracked" in k:
                continue

            # 2. Strip "backbone." if it exists (from the EfficientDetector wrapper)
            if k.startswith("backbone."):
                k = k.replace("backbone.", "", 1)

            # 3. Rename "last_layer" to "efficientnet._fc"
            if k.startswith("last_layer."):
                k = k.replace("last_layer.", "efficientnet._fc.", 1)

            fixed_raw[k] = v

        raw = fixed_raw
        # --- NEW CODE END ---

        # candidates loop remains exactly the same
        candidates = [
            raw,
            _strip_prefix(raw, "backbone."),
            _add_prefix(raw, "efficientnet."),
            _add_prefix(_strip_prefix(raw, "backbone."), "efficientnet."),
        ]

        last_error = None
        for state in candidates:
            trial = EfficientNetB4(num_classes=2)
            try:
                trial.load_state_dict(state, strict=True)
            except Exception as e:
                last_error = e
                continue
            self.model = trial
            self.using_finetuned_weights = True
            print(f"[classifier] loaded checkpoint from {weights_path}")
            return

        self.load_error = (
            f"Checkpoint keys don't match the EfficientNetB4 architecture: {last_error}"
        )
        print(f"[classifier] ERROR: {self.load_error}")

    def _init_onnx_runtime(self):
        try:
            import onnxruntime as ort
            onnx_path = WEIGHTS_DIR / "model.onnx"
            
            # Export PyTorch model to ONNX if it doesn't exist
            if not onnx_path.exists():
                print(f"[classifier] Exporting PyTorch model to ONNX at {onnx_path} for faster CPU inference...")
                dummy_input = torch.randn(1, 3, 380, 380)
                # Suppress onnx warnings during export
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    torch.onnx.export(
                        self.model,
                        dummy_input,
                        str(onnx_path),
                        export_params=True,
                        opset_version=18,  # use version 18 as recommended by PyTorch exporter
                        do_constant_folding=True,
                        input_names=['input'],
                        output_names=['output'],
                        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
                    )
                print("[classifier] Export complete!")
                
            # Initialize ONNX Runtime session
            opts = ort.SessionOptions()
            # Explicitly set thread count to 4 for best speed on dual-core CPU
            opts.intra_op_num_threads = 4
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            
            self.ort_session = ort.InferenceSession(
                str(onnx_path), 
                sess_options=opts, 
                providers=['CPUExecutionProvider']
            )
            print("[classifier] ONNX Runtime session initialized successfully (CPU acceleration active).")
        except Exception as e:
            print(f"[classifier] WARNING: Failed to initialize ONNX Runtime: {e}. Falling back to standard PyTorch CPU execution.")
            self.ort_session = None

    def predict(self, batch):
        # If ONNX Runtime session is initialized, use it for speedup
        if self.ort_session is not None:
            batch_np = batch.cpu().numpy() if isinstance(batch, torch.Tensor) else batch
            ort_outputs = self.ort_session.run(['output'], {'input': batch_np})[0]
            logits = torch.from_numpy(ort_outputs)
            return torch.softmax(logits, dim=1)[:, 1].tolist()
            
        # Fallback to standard PyTorch CPU execution
        with torch.no_grad():
            logits = self.model(batch)  # (N, 2) logits
            return torch.softmax(logits, dim=1)[
                :, 1
            ].tolist()  # fake-class probability per item
