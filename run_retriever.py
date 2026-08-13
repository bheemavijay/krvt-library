import asyncio
import os
import argparse
import json
import sys
from enum import Enum
from typing import Optional, Dict, Any

from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.providers.registry import ProviderRegistry
from src.retriever.storage.filesystem_storage import FilesystemStorage
from src.retriever.runtime.services import RuntimeServices
from src.retriever.retry.executor import RetryExecutor
from src.retriever.rate_limit.token_bucket import TokenBucketLimiter
from src.retriever.metrics.collector import MetricsCollector
from src.retriever.observers.console_observer import ConsoleDownloadObserver
from src.retriever.assets.downloader import AssetDownloader
from src.retriever.assets.options import AssetDownloadOptions
from src.retriever.download.downloader import DownloadEngine
from src.retriever.download.request import DownloadRequest
from src.retriever.exceptions.exceptions import NavigationException

def json_default(o):
    if isinstance(o, Enum):
        return o.value
    raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

def run(url: str, existing_novel_data: Optional[Dict[str, Any]] = None):
    output_dir = os.path.join(os.path.dirname(__file__), 'novels')
    os.makedirs(output_dir, exist_ok=True)

    provider_registry = ProviderRegistry()
    provider_registry.discover()
    provider_registry.validate()
    provider_registry.initialize()
    provider_registry.freeze()

    runtime_services = RuntimeServices(
        retry_executor=RetryExecutor(),
        rate_limiter=TokenBucketLimiter(),
        metrics=MetricsCollector(),
        observer=ConsoleDownloadObserver(),
    )

    settings = Settings(profile_path=os.path.join(output_dir, "profile"), headless=True)
    browser_context = BrowserContext(settings)
    storage = FilesystemStorage(base_dir=output_dir)

    asset_downloader = AssetDownloader(
        storage=storage,
        observer=runtime_services.observer,
        retry_executor=runtime_services.retry_executor
    )

    engine = DownloadEngine(
        browser_context=browser_context,
        storage=storage,
        provider_registry=provider_registry,
        runtime_services=runtime_services,
        asset_downloader=asset_downloader,
        asset_options=AssetDownloadOptions(enabled=True, download_cover=True),
    )

    request = DownloadRequest(url=url)

    existing_chapter_count = 0
    if existing_novel_data and 'lastChapterIndex' in existing_novel_data:
        existing_chapter_count = existing_novel_data['lastChapterIndex'] + 1 # lastChapterIndex is 0-based

    try:
        result = asyncio.run(engine.download(request, existing_chapter_count=existing_chapter_count))
        print(json.dumps(result.to_dict(), default=json_default))
    except (NavigationException, Exception) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download a novel from a URL.')
    parser.add_argument('url', type=str, help='The URL of the novel to download.')
    parser.add_argument('--existing-novel', type=str, help='JSON string of existing novel data.')
    args = parser.parse_args()

    existing_novel_data = None
    if args.existing_novel:
        try:
            existing_novel_data = json.loads(args.existing_novel)
        except json.JSONDecodeError:
            print("Error: Invalid JSON for --existing-novel", file=sys.stderr)
            sys.exit(1)

    run(args.url, existing_novel_data)