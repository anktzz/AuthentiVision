import { useEffect, useRef, useState } from "react";
import { detectDeepfake } from "./api";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm"]);

function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoMeta, setVideoMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/health")
      .then((r) => r.json())
      .then((data) => !cancelled && setHealth(data))
      .catch(() => !cancelled && setHealth({ status: "offline" }));
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFile(nextFile) {
    if (!nextFile) return;
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
      setError("Unsupported file type.");
      return;
    }
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 250MB limit.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setFile(nextFile);
    setVideoMeta(null);
    setResult(null);
    setError("");
  }

  function handleVideoLoadedMetadata(event) {
    const video = event.currentTarget;
    setVideoMeta({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function runDetection(event) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setUploadProgress(0);
    setError("");
    try {
      const payload = await detectDeepfake(file, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      setResult(payload);
    } catch (err) {
      setError(err.response?.data?.detail || "Detection failed. Confirm the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setVideoMeta(null);
    setResult(null);
    setError("");
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  const isFake = result?.label === "fake";
  const isReal = result?.label === "real";
  const verdictClass = isFake ? "verdict-fake" : isReal ? "verdict-real" : "";
  const verdictTextClass = isFake ? "text-fake" : isReal ? "text-real" : "";

  const dotClass =
    health === null ? "" : health.status === "ok" ? "ok" : health.status === "degraded" ? "degraded" : "offline";
  const healthLabel =
    health === null
      ? "checking model..."
      : health.status === "ok"
      ? health.using_finetuned_weights
        ? "model ready (fine-tuned)"
        : "model ready (untrained backbone)"
      : health.status === "degraded"
      ? "model degraded — checkpoint mismatch"
      : "backend offline";

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Deepfake Video Detector</h1>
          <p className="app-subtitle">EfficientNet-B4 face-swap classifier, CPU inference</p>
        </div>
        <div className="health-badge">
          <span className={`dot ${dotClass}`} />
          <span>{healthLabel}</span>
        </div>
      </header>

      <section className="workspace">
        <div className="panel">
          <h2 className="panel-title">Upload</h2>

          <label
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {previewUrl ? (
              <video src={previewUrl} controls muted playsInline onLoadedMetadata={handleVideoLoadedMetadata} />
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">+</div>
                <strong>Drop a video or click to browse</strong>
                <small>MP4 · MOV · AVI · MKV · WEBM — max 250MB</small>
              </div>
            )}
          </label>

          {file && (
            <div className="file-meta">
              <div className="file-meta-row">
                <span>file</span>
                <strong>{file.name}</strong>
              </div>
              <div className="file-meta-row">
                <span>size</span>
                <strong>{(file.size / 1024 / 1024).toFixed(1)} MB</strong>
              </div>
              {videoMeta && (
                <>
                  <div className="file-meta-row">
                    <span>resolution</span>
                    <strong>
                      {videoMeta.width}×{videoMeta.height}
                    </strong>
                  </div>
                  <div className="file-meta-row">
                    <span>duration</span>
                    <strong>{Math.round(videoMeta.duration)}s</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {loading && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <div className="actions">
            <button className="btn btn-primary" onClick={runDetection} disabled={!file || loading}>
              {loading
                ? uploadProgress < 100
                  ? `Uploading… ${uploadProgress}%`
                  : "Analyzing (CPU, may take a moment)…"
                : "Analyze video"}
            </button>
            <button className="btn btn-outline" onClick={reset} disabled={loading}>
              Clear
            </button>
          </div>
        </div>

        <div className="panel result-panel">
          <h2 className="panel-title">Result</h2>

          {!result && <p className="placeholder">Analysis details will appear here once a video is processed.</p>}

          {result && (
            <>
              <div className={`verdict-row ${verdictClass}`}>
                <div>
                  <span className="verdict-label">Verdict</span>
                  <p className={`verdict-value ${verdictTextClass}`}>{(result.label || "unknown").toUpperCase()}</p>
                </div>
                <span className="scan-id">
                  case {result.scan_id}
                  <br />
                  {result.processing_ms}ms
                </span>
              </div>

              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Confidence</span>
                  <span className="metric-value">{((result.confidence ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Avg fake prob.</span>
                  <span className="metric-value">{((result.average_fake_probability ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Frames used</span>
                  <span className="metric-value">
                    {result.frames_analyzed}/{result.frames_extracted}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Weights</span>
                  <span className="metric-value">{result.using_finetuned_weights ? "tuned" : "untrained"}</span>
                </div>
              </div>

              {result.score_distribution && (
                <div className="section">
                  <span className="section-heading">Score distribution across frames</span>
                  <div className="score-bar-track">
                    <div
                      className="score-bar-marker"
                      style={{ left: `calc(${(result.score_distribution.average * 100).toFixed(1)}% - 1.5px)` }}
                    />
                  </div>
                  <div className="score-bar-labels">
                    <span>real</span>
                    <span>
                      min {(result.score_distribution.minimum * 100).toFixed(0)}% · max{" "}
                      {(result.score_distribution.maximum * 100).toFixed(0)}% · spread{" "}
                      {(result.score_distribution.spread * 100).toFixed(0)}%
                    </span>
                    <span>fake</span>
                  </div>
                </div>
              )}

              {result.quality_flags?.length > 0 && (
                <div className="section">
                  <span className="section-heading">Quality flags</span>
                  <ul className="flags-list">
                    {result.quality_flags.map((flag, i) => (
                      <li key={i} className="flag-item">
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.frames?.length > 0 && (
                <div className="section">
                  <span className="section-heading">Extracted frames ({result.frames.length})</span>
                  <div className="gallery-legend">
                    <span className="legend-item">
                      <span className="legend-swatch real" /> real-leaning
                    </span>
                    <span className="legend-item">
                      <span className="legend-swatch fake" /> fake-leaning
                    </span>
                    <span className="legend-item">
                      <span className="legend-swatch" /> no face found
                    </span>
                  </div>
                  <div className="frame-gallery">
                    {result.frames.map((frame) => {
                      const fFake = frame.face_detected && frame.fake_probability >= 0.5;
                      const fReal = frame.face_detected && frame.fake_probability < 0.5;
                      const cardClass = fFake ? "frame-fake" : fReal ? "frame-real" : "";
                      const captionClass = fFake ? "caption-fake" : fReal ? "caption-real" : "caption-noface";
                      return (
                        <div key={frame.index} className={`frame-card ${cardClass}`}>
                          {frame.thumbnail && <img src={frame.thumbnail} alt={`Frame ${frame.index}`} />}
                          <div className={`frame-caption ${captionClass}`}>
                            <span>{frame.timestamp != null ? `${frame.timestamp}s` : `#${frame.index}`}</span>
                            <span>{frame.face_detected ? `${(frame.fake_probability * 100).toFixed(0)}%` : "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <details className="section tech-details">
                <summary>Technical details</summary>
                <dl className="tech-grid">
                  <dt>Architecture</dt>
                  <dd>{health?.architecture || "EfficientNet-B4"}</dd>
                  <dt>Input resolution</dt>
                  <dd>{health?.input_resolution ? `${health.input_resolution}×${health.input_resolution}` : "—"}</dd>
                  <dt>Sampled frames target</dt>
                  <dd>{health?.sampled_frames_target ?? "—"}</dd>
                  <dt>Fine-tuned weights</dt>
                  <dd>{result.using_finetuned_weights ? "yes" : "no"}</dd>
                </dl>
                <pre className="raw-json">{JSON.stringify(result, null, 2)}</pre>
                <div className="actions">
                  <button
                    className="btn btn-outline w-full"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  >
                    Copy raw JSON
                  </button>
                </div>
              </details>
            </>
          )}
        </div>
      </section>

      <p className="footnote">
        Runs entirely on CPU. Accuracy depends on the loaded model weights — see the status badge above.
      </p>
    </main>
  );
}

export default App;
