# combines per-frame fake-probability scores into one verdict plus data-driven quality flags
def aggregate_scores(scores, expected_frames=30):
    if not scores:
        return {
            "label": "unknown",
            "confidence": 0.0,
            "average_fake_probability": 0.0,
            "frames_analyzed": 0,
            "score_distribution": {"minimum": 0.0, "maximum": 0.0, "average": 0.0, "spread": 0.0},
            "quality_flags": ["No faces were detected in any sampled frame."],
        }

    min_score, max_score = min(scores), max(scores)
    avg_score = sum(scores) / len(scores)
    spread = max_score - min_score
    label = "fake" if avg_score >= 0.5 else "real"
    confidence = avg_score if label == "fake" else 1 - avg_score

    quality_flags = []
    coverage_ratio = len(scores) / expected_frames if expected_frames else 1.0
    if coverage_ratio < 0.5:
        quality_flags.append(
            f"A face was only detected in {len(scores)} of {expected_frames} sampled frames — the result may be less reliable."
        )
    if spread > 0.4:
        quality_flags.append(
            "The fake-probability score varies widely across frames — some parts of the video may differ from the overall verdict."
        )
    if 0.4 <= avg_score <= 0.6:
        quality_flags.append(
            "The overall score is close to the real/fake decision boundary — treat this result cautiously."
        )

    return {
        "label": label,
        "confidence": round(confidence, 4),
        "average_fake_probability": round(avg_score, 4),
        "frames_analyzed": len(scores),
        "score_distribution": {
            "minimum": round(min_score, 4),
            "maximum": round(max_score, 4),
            "average": round(avg_score, 4),
            "spread": round(spread, 4),
        },
        "quality_flags": quality_flags,
    }
