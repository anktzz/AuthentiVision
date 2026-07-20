function FilmStrip({ frames }) {
  return (
    <div className="filmstrip">
      <div className="filmstrip-track">
        {frames.map((frame) => {
          const tone = !frame.face_detected ? "noface" : frame.fake_probability >= 0.5 ? "fake" : "real";
          return (
            <div key={frame.index} className="frame" data-tone={tone}>
              {frame.thumbnail && <img src={frame.thumbnail} alt={`Frame ${frame.index}`} />}
              <div className="frame-tag">
                <span>{frame.timestamp != null ? `${frame.timestamp}s` : `#${frame.index}`}</span>
                <span>{frame.face_detected ? `${(frame.fake_probability * 100).toFixed(0)}%` : "no face"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FilmStrip;
