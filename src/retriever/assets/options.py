from dataclasses import dataclass

@dataclass
class AssetDownloadOptions:
    """
    Encapsulates options for an asset download operation.
    """
    enabled: bool = True
    download_cover: bool = True
    download_banner: bool = True
    # Add other asset types here as needed
