import { LibraryClient } from "@/components/library-client";
import { getLibraryNovels } from "@/lib/db";

export default function HomePage() {
  const novels = getLibraryNovels();

  return <LibraryClient novels={novels} />;
}
