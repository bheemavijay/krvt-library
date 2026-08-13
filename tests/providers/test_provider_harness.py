import pytest
from src.retriever.providers.registry import ProviderRegistry
from src.retriever.providers.manifest import ProviderManifest
from src.retriever.providers.context import ProviderContext
from src.retriever.core.context import BrowserContext
from src.retriever.runtime.services import RuntimeServices
from unittest.mock import MagicMock

def test_provider_manifests_are_valid(initialized_provider_registry: ProviderRegistry):
    """
    Validates that each provider has a valid manifest.
    """
    for provider_info in initialized_provider_registry.providers.values():
        assert provider_info.manifest is not None
        assert isinstance(provider_info.manifest, ProviderManifest)

        manifest = provider_info.manifest
        assert manifest.id is not None and len(manifest.id) > 0
        assert manifest.name is not None and len(manifest.name) > 0
        assert manifest.version is not None and len(manifest.version) > 0
        assert manifest.api_version is not None and manifest.api_version > 0
        assert manifest.url_patterns is not None and len(manifest.url_patterns) > 0

@pytest.mark.asyncio
async def test_provider_metadata_methods(initialized_provider_registry: ProviderRegistry, fake_browser_context_factory):
    """
    A placeholder test to validate the provider's metadata method.
    This will need to be expanded with real URLs and expected data.
    """
    for provider_info in initialized_provider_registry.providers.values():
        # We need a sample URL for each provider to test this
        if not hasattr(provider_info.manifest, "sample_urls") or not provider_info.manifest.sample_urls:
            pytest.skip(f"No sample URLs for provider {provider_info.manifest.id}")

        sample_url = provider_info.manifest.sample_urls[0]

        # Mock the context needed by the provider
        browser_context = fake_browser_context_factory({})
        runtime_services = MagicMock(spec=RuntimeServices)
        provider_context = ProviderContext(browser=browser_context, services=runtime_services)

        provider = provider_info.provider_class(provider_context)

        # For now, we just check that the method exists.
        assert hasattr(provider, "metadata")

@pytest.mark.asyncio
async def test_provider_chapters_methods(initialized_provider_registry: ProviderRegistry, fake_browser_context_factory):
    """
    A placeholder test to validate the provider's chapters method.
    """
    for provider_info in initialized_provider_registry.providers.values():
        if not hasattr(provider_info.manifest, "sample_urls") or not provider_info.manifest.sample_urls:
            pytest.skip(f"No sample URLs for provider {provider_info.manifest.id}")

        sample_url = provider_info.manifest.sample_urls[0]

        browser_context = fake_browser_context_factory({})
        runtime_services = MagicMock(spec=RuntimeServices)
        provider_context = ProviderContext(browser=browser_context, services=runtime_services)

        provider = provider_info.provider_class(provider_context)

        assert hasattr(provider, "chapters")
