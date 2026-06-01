"use client";

import { useState } from "react";

export default function CloudinaryTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");

  const handleUpload = async () => {
    if (!file) return alert("Select an image first");

    setUploading(true);
    setUrl("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ""
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      setUrl(data.secure_url);
      console.log("UPLOAD SUCCESS:", data);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Cloudinary Upload Test</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br /><br />

      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {url && (
        <div style={{ marginTop: 20 }}>
          <p>Uploaded Image:</p>
          <img src={url} width={300} />
          <p>{url}</p>
        </div>
      )}
    </div>
  );
}