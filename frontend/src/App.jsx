import { useDetection } from "./hooks/useDetection.js";
import HealthBadge from "./components/HealthBadge.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

function BrandMark() {
  return (
    <span className="bay-mark">
      <svg width="22" height="22" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <circle cx="15" cy="15" r="12" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="15" cy="15" r="4.5" fill="currentColor" />
        <circle cx="19.5" cy="10.5" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

function App() {
  const d = useDetection();

  return (
    <main className="bay">
      <header className="bay-header">
        <div className="bay-brand">
          <BrandMark />
          <div>
            <h1 className="bay-title">AuthentiVision</h1>
            <p className="bay-subtitle">Face-swap deepfake detector · EfficientNet-B4 · CPU inference</p>
          </div>
        </div>
        <HealthBadge health={d.health} />
      </header>

      <section className="bay-grid">
        <UploadPanel
          inputRef={d.inputRef}
          file={d.file}
          previewUrl={d.previewUrl}
          videoMeta={d.videoMeta}
          isDragging={d.isDragging}
          setIsDragging={d.setIsDragging}
          loading={d.loading}
          uploadProgress={d.uploadProgress}
          error={d.error}
          onFile={d.handleFile}
          onDrop={d.handleDrop}
          onLoadedMetadata={d.handleVideoLoadedMetadata}
          onAnalyze={d.runDetection}
          onReset={d.reset}
        />
        <ResultPanel result={d.result} health={d.health} />
      </section>

      <p className="footnote">Runs entirely on CPU. Accuracy depends on the loaded model weights — see the status badge above.</p>
    </main>
  );
}

export default App;
