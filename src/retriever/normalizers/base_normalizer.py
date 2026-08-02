from ..models.page import Page, RawBrowserResponse
from datetime import datetime
import re

class Normalizer:
    def normalize(self, response: RawBrowserResponse) -> Page:
        title_match = re.search(r'<title>(.*?)</title>', response.html, re.IGNORECASE)
        title = title_match.group(1) if title_match else ""
        return Page(
            url=response.url,
            html=response.html,
            title=title.strip(),
            timestamp=datetime.now()
        )
