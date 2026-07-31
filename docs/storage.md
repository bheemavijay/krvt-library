# KRVT Storage

Storage access should sit behind repositories.

Allowed storage owners:

- `storage/db/indexeddb.ts`: IndexedDB connection and object store setup.
- `storage/repositories/*`: canonical persistence repositories for novels, chapters, bookmarks, backups, and settings.
- Feature repositories: feature-specific browser or platform persistence, such as reader settings, reading state, reader navigation markers, and TTS resume state.

Services may call repositories. Hooks and components should not call browser storage or IndexedDB directly for business persistence.

Known compatibility paths remain only where they still have consumers:

- `lib/storage/indexeddb`
- `lib/storage/bookmarks`
- `lib/bookmark-storage`
- `lib/app-settings`

These wrappers should not be used by new feature code.
