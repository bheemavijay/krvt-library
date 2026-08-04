from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.models.provider import Novel, ChapterContent

class NovelBuilder:
    def __init__(self):
        self._metadata = None
        self._chapters = []

    def set_metadata(self, metadata: NovelMetadata):
        self._metadata = metadata
        return self

    def add_chapter(self, chapter: ChapterContent):
        self._chapters.append(chapter)
        return self

    def build(self) -> Novel:
        if not self._metadata:
            raise ValueError("Cannot build novel without metadata.")

        # Sort chapters by number if available, otherwise assume order is correct
        if self._chapters and self._chapters[0].title and "Chapter" in self._chapters[0].title:
             try:
                self._chapters.sort(key=lambda c: int("".join(filter(str.isdigit, c.title.split(":")[0]))))
             except:
                pass # Ignore if chapter title format is unexpected

        return Novel(metadata=self._metadata, chapters=self._chapters)
