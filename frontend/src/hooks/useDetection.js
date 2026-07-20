import { useEffect, useRef, useState } from "react";
import { detectDeepfake } from "../api";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm"]);

export function useDetection() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoMeta, setVideoMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/health")
      .then((r) => r.json())
      .then((data) => !cancelled && setHealth(data))
      .catch(() => !cancelled && setHealth({ status: "offline" }));
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFile(nextFile) {
    if (!nextFile) return;
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
      setError("Unsupported file type.");
      return;
    }
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 250MB limit.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setFile(nextFile);
    setVideoMeta(null);
    setResult(null);
    setError("");
  }

  function handleVideoLoadedMetadata(event) {
    const video = event.currentTarget;
    setVideoMeta({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function runDetection(event) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setUploadProgress(0);
    setError("");
    try {
      const payload = await detectDeepfake(file, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      setResult(payload);
    } catch (err) {
      setError(err.response?.data?.detail || "Detection failed. Confirm the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setVideoMeta(null);
    setResult(null);
    setError("");
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return {
    inputRef,
    file,
    previewUrl,
    videoMeta,
    result,
    loading,
    uploadProgress,
    error,
    health,
    isDragging,
    setIsDragging,
    handleFile,
    handleVideoLoadedMetadata,
    handleDrop,
    runDetection,
    reset,
  };
}
