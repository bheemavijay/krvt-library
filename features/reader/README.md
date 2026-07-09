# Reader Feature

## Purpose

This feature owns everything related to the novel reading experience.

## Public API

- `useReader()`: Manages the core reader state, including chapter content, navigation, and settings.
- `useBookmarks()`: Manages bookmarks for the current novel.
- `useReaderSettings()`: Manages user-specific reader preferences (font, theme, etc.).

## Dependencies

- **Library:** To load novel and chapter data.
- **Storage:** To persist reading progress and settings.

## Owns

- Chapter navigation (next/previous)
- Reading progress (scroll position, current chapter)
- "Continue Reading" state
- Reader-specific settings (font size, theme, line height)
- Text-to-Speech (TTS) session state within the reader

## Does NOT Own

- The library/shelf view
- Novel import/update logic
- Global application settings

## Future Work

- Implement virtual scrolling for large chapters.
- Add more themes and font choices.
- Improve TTS synchronization and controls.
- Refactor legacy `reader-storage` into repositories and services.
