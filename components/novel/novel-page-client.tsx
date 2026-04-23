"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNovel } from "@/lib/storage/indexeddb";

export default function NovelPageClient({ novelId }: { novelId: string }) {
  const [novel, setNovel] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const data = await getNovel(novelId);
      setNovel(data);
    }

    load();
  }, [novelId]);

  if (!novel) return <p className="p-6">Loading...</p>;

  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="flex gap-6">
        <img
          src={novel.image || "/placeholder.jpg"}
          className="w-40 h-56 object-cover rounded"
        />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{novel.title}</h1>
          <p className="text-gray-400">by {novel.author}</p>

          <p className="text-sm text-gray-300">{novel.genre}</p>
          <p className="text-sm text-gray-300">{novel.status}</p>

          <div className="flex gap-3 mt-4">
            <Link
              href={`/novel/${novel.id}/1`}
              className="bg-purple-600 px-4 py-2 rounded"
            >
              Start Reading
            </Link>

            <button className="border px-4 py-2 rounded">
              Bookmark
            </button>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <p className="text-gray-300 leading-relaxed">
          {novel.description}
        </p>
      </div>

      {/* CHAPTER LIST */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Chapters</h2>

        <div className="max-h-80 overflow-y-auto border p-3 rounded space-y-1">
          {novel.chapters?.map((ch: any, i: number) => (
            <Link
              key={ch.id || i}
              href={`/novel/${novel.id}/${i + 1}`}
              className="block py-1 hover:text-purple-400"
            >
              Chapter {i + 1}: {ch.title}
            </Link>
          ))}
        </div>
      </div>

    </main>
  );
}