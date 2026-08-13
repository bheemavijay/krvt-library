from typing import Dict, Any

class FakeBrowserContext:
    def __init__(self, documents: Dict[str, Any]):
        self._documents = documents

    async def new_page(self):
        return FakePage(self._documents)

    async def close(self):
        pass

class FakePage:
    def __init__(self, documents: Dict[str, Any]):
        self._documents = documents
        self._current_url = None

    async def goto(self, url: str):
        if url not in self._documents:
            raise Exception(f"URL not found in fake browser: {url}")
        self._current_url = url

    async def content(self) -> str:
        if not self._current_url:
            raise Exception("No page loaded")
        return self._documents[self._current_url]

    async def close(self):
        pass
