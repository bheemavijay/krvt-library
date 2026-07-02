"use client";

import { useState } from "react";
import { importFromText } from "@/features/import/services/importService";

export function UploadNovelForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const text = await file.text();
      await importFromText(text, title || file.name);

      alert("✅ File imported successfully!");

      setFile(null);
      setTitle("");

      window.location.reload();
    } catch (err: any) {
      const errorMessage = err.message || "Upload failed";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Optional Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded"
        disabled={loading}
      />

      <input
        type="file"
        accept=".txt"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={loading}
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}