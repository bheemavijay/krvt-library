import type { Chapter, Novel, NovelSummary } from "@/types";

import { getSupabaseClient } from "@/lib/supabase";

type NovelInsertRow = {
  title: string;
  author: string;
};

type NovelRow = {
  id: string;
  title: string;
  author: string;
  created_at: string;
};

type ChapterInsertRow = {
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
};

type ChapterRow = {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
};

export async function createNovel(novel: Pick<Novel, "title" | "author">) {
  const client = getSupabaseClient();
  const payload: NovelInsertRow = {
    title: novel.title,
    author: novel.author,
  };

  const { data, error } = await client
    .from("novels")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save novel to Supabase.");
  }

  return data.id;
}

export async function createChapters(novelId: string, chapters: Chapter[]) {
  const client = getSupabaseClient();
  const payload: ChapterInsertRow[] = chapters.map((chapter) => ({
    novel_id: novelId,
    chapter_number: chapter.order,
    title: chapter.title,
    content: chapter.content.join("\n\n"),
  }));

  const { error } = await client.from("chapters").insert(payload);

  if (error) {
    throw new Error(error.message ?? "Failed to save chapters to Supabase.");
  }
}

export async function getNovels() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("novels")
    .select("id, title, author, created_at")
    .order("created_at", { ascending: false })
    .returns<NovelRow[]>();

  if (error) {
    throw new Error(error.message ?? "Failed to fetch novels from Supabase.");
  }

  return (data ?? []).map<NovelSummary>((novel) => ({
    id: novel.id,
    title: novel.title,
    author: novel.author,
    chapterCount: 0,
  }));
}

export async function getChapters(novelId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chapters")
    .select("id, novel_id, chapter_number, title, content")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: true })
    .returns<ChapterRow[]>();

  if (error) {
    throw new Error(error.message ?? "Failed to fetch chapters from Supabase.");
  }

  return (data ?? []).map<Chapter>((chapter) => ({
    id: chapter.id,
    order: chapter.chapter_number,
    title: chapter.title,
    content: chapter.content
      .split(/\n\s*\n/g)
      .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
      .filter(Boolean),
  }));
}

export async function getNovelById(novelId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("novels")
    .select("id, title, author, created_at")
    .eq("id", novelId)
    .maybeSingle<NovelRow>();

  if (error) {
    throw new Error(error.message ?? "Failed to fetch the novel from Supabase.");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    author: data.author,
    chapterCount: 0,
  } satisfies NovelSummary;
}

export async function persistNovelToSupabase(novel: Novel) {
  const novelId = await createNovel(novel);

  try {
    await createChapters(novelId, novel.chapters);
  } catch (error) {
    await removeNovel(novelId);
    throw error;
  }

  return novelId;
}

async function removeNovel(novelId: string) {
  const client = getSupabaseClient();

  await client.from("novels").delete().eq("id", novelId);
}
