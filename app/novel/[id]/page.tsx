import NovelPageClient from "@/components/novel/novel-page-client";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <NovelPageClient novelId={id} />;
}