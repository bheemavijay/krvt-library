import { ReaderPageClient } from "@/components/reader/reader-page-client";
import { getNovelById } from "@/lib/db";

type ChapterPageProps = {
  params: Promise<{
    id: string;
    chapter: string;
  }>;
};

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { id, chapter } = await params;
  const novel = getNovelById(id) ?? null;

  return (
    <ReaderPageClient
      initialNovel={novel}
      novelId={id}
      chapterParam={chapter}
    />
  );
}
