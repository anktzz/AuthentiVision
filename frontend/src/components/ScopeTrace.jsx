const WIDTH = 600;
const HEIGHT = 140;
const PAD_Y = 10;
const PAD_X = 40;

function ScopeTrace({ frames, scoreDistribution }) {
  const plotted = (frames || []).filter((f) => f.face_detected && f.fake_probability != null);

  const usableW = WIDTH - PAD_X - 10;
  const usableH = HEIGHT - PAD_Y * 2;
  const yFor = (p) => PAD_Y + (1 - p) * usableH;

  if (plotted.length === 0) {
    return (
      <div className="scope">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="scope-svg" preserveAspectRatio="none">
          <line x1={PAD_X} y1={HEIGHT / 2} x2={WIDTH - 10} y2={HEIGHT / 2} className="scope-midline" />
        </svg>
        <div className="scope-empty">no face-locked frames to trace</div>
      </div>
    );
  }

  const step = plotted.length > 1 ? usableW / (plotted.length - 1) : usableW;

  const points = plotted.map((f, i) => `${(PAD_X + i * step).toFixed(1)},${yFor(f.fake_probability).toFixed(1)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `M ${PAD_X},${HEIGHT - PAD_Y} L ${points.join(" L ")} L ${PAD_X + usableW},${HEIGHT - PAD_Y} Z`;

  const avgY = scoreDistribution ? yFor(scoreDistribution.average) : null;
  const ticks = [1.0, 0.75, 0.5, 0.25, 0.0];

  return (
    <div className="scope">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="scope-svg" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="scopeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis Ticks & Grid Lines */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_X}
              y1={yFor(t)}
              x2={PAD_X + usableW}
              y2={yFor(t)}
              className={t === 0.5 ? "scope-midline" : "scope-grid"}
            />
            <text
              x={PAD_X - 8}
              y={yFor(t) + 3}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="7.5"
              fontFamily="var(--font-mono)"
              style={{ userSelect: "none" }}
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis Vertical Grid Lines */}
        {[1, 2, 3].map((c) => {
          const x = PAD_X + (usableW / 4) * c;
          return (
            <line
              key={c}
              x1={x}
              y1={yFor(1.0)}
              x2={x}
              y2={yFor(0.0)}
              className="scope-grid"
              strokeDasharray="1 3"
            />
          );
        })}

        {/* Average Line */}
        {avgY != null && (
          <g>
            <line x1={PAD_X} y1={avgY} x2={PAD_X + usableW} y2={avgY} className="scope-avgline" strokeDasharray="3 3" />
            <text
              x={PAD_X + usableW - 5}
              y={avgY - 4}
              textAnchor="end"
              fill="var(--accent)"
              fontSize="7.5"
              fontFamily="var(--font-mono)"
              style={{ userSelect: "none", opacity: 0.8 }}
            >
              avg
            </text>
          </g>
        )}

        {/* Areas, Paths, Trace Line, and Dots */}
        <path d={areaPath} fill="url(#scopeFill)" stroke="none" />
        <path d={linePath} className="scope-trace" fill="none" />

        {plotted.map((f, i) => (
          <circle
            key={f.index ?? i}
            cx={PAD_X + i * step}
            cy={yFor(f.fake_probability)}
            r="3.2"
            className={f.fake_probability >= 0.5 ? "scope-dot-fake" : "scope-dot-real"}
            style={{ cursor: "pointer" }}
          >
            <title>{`Frame #${f.index + 1} (${f.timestamp}s)\nProbability: ${f.fake_probability.toFixed(4)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="scope-axis" style={{ paddingLeft: `${PAD_X}px` }}>
        <span>0s</span>
        <span className="scope-axis-mid">frame index →</span>
        <span>{plotted[plotted.length - 1]?.timestamp != null ? `${plotted[plotted.length - 1].timestamp}s` : ""}</span>
      </div>
    </div>
  );
}

export default ScopeTrace;
