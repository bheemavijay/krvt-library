import time
import undetected_chromedriver as uc
from .driver import BrowserDriver
from .detector import PageDetector
from ..models.page import RawBrowserResponse
from ..models.enums import PageType
from ..exceptions.exceptions import NavigationException

class UndetectedChromeDriver(BrowserDriver):
    def __init__(self, settings):
        self.settings = settings
        self.driver = None
        self.detector = PageDetector()

    def launch(self):
        options = uc.ChromeOptions()
        if self.settings.headless:
            # Note: Headless mode may be detected more easily by Cloudflare
            options.add_argument('--headless')
        self.driver = uc.Chrome(options=options, user_data_dir=self.settings.profile_path)
        # Use a longer page load timeout to accommodate manual intervention
        self.driver.set_page_load_timeout(self.settings.cloudflare_timeout_seconds)

    def get(self, url: str) -> RawBrowserResponse:
        if not self.driver:
            raise NavigationException("Driver not launched. Call launch() first.")

        print("Navigating...")
        self.driver.get(url)

        start_time = time.time()

        while True:
            current_html = self.driver.page_source
            page_type = self.detector.detect(current_html)

            print("\nWaiting...")
            print(f"  Title:     {self.driver.title.strip()}")
            print(f"  HTML Size: {len(current_html)} bytes")
            print(f"  Detection: {page_type.name}")

            if page_type == PageType.REAL_PAGE:
                print("\nChallenge solved. Real HTML detected.")
                break

            if time.time() - start_time > self.settings.cloudflare_timeout_seconds:
                raise NavigationException(f"Challenge not solved within {self.settings.cloudflare_timeout_seconds} seconds.")

            time.sleep(1)

        return RawBrowserResponse(
            url=self.driver.current_url,
            html=self.driver.page_source,
            title=self.driver.title,
            headers={},
            cookies={},
            metadata={}
        )

    def close(self):
        if self.driver:
            self.driver.quit()
