from .base import BaseProvider
from .info import ProviderInfo
from .context import ProviderContext

class ProviderFactory:
    """
    Responsible for instantiating provider classes.
    """
    @staticmethod
    def create(info: ProviderInfo, context: ProviderContext) -> BaseProvider:
        """
        Creates an instance of a provider.
        """
        return info.provider_class(context)
