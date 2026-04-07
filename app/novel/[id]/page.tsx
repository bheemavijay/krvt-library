import { NovelPageClient } from "@/components/novel/novel-page-client";
import { getNovelById } from "@/lib/db";

type NovelPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NovelPage({ params }: NovelPageProps) {
  const { id } = await params;
  const novel = getNovelById(id) ?? null;

  return <NovelPageClient initialNovel={novel} novelId={id} />;
}
