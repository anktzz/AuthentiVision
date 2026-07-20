function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15V4M12 4L7.5 8.5M12 4l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScanningPreview({
  inputRef,
  previewUrl,
  isDragging,
  setIsDragging,
  loading,
  onFile,
  onDrop,
  onLoadedMetadata,
}) {
  return (
    <label
      className={`monitor ${isDragging ? "dragging" : ""} ${loading ? "scanning" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <span className="monitor-corner tl" />
      <span className="monitor-corner tr" />
      <span className="monitor-corner bl" />
      <span className="monitor-corner br" />

      <div className="monitor-screen">
        {previewUrl ? (
          <video src={previewUrl} controls muted playsInline onLoadedMetadata={onLoadedMetadata} />
        ) : (
          <div className="monitor-empty">
            <span className="monitor-empty-mark">
              <UploadIcon />
            </span>
            <strong>Drop a video here, or click to browse</strong>
            <small>MP4 · MOV · AVI · MKV · WEBM — up to 250MB</small>
          </div>
        )}
        {loading && (
          <div className="scan-sweep-layer" aria-hidden="true">
            <div className="scan-sweep-line" />
          </div>
        )}
      </div>
    </label>
  );
}

export default ScanningPreview;
