from .context import BrowserContext
from ..models.navigation import NavigationResult, NavigationStatus
from ..normalizers.base_normalizer import Normalizer
import time

class Retriever:
    def __init__(self, context: BrowserContext):
        self.context = context
        self.normalizer = Normalizer()

    def open(self, url: str) -> NavigationResult:
        start_time = time.time()
        try:
            raw_response = self.context.get(url)
            page = self.normalizer.normalize(raw_response)
            elapsed_ms = (time.time() - start_time) * 1000
            return NavigationResult(
                status=NavigationStatus.SUCCESS,
                page=page,
                final_url=page.url,
                retries=0,
                elapsed_ms=elapsed_ms,
                error=None
            )
        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            return NavigationResult(
                status=NavigationStatus.FAILED,
                page=None,
                final_url=url,
                retries=0,
                elapsed_ms=elapsed_ms,
                error=str(e)
            )
