import time
import undetected_chromedriver as uc
from .driver import BrowserDriver
from .detector import PageDetector
from ..models.page import RawBrowserResponse
from ..models.enums import PageType, NavigationMode
from ..exceptions.exceptions import NavigationException

class UndetectedChromeDriver(BrowserDriver):
    def __init__(self, settings):
        self.settings = settings
        self.driver = None
        self.detector = PageDetector()

    def launch(self):
        options = uc.ChromeOptions()
        if self.settings.headless:
            options.add_argument('--headless')
        self.driver = uc.Chrome(options=options, user_data_dir=self.settings.profile_path)
        self.driver.set_page_load_timeout(self.settings.cloudflare_timeout_seconds)

    def get(self, url: str, navigation_mode: NavigationMode) -> RawBrowserResponse:
        if not self.driver:
            raise NavigationException("Driver not launched. Call launch() first.")

        print("Navigating...")
        self.driver.get(url)

        if navigation_mode == NavigationMode.CLOUDFLARE:
            self._handle_cloudflare_challenge()

        # For DOM_READY, we just assume the page is ready after the get() call.
        # A more robust implementation could wait for document.readyState === 'complete'.

        return RawBrowserResponse(
            url=self.driver.current_url,
            html=self.driver.page_source,
            title=self.driver.title,
            headers={},
            cookies={},
            metadata={}
        )

    def _handle_cloudflare_challenge(self):
        start_time = time.time()
        while True:
            current_html = self.driver.page_source
            page_type = self.detector.detect(current_html)

            print("\nWaiting for Cloudflare...")
            print(f"  - Title:     {self.driver.title.strip()}")
            print(f"  - Detection: {page_type.name}")

            if page_type == PageType.REAL_PAGE:
                print("Challenge solved. Real HTML detected.")
                break

            if time.time() - start_time > self.settings.cloudflare_timeout_seconds:
                raise NavigationException(f"Cloudflare challenge not solved within {self.settings.cloudflare_timeout_seconds} seconds.")

            time.sleep(1)

    def close(self):
        if self.driver:
            self.driver.quit()
