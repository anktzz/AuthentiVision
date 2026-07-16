import axios from "axios";

export async function detectDeepfake(file, onUploadProgress) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await axios.post("/detect", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });

  return response.data;
}
