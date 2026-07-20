const WIDTH = 600;
const HEIGHT = 140;
const PAD_Y = 10;

function ScopeTrace({ frames, scoreDistribution }) {
  const plotted = (frames || []).filter((f) => f.face_detected && f.fake_probability != null);

  if (plotted.length === 0) {
    return (
      <div className="scope">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="scope-svg" preserveAspectRatio="none">
          <Graticule />
        </svg>
        <div className="scope-empty">no face-locked frames to trace</div>
      </div>
    );
  }

  const step = plotted.length > 1 ? WIDTH / (plotted.length - 1) : WIDTH;
  const usableH = HEIGHT - PAD_Y * 2;
  const yFor = (p) => PAD_Y + (1 - p) * usableH;

  const points = plotted.map((f, i) => `${(i * step).toFixed(1)},${yFor(f.fake_probability).toFixed(1)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `M 0,${HEIGHT} L ${points.join(" L ")} L ${WIDTH},${HEIGHT} Z`;

  const avgY = scoreDistribution ? yFor(scoreDistribution.average) : null;

  return (
    <div className="scope">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="scope-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="scopeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Graticule />
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} className="scope-midline" />
        {avgY != null && (
          <line x1="0" y1={avgY} x2={WIDTH} y2={avgY} className="scope-avgline" strokeDasharray="2 4" />
        )}
        <path d={areaPath} fill="url(#scopeFill)" stroke="none" />
        <path d={linePath} className="scope-trace" fill="none" />
        {plotted.map((f, i) => (
          <circle
            key={f.index ?? i}
            cx={i * step}
            cy={yFor(f.fake_probability)}
            r="2.4"
            className={f.fake_probability >= 0.5 ? "scope-dot-fake" : "scope-dot-real"}
          />
        ))}
      </svg>
      <div className="scope-axis">
        <span>0s</span>
        <span className="scope-axis-mid">frame index →</span>
        <span>{plotted[plotted.length - 1]?.timestamp != null ? `${plotted[plotted.length - 1].timestamp}s` : ""}</span>
      </div>
    </div>
  );
}

function Graticule() {
  const rows = 4;
  const cols = 10;
  const lines = [];
  for (let r = 1; r < rows; r++) {
    const y = (HEIGHT / rows) * r;
    lines.push(<line key={`r${r}`} x1="0" y1={y} x2={WIDTH} y2={y} className="scope-grid" />);
  }
  for (let c = 1; c < cols; c++) {
    const x = (WIDTH / cols) * c;
    lines.push(<line key={`c${c}`} x1={x} y1="0" x2={x} y2={HEIGHT} className="scope-grid" />);
  }
  return <>{lines}</>;
}

export default ScopeTrace;
