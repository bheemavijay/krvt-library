from dataclasses import dataclass

@dataclass
class Source:
    provider_id: str
    provider_name: str
    source_url: str
    language: str
    version: str
