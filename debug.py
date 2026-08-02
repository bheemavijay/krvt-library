import os
import time
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.exceptions.exceptions import NavigationException

def main():
    output_dir = "debug"
    os.makedirs(output_dir, exist_ok=True)
    output_html_path = os.path.join(output_dir, "output.html")

    # 1. Configure
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path("default/main")

    # Run headful to allow manual Cloudflare solving
    settings = Settings(profile_path=profile_path, headless=False)

    # 2. Instantiate
    context = BrowserContext(settings)

    # 3. Use
    start_time = time.time()
    try:
        print("Starting browser context...")
        context.start()
        print("Browser context started.")

        url = "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe"
        print(f"Navigating to URL: {url}")

        response = context.get(url)

        elapsed_time = (time.time() - start_time) * 1000

        print("\n--- Navigation Result ---")
        print(f"Final URL:   {response.url}")
        print(f"Title:       {response.title.strip()}")
        print(f"HTML Size:   {len(response.html)} bytes")
        print(f"Elapsed Time:{elapsed_time:.2f} ms")

        print("\nSaving HTML...")
        with open(output_html_path, "w", encoding="utf-8") as f:
            f.write(response.html)
        print(f"HTML saved to: {output_html_path}")

    except NavigationException as e:
        print(f"\n--- Navigation Failed ---")
        print(f"Error: {e}")
    except Exception as e:
        print(f"\n--- An Unexpected Error Occurred ---")
        print(f"Error: {e}")
    finally:
        print("\nClosing browser context...")
        context.close()
        print("Browser context closed.")

if __name__ == "__main__":
    main()
