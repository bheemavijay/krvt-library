import { ReaderPageClient } from "@/components/reader/reader-page-client";

type Props = {
  params: Promise<{
    id: string;
    chapter: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id, chapter } = await params;

  return (
    <ReaderPageClient
      novelId={id}
      chapterParam={chapter}
    />
  );
}