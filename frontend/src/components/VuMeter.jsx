const ICONS = {
  accent: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.7" fill="currentColor" />
    </svg>
  ),
  fake: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2.2 14.4 13.2H1.6L8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 6.3v3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
    </svg>
  ),
  real: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1.6" y="3" width="12.8" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.4 6h7.2M4.4 8.4h7.2M4.4 10.8h4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

function VuMeter({ label, value, unit = "%", tone = "accent" }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="stat">
      <span className="stat-label">
        <span className="stat-icon" data-tone={tone}>
          {ICONS[tone]}
        </span>
        {label}
      </span>
      <span className="stat-value">{value == null ? "—" : `${value.toFixed(0)}${unit}`}</span>
      <div className="stat-bar" data-tone={tone}>
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default VuMeter;
