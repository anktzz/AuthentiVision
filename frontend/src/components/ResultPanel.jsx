import ScopeTrace from "./ScopeTrace.jsx";
import VuMeter from "./VuMeter.jsx";
import FilmStrip from "./FilmStrip.jsx";

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.2 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DashMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const getCleanedJson = (res) => {
  if (!res) return "";
  const cleaned = { ...res };
  if (cleaned.frames) {
    cleaned.frames = cleaned.frames.map((f) => ({
      ...f,
      thumbnail: f.thumbnail ? `[base64 image, ${f.thumbnail.length} chars]` : null,
    }));
  }
  return JSON.stringify(cleaned, null, 2);
};

function ResultPanel({ result, health }) {
  if (!result) {
    return (
      <div className="bay-panel">
        <div className="bay-panel-head">
          <h2>Results</h2>
        </div>
        <p className="placeholder">Your verdict, score breakdown, and frame gallery will appear here once a video is analyzed.</p>
      </div>
    );
  }

  const isFake = result.label === "fake";
  const isReal = result.label === "real";
  const verdict = isFake ? "fake" : isReal ? "real" : "unknown";

  return (
    <div className="bay-panel">
      <div className="bay-panel-head">
        <h2>Results</h2>
      </div>

      <div className={`verdict-strip verdict-${verdict}`}>
        <div className="verdict-main">
          <span className="verdict-stamp" aria-hidden="true">
            {isFake ? <CrossMark /> : isReal ? <CheckMark /> : <DashMark />}
          </span>
          <div>
            <span className="verdict-eyebrow">Verdict</span>
            <p className="verdict-value">{verdict.toUpperCase()}</p>
          </div>
        </div>
        <div className="verdict-case">
          <span>Scan {result.scan_id}</span>
          <span>{result.processing_ms} ms</span>
        </div>
      </div>

      <div className="meter-bank">
        <VuMeter label="Confidence" value={(result.confidence ?? 0) * 100} tone="accent" />
        <VuMeter label="Fake probability" value={(result.average_fake_probability ?? 0) * 100} tone="fake" />
        <VuMeter
          label="Frame yield"
          value={result.frames_extracted ? (result.frames_analyzed / result.frames_extracted) * 100 : 0}
          tone="real"
        />
      </div>

      {result.score_distribution && (
        <div className="section">
          <span className="section-heading">Frame-by-frame score</span>
          <ScopeTrace frames={result.frames} scoreDistribution={result.score_distribution} />
          <div className="scope-stats">
            Min {(result.score_distribution.minimum * 100).toFixed(0)}% · Max{" "}
            {(result.score_distribution.maximum * 100).toFixed(0)}% · Spread{" "}
            {(result.score_distribution.spread * 100).toFixed(0)}%
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
          <span className="section-heading">Frame gallery — {result.frames.length} frames</span>
          <div className="gallery-legend">
            <span className="legend-item">
              <span className="legend-mark legend-fake" /> Fake-leaning
            </span>
            <span className="legend-item">
              <span className="legend-mark legend-real" /> Real-leaning
            </span>
            <span className="legend-item">
              <span className="legend-mark legend-noface" /> No face
            </span>
          </div>
          <FilmStrip frames={result.frames} />
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
          <dd>{result.using_finetuned_weights ? "Yes" : "No"}</dd>
        </dl>
        <pre className="raw-json">{getCleanedJson(result)}</pre>
        <div className="actions">
          <button
            className="btn btn-outline w-full"
            onClick={() => navigator.clipboard.writeText(getCleanedJson(result))}
          >
            Copy raw JSON
          </button>
        </div>
      </details>
    </div>
  );
}

export default ResultPanel;
