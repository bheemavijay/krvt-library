"use client";

import { useState } from "react";
import { importFromText } from "@/lib/importer";

export function PasteImportForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = () => {
    try {
      setLoading(true);

      importFromText(content, title);

      alert("✅ Novel imported successfully!");

      setTitle("");
      setContent("");

      // refresh page to update library
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Import failed");
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
      />

      <textarea
        placeholder="Paste full novel text here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border p-2 rounded h-60"
      />

      <button
        onClick={handleImport}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Importing..." : "Import"}
      </button>
    </div>
  );
}