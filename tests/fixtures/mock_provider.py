import asyncio
from typing import Optional, List, Dict, Any

class MockProvider:
    def __init__(self, metadata: Dict[str, Any], chapters: List[Dict[str, Any]]):
        self._metadata = metadata
        self._chapters = chapters
        self.fail_on_metadata = False
        self.fail_on_chapters = False
        self.fail_on_chapter_download = False
        self.fail_on_asset_download = False
        self.timeout_on_metadata = False
        self.timeout_on_chapters = False
        self.timeout_on_chapter_download = False
        self.timeout_on_asset_download = False

    async def metadata(self, url: str) -> Dict[str, Any]:
        if self.fail_on_metadata:
            raise Exception("Failed to fetch metadata")
        if self.timeout_on_metadata:
            await asyncio.sleep(10)
        return self._metadata

    async def chapters(self, url: str) -> List[Dict[str, Any]]:
        if self.fail_on_chapters:
            raise Exception("Failed to fetch chapters")
        if self.timeout_on_chapters:
            await asyncio.sleep(10)
        return self._chapters

    async def download_chapter(self, url: str) -> str:
        if self.fail_on_chapter_download:
            raise Exception("Failed to download chapter")
        if self.timeout_on_chapter_download:
            await asyncio.sleep(10)

        for chapter in self._chapters:
            if chapter["url"] == url:
                return chapter["content"]

        raise Exception(f"Chapter not found for url: {url}")

    async def download_asset(self, url: str) -> bytes:
        if self.fail_on_asset_download:
            raise Exception("Failed to download asset")
        if self.timeout_on_asset_download:
            await asyncio.sleep(10)

        # In a real scenario, you'd have mock asset content
        return b"mock asset content"
