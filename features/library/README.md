# Library Feature

This feature is responsible for managing the user's collection of saved novels.

## Feature Purpose

-   Display the user's saved novels.
-   Allow searching, sorting, and filtering of the library.
-   Provide actions to manage novels (e.g., delete).
-   Expose hooks for other features to interact with library data.

## Public API

The public API is exposed through `features/library/index.ts`.

-   `useLibrary()`: A hook to access and manage the main library view.
-   `useNovel(novelId)`: A hook to load a single, full novel object.
-   `useBookmarks(novelId)`: A hook to manage bookmarks for a specific novel.
-   `useHistory()`: A hook to access the user's reading history and continue reading list.

## Dependency Graph

**Component → Hook → Service → Repository → Storage**

Internal services, repositories, and types are not exposed to other features.

## Owned State

-   The complete list of novel summaries.
-   Novel details (when a single novel is loaded).
-   Bookmark information.
-   User's reading progress/history (consumed from the Reader feature).
