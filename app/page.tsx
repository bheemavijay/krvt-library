"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllNovels } from "@/lib/storage/indexeddb";

export default function HomePage() {
  const [novels, setNovels] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await getAllNovels();
      setNovels(data || []);
    }

    load();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-6 p-6">
      {novels.map((n) => (
        <Link href={`/novel/${n.id}`} key={n.id}>
          <div className="border p-4 rounded hover:scale-105 transition">
            <h2>{n.title}</h2>
            <p>{n.author}</p>
            <p>{n.chapters?.length || 0} chapters</p>
          </div>
        </Link>
      ))}
    </div>
  );
}