from bs4 import BeautifulSoup

class Document:
    """
    A wrapper around the parsed HTML document to abstract away the parsing library.
    Providers should interact with this object, not directly with BeautifulSoup or lxml.
    """
    def __init__(self, html: str):
        self._html = html
        self._soup = None

    @property
    def soup(self) -> BeautifulSoup:
        """
        Lazily initializes and returns a BeautifulSoup object.
        """
        if self._soup is None:
            self._soup = BeautifulSoup(self._html, 'html.parser')
        return self._soup

    @property
    def html(self) -> str:
        """
        Returns the raw HTML content.
        """
        return self._html
