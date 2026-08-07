from typing import Optional
from src.retriever.exceptions.exceptions import NavigationException, ParserException
from .failure_type import FailureType

class FailureClassifier:
    """
    Classifies exceptions and status codes into FailureType enums.
    """
    def classify(self, exception: Optional[Exception]) -> FailureType:
        """
        Classifies an exception into a FailureType.
        """
        if isinstance(exception, (NavigationException, TimeoutError, ConnectionError)):
            return FailureType.NETWORK

        if isinstance(exception, ParserException):
            return FailureType.PARSER

        # Check for HTTP status codes if the exception has them
        status_code = getattr(exception, 'status_code', None)
        if status_code:
            if status_code == 429:
                return FailureType.RATE_LIMIT
            if status_code in [401, 403]:
                return FailureType.AUTH
            if 500 <= status_code < 600:
                return FailureType.SERVER
            if 400 <= status_code < 500:
                return FailureType.CLIENT

        return FailureType.UNKNOWN
