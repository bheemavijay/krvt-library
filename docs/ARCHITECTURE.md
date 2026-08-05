# KRVT Retriever Architecture

This document outlines the architecture of the KRVT Retriever, a framework for downloading and processing web novels from various sources. The architecture is designed to be modular, extensible, and maintainable, with a clear separation of concerns between components.

## 1. Component Diagram & Responsibilities

The framework is composed of several key components, each with a single, well-defined responsibility.

| Component | Responsibility | "Owns" | "Does NOT Own" |
|---|---|---|---|
| **DownloadEngine** | Orchestrates the entire download process from start to finish. | The overall workflow, calling other components in sequence. | HTML parsing, file I/O, data normalization, browser interaction. |
| **ProviderManager** | Resolves a URL to the correct `Provider`. | A registry of all available providers. | Provider logic, downloading. |
| **Provider** | Parses HTML from a specific source into raw data models. | CSS selectors, site-specific navigation logic. | Downloading, storage, data normalization, batching. |
| **BrowserContext** | Manages browser interactions and fetches HTML content. | Browser instances (`playwright`, `puppeteer`), handling Cloudflare. | Parsing HTML, provider-specific logic. |
| **Normalizer** | Converts raw data models (`RawMetadata`, `RawChapter`) into canonical models. | Data cleaning, genre mapping, status normalization. | HTML parsing, downloading, file I/O. |
| **BatchBuilder** | Accumulates chapters into memory-efficient batches. | A temporary list of `Chapter` objects. | Storage, downloading, data normalization. |
| **StorageWriter** | Persists canonical data models to a storage backend (e.g., filesystem). | File paths, directory structure, writing JSON/assets. | Data generation, normalization, download logic. |
| **NovelId Utility** | Generates deterministic, unique IDs for novels. | The algorithm for creating `novel_id` strings. | Anything other than ID generation. |

---

## 2. Download Flow

The download process is a linear pipeline orchestrated by the `DownloadEngine`.

```
User URL
 │
 ▼
DownloadRequest
 │
 ▼
DownloadEngine
 │
 ├───────────────┐
 ▼               ▼
ProviderManager  StorageWriter
 │
 ▼
Provider
 │
 ▼
BrowserContext
 │
 ▼
HTML
 │
 ├──────────────────────────────────────┐
 ▼                                      ▼
parse_metadata()                 parse_chapter()
 │                                      │
 ▼                                      ▼
RawNovelMetadata                  RawChapter
 │                                      │
 ▼                                      ▼
MetadataNormalizer               ChapterNormalizer
 │                                      │
 ▼                                      ▼
NovelMetadata                    Chapter
 │                                      │
 ▼                                      ▼
Storage.begin()                  BatchBuilder
                                        │
                                        ▼
                               Storage.append_batch()
                                        │
                                        ▼
                              Storage.save_checkpoint()
```

The `DownloadEngine` calls each component in sequence, transforming data at each step until it is persisted by the `StorageWriter`. This ensures that no single component has too many responsibilities.

---

## 3. Storage Layout

The `FilesystemStorage` implementation uses a standardized directory structure to store novel data. This layout is designed for modularity, easy access, and future export capabilities.

The root directory is `novels/`. Each novel is stored in a subdirectory named after its unique `novel_id`.

```
novels/
└── <novel_id>/
    │
    ├── metadata.json       # Canonical novel metadata (title, author, etc.)
    ├── source.json         # Source information (provider, URL, language)
    ├── statistics.json     # Download stats (chapter count, last updated)
    ├── checkpoint.json     # Resume information (last downloaded chapter)
    │
    ├── chapters/           # Directory for individual chapter files
    │     0001.json
    │     0002.json
    │     ...
    │
    ├── assets/             # Directory for downloaded media
    │     cover.jpg
    │     banner.jpg
    │     ...
    │
    └── export/             # Directory for exported formats (future use)
          epub/
          json/
          zip/
```

This structure ensures that updating a single chapter or piece of metadata does not require rewriting a large monolithic file. The folder itself represents the novel, and the files within describe its various parts.
