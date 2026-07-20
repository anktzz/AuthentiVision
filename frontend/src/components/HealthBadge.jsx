function HealthBadge({ health }) {
  const state =
    health === null ? "pending" : health.status === "ok" ? "ok" : health.status === "degraded" ? "degraded" : "offline";

  const label =
    health === null
      ? "Checking model…"
      : health.status === "ok"
      ? health.using_finetuned_weights
        ? "Model ready"
        : "Model ready · untrained weights"
      : health.status === "degraded"
      ? "Model degraded"
      : "Backend offline";

  return (
    <div className="tally" data-state={state}>
      <span className="tally-lamp" />
      <span className="tally-text">{label}</span>
    </div>
  );
}

export default HealthBadge;
