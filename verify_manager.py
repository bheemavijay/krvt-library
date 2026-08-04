from src.retriever.providers.manager import ProviderManager

def main():
    print("--- Verifying Refined ProviderManager API ---")

    # 1. Verify ProviderManager.list()
    print("\n[1] Verifying ProviderManager.list()...")
    provider_list = ProviderManager.list()
    expected_list = [
        {'id': 'readnovelmtl', 'name': 'ReadNovelMTL'},
        {'id': 'fanmtl', 'name': 'FanMTL'},
        {'id': 'mvlempyr', 'name': 'MVLEMPYR'},
    ]
    print(f"  - Expected: {expected_list}")
    print(f"  - Actual:   {provider_list}")
    assert provider_list == expected_list
    print("  - PASSED")

    # 2. Verify ProviderManager.resolve()
    print("\n[2] Verifying ProviderManager.resolve()...")
    url = "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe"
    provider = ProviderManager.resolve(url)
    print(f"  - Expected ID: 'readnovelmtl'")
    print(f"  - Actual ID:   '{provider.id}'")
    assert provider.id == "readnovelmtl"
    print("  - PASSED")

    # 3. Verify ProviderManager.supports()
    print("\n[3] Verifying ProviderManager.supports()...")

    supported_url = "https://readnovelmtl.com/novel/some-novel"
    supported_url_2 = "https://www.mvlempyr.io/novel/some-novel"
    unsupported_url_2 = "https://novelfull.net/some-novel"

    print(f"  - Testing '{supported_url}':")
    supported_result = ProviderManager.supports(supported_url)
    print(f"    - Expected: True")
    print(f"    - Actual:   {supported_result}")
    assert supported_result is True
    print("    - PASSED")

    print(f"  - Testing '{supported_url_2}':")
    supported_result_2 = ProviderManager.supports(supported_url_2)
    print(f"    - Expected: True")
    print(f"    - Actual:   {supported_result_2}")
    assert supported_result_2 is True
    print("    - PASSED")

    print(f"  - Testing '{unsupported_url_2}':")
    unsupported_result_2 = ProviderManager.supports(unsupported_url_2)
    print(f"    - Expected: False")
    print(f"    - Actual:   {unsupported_result_2}")
    assert unsupported_result_2 is False
    print("    - PASSED")

    print("\n--- All Verifications Passed ---")

if __name__ == "__main__":
    main()
