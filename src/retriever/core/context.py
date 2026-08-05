from .document import Document
from ..browser.driver import BrowserDriver
from ..browser.undetected_chrome import UndetectedChromeDriver
from ..config.settings import Settings
from ..models.enums import NavigationMode

class BrowserContext:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.driver: BrowserDriver = UndetectedChromeDriver(settings)

    def start(self):
        self.driver.launch()

    def get(self, url: str, navigation_mode: NavigationMode) -> Document:
        """
        Navigates to a URL and returns a Document object.
        The driver is responsible for creating the Document.
        """
        return self.driver.get(url, navigation_mode)

    def close(self):
        self.driver.close()
