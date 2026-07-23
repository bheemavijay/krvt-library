"use client";

import { useState } from "react";
import { importFromText } from "@/features/import";

export function PasteImportForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!content.trim()) {
      setError("Please paste some content to import.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a title for the novel.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await importFromText(content, title);

      alert("✅ Novel imported successfully!");

      setTitle("");
      setContent("");

      // refresh page to update library
      window.location.reload();
    } catch (err: any) {
      const errorMessage = err.message || "Import failed";
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
        placeholder="Novel Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded"
        disabled={loading}
      />

      <textarea
        placeholder="Paste full novel text here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border p-2 rounded h-60"
        disabled={loading}
      />

      <button
        onClick={handleImport}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Importing..." : "Import"}
      </button>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
