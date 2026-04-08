import { getSupabaseClient } from "@/lib/supabase";

type ImportNovel = {
  title: string;
  cover: string;
  description: string;
  genres: string[];
};

type ImportChapter = {
  title: string;
  content: string[];
};

export type ChapterImportStatus = "SUCCESS" | "FAILED";

export type ChapterImportRecord = {
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  source_url: string;
  status: ChapterImportStatus;
};

type InsertedNovelRow = {
  id: string;
};

type GenreRow = {
  id: string;
  name: string;
};

export async function saveNovel(novel: ImportNovel) {
  const client = getSupabaseClient();
  const { data: existingRows, error: existingError } = await client
    .from("novels")
    .select("id")
    .eq("title", novel.title)
    .limit(1)
    .returns<InsertedNovelRow[]>();

  if (existingError) {
    throw new Error(existingError.message ?? "Failed to check existing novel.");
  }

  const existingNovelId = existingRows?.[0]?.id;

  if (existingNovelId) {
    return existingNovelId;
  }

  const { data, error } = await client
    .from("novels")
    .insert({
      title: novel.title,
      cover: novel.cover,
      description: novel.description,
    })
    .select("id")
    .single<InsertedNovelRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save novel.");
  }

  return data.id;
}

export async function saveGenres(novelId: string, genres: string[]) {
  const client = getSupabaseClient();
  const names = Array.from(new Set(genres.map((genre) => genre.trim()).filter(Boolean)));

  if (names.length === 0) {
    return;
  }

  const { data, error } = await client
    .from("genres")
    .upsert(
      names.map((name) => ({ name })),
      { onConflict: "name" },
    )
    .select("id, name")
    .returns<GenreRow[]>();

  if (error) {
    throw new Error(error.message ?? "Failed to save genres.");
  }

  const genreRows = (data ?? []).filter((genre) => names.includes(genre.name));

  if (genreRows.length === 0) {
    return;
  }

  const { error: relationError } = await client.from("novel_genres").upsert(
    genreRows.map((genre) => ({
      novel_id: novelId,
      genre_id: genre.id,
    })),
    { onConflict: "novel_id,genre_id" },
  );

  if (relationError) {
    throw new Error(relationError.message ?? "Failed to save novel genres.");
  }
}

export async function saveChapter(
  novelId: string,
  chapter: ImportChapter | null,
  url: string,
  index: number,
) {
  const record = buildChapterRecord(novelId, chapter, url, index);
  const client = getSupabaseClient();

  if (!chapter) {
    const { error } = await client
      .from("chapters")
      .upsert(record, { onConflict: "source_url" });

    if (error) {
      throw new Error(error.message ?? "Failed to save failed chapter.");
    }

    return;
  }

  const { error } = await client
    .from("chapters")
    .upsert(record, { onConflict: "source_url" });

  if (!error) {
    return;
  }

  const { error: failedError } = await client
    .from("chapters")
    .upsert({ ...record, status: "FAILED", content: "" }, { onConflict: "source_url" });

  if (failedError) {
    throw new Error(failedError.message ?? error.message ?? "Failed to save chapter.");
  }
}

export function buildChapterRecord(
  novelId: string,
  chapter: ImportChapter | null,
  url: string,
  index: number,
): ChapterImportRecord {
  const chapterNumber = index + 1;

  return {
    novel_id: novelId,
    chapter_number: chapterNumber,
    title: chapter?.title || `Chapter ${chapterNumber}`,
    content: chapter ? chapter.content.join("\n") : "",
    source_url: url,
    status: chapter ? "SUCCESS" : "FAILED",
  };
}

export async function saveChapterBatch(chapters: ChapterImportRecord[]) {
  if (chapters.length === 0) {
    return;
  }

  const client = getSupabaseClient();
  const { error } = await client
    .from("chapters")
    .upsert(chapters, { onConflict: "source_url" });

  if (error) {
    throw new Error(error.message ?? "Failed to save chapter batch.");
  }
}

export async function getExistingChapterSourceUrls(novelId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chapters")
    .select("source_url")
    .eq("novel_id", novelId);

  if (error) {
    throw new Error(error.message ?? "Failed to fetch existing chapters.");
  }

  return new Set(
    (data ?? [])
      .map((row) => String(row.source_url ?? "").trim())
      .filter(Boolean),
  );
}
