import ScanningPreview from "./ScanningPreview.jsx";

function UploadPanel({
  inputRef,
  file,
  previewUrl,
  videoMeta,
  isDragging,
  setIsDragging,
  loading,
  uploadProgress,
  error,
  onFile,
  onDrop,
  onLoadedMetadata,
  onAnalyze,
  onReset,
}) {
  return (
    <div className="bay-panel">
      <div className="bay-panel-head">
        <h2>Upload video</h2>
      </div>

      <ScanningPreview
        inputRef={inputRef}
        previewUrl={previewUrl}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        loading={loading}
        onFile={onFile}
        onDrop={onDrop}
        onLoadedMetadata={onLoadedMetadata}
      />

      {file && (
        <dl className="readout">
          <div className="readout-row">
            <dt>File</dt>
            <dd>{file.name}</dd>
          </div>
          <div className="readout-row">
            <dt>Size</dt>
            <dd>{(file.size / 1024 / 1024).toFixed(1)} MB</dd>
          </div>
          {videoMeta && (
            <>
              <div className="readout-row">
                <dt>Resolution</dt>
                <dd>
                  {videoMeta.width}×{videoMeta.height}
                </dd>
              </div>
              <div className="readout-row">
                <dt>Duration</dt>
                <dd>{Math.round(videoMeta.duration)}s</dd>
              </div>
            </>
          )}
        </dl>
      )}

      {loading && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="actions">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={!file || loading}>
          {loading
            ? uploadProgress < 100
              ? `Uploading ${uploadProgress}%`
              : "Analyzing…"
            : "Analyze video"}
        </button>
        <button className="btn btn-outline" onClick={onReset} disabled={loading}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default UploadPanel;
