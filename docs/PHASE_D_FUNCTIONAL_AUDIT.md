# KRVT Library - Phase D Functional Audit

This document contains the master checklist for the remaining development work before release.

---

## 1. Architecture

### ID: ARCH-001
- **Title**: Duplicate and Overlapping Reader State Management
- **Severity**: HIGH
- **Feature**: Reader, Settings
- **Expected**: A single, clear source of truth for reader-related settings. Global settings (affecting the whole app) should be clearly separated from reader-specific settings (affecting only the reader view).
- **Actual**: There are two separate services managing reader settings: `readingStateService.ts` and `readerSettingsService.ts`. They manage two different state objects (`LibraryReadingState` and `ReaderSettings`) which are stored in two different localStorage keys (`krvt-library-reading-state` and `krvt-reader-settings`). There is an overlap in the settings they manage (e.g., `fontFamily`, `fontSize`, `tts`), leading to confusion about which service is the source of truth. `LibraryReadingState` also mixes global state (`lastOpenedNovelId`) with reader state.
- **Root Cause**: The architecture evolved to have two systems for settings. The `readingStateService` appears to be an older, legacy system that was partially replaced or augmented by `readerSettingsService`, but the old settings were never fully deprecated or migrated.
- **Files Involved**:
  - `features/reader/services/readingStateService.ts`
  - `features/reader/repositories/readingStateRepository.ts`
  - `features/reader/services/readerSettingsService.ts`
  - `features/reader/repositories/readerSettingsRepository.ts`
- **Suggested Fix**:
  1. Consolidate all reader-specific settings into `readerSettingsService.ts` and the `ReaderSettings` type.
  2. Remove the overlapping reader-specific properties (`fontFamily`, `fontSize`, `lineHeight`, `theme`, `tts`) from `readingStateService.ts` and the `LibraryReadingState` type.
  3. The `readingStateService` should be renamed to something like `libraryProgressService` and be responsible only for tracking reading progress (`progressByNovel`) and the last-opened novel (`lastOpenedNovelId`).
  4. Perform a data migration for users to move their settings from the old `localStorage` object to the new one to avoid losing user preferences.
- **Architecture Impact**: This is a significant architectural refactoring. It will simplify state management, remove ambiguity, and make the code easier to maintain. It will touch many files in the `reader` and `settings` features.
- **Behavior Impact**: If not handled with a data migration, users could lose their reader settings. If done correctly, the user should not notice any change in behavior, but the system will be more robust.
- **Reproduction Steps**: N/A (Architectural issue).

### ID: ARCH-002
- **Title**: TTS Player Uses Global State, Preventing Instantiation
- **Severity**: MEDIUM
- **Feature**: TTS, Architecture
- **Expected**: The core TTS playback logic should be encapsulated in a class or a factory function, allowing for multiple instances of the player to exist without interfering with each other.
- **Actual**: `TtsPlayer.ts` uses module-level `let` variables (`utterance`, `lastCallbacks`, `nativeSpeaking`, etc.) to manage the state of a single, global TTS instance. This is a fragile pattern that prevents proper state isolation.
- **Root Cause**: The service was written as a static utility module rather than an instantiable class. This is an architectural smell that survived the refactor.
- **Files Involved**:
  - `features/tts/services/runtime/TtsPlayer.ts`
- **Suggested Fix**:
  1. Refactor `TtsPlayer.ts` into a `TtsPlayer` class.
  2. Move all the module-level state variables to be private instance properties of the class.
  3. The `speak`, `pause`, `resume`, and `stop` functions should become methods of the class.
  4. The UI layer (likely a hook) will be responsible for creating and holding a single instance of this `TtsPlayer` class for the lifetime of the reader.
- **Architecture Impact**: This is a recommended architectural improvement. It makes the TTS feature more robust, testable, and future-proof. It aligns better with object-oriented principles and avoids the pitfalls of global state.
- **Behavior Impact**: No direct impact on current user behavior, as the app only uses one TTS instance at a time. However, it prevents future bugs if the app's complexity grows.
- **Reproduction Steps**: N/A (Architectural issue).

### ID: ARCH-003
- **Title**: Backup Repository Violates Feature Boundaries
- **Severity**: LOW
- **Feature**: Backup, Library, Architecture
- **Expected**: Services in one feature should ideally not call repositories from another feature directly. They should go through the public API of the other feature (i.e., its services or hooks).
- **Actual**: `backupRepository.ts` directly imports and re-exports functions from `NovelRepository.ts` (`getNovelSummaries`, `getNovel`, `addNovel`). The `backupService.ts` then calls these functions via the `backupRepository`.
- **Root Cause**: This seems to be a shortcut taken to give the backup service access to novel data without having to go through the library's services. The `addBackupNovel` function is a direct alias for `addNovel`, creating a confusing and unnecessary abstraction.
- **Files Involved**:
  - `features/backup/repositories/backupRepository.ts`
  - `features/backup/services/backupService.ts`
  - `storage/repositories/NovelRepository.ts`
- **Suggested Fix**:
  1. Remove `getBackupNovelSummaries`, `getBackupNovel`, and `addBackupNovel` from `backupRepository.ts`.
  2. The `backupService.ts` should instead import and use the necessary functions from the `library` feature's services (e.g., `getLibraryNovels` from `libraryService.ts` and `addNovel` from `features/library/services/commands/create/addNovel.ts`). This respects the established architectural boundaries.
- **Architecture Impact**: This is a minor refactoring that improves architectural consistency and reduces coupling between feature repositories.
- **Behavior Impact**: None. This is a pure architectural change.
- **Reproduction Steps**: N/A (Architectural issue).

---
## 2. Reader Settings

### ID: RS-001
- **Title**: Missing "Reset to Default" Functionality in Reader Settings
- **Severity**: MEDIUM
- **Feature**: Reader Settings
- **Expected**: A dedicated function in `readerSettingsService.ts` to reset all reader settings to their default values. This would be called by a "Reset" button in the UI.
- **Actual**: The `readerSettingsService.ts` does not expose a `resetSettings` function. To reset settings, the UI would need to import `defaultSettings` and manually call `saveSettings(defaultSettings)`, which is not a clean separation of concerns.
- **Root Cause**: The service was designed to save and merge settings, but the use case of resetting them was not explicitly implemented as a service-level function.
- **Files Involved**:
  - `features/reader/services/readerSettingsService.ts`
- **Suggested Fix**:
  1. Create a new exported function `resetSettings()` within `readerSettingsService.ts`.
  2. This function should call `saveSettings(defaultSettings)`.
  3. The UI "Reset" button should call this new `resetSettings()` function.
- **Architecture Impact**: Minor. It improves the service's API and encapsulation.
- **Behavior Impact**: Provides a way for users to reset their settings, which is a common and expected feature.
- **Reproduction Steps**:
  1. Open the reader settings panel.
  2. Look for a "Reset to Default" button.
  3. Observe that there is no single service function to power such a button.

---
## 3. Read Aloud (TTS)

### ID: TTS-001
- **Title**: Native TTS `resume` Functionality is Not Implemented
- **Severity**: BLOCKER
- **Feature**: TTS
- **Expected**: Calling `resume()` after `pause()` should continue TTS playback from the point where it was paused, on all platforms.
- **Actual**: On native platforms (Android), `pause()` stops playback completely. The `resume()` function is a no-op and does not restart or continue playback. The calling code must re-call `speak()` with the original text, which starts playback from the beginning of the text, not the paused position. This is a major behavioral inconsistency compared to the web implementation.
- **Root Cause**: The native TTS repository/plugin being used (`speakNative`, `stopNative`) appears to lack a `pause` and `resume` capability. The `pause()` function in `TtsPlayer.ts` works around this by simply stopping the speech (`stopNativeSpeech(true)`), but no corresponding workaround for `resume()` was implemented.
- **Files Involved**:
  - `features/tts/services/runtime/TtsPlayer.ts`
  - `features/tts/repositories/nativeTextToSpeechRepository.ts`
- **Suggested Fix**:
  1. **Ideal Fix**: If the underlying native TTS plugin supports pause/resume, implement `pauseNative()` and `resumeNative()` functions in the repository and call them from `TtsPlayer.ts`.
  2. **Workaround Fix**: If the native plugin does not support pause/resume, the `TtsPlayer` needs to manage the state itself. When `pause()` is called, it should record the current speech chunk/paragraph index and the approximate word or character index within it. When `resume()` is called, it would need to call `speak()` again, but with the text *from the paused location onwards*. This is complex and may result in a slight delay or jump, but it is better than restarting from the beginning.
- **Architecture Impact**: The ideal fix has minimal impact. The workaround fix adds significant state management complexity to `TtsPlayer.ts`.
- **Behavior Impact**: This is a critical bug for the usability of TTS on native platforms. Users expect `resume` to work correctly.
- **Reproduction Steps**:
  1. On a native Android device, open a chapter and start TTS.
  2. Press the "Pause" button. TTS stops.
  3. Press the "Resume" button.
  4. Observe that TTS does not resume.

---
## 4. Import & Update

### ID: IU-001
- **Title**: Import Progress Does Not Show Immediate Feedback
- **Severity**: LOW
- **Feature**: Import
- **Expected**: When an import is initiated, the progress indicator (`onProgress`) should immediately show a starting state (e.g., 0% downloaded).
- **Actual**: The `onProgress` callback is only fired *after* the first API call to the backend scraper completes. On a slow connection, this can leave the user waiting for several seconds with a generic "in progress" message and no specific feedback.
- **Root Cause**: The `onProgress` call is located inside the `while` loop of the `importNovel` function, and there is no initial call before the loop starts.
- **Files Involved**:
  - `features/import/services/importService.ts`
- **Suggested Fix**:
  1. Add an initial `onProgress` call at the beginning of the `importNovel` function, right after the lock is acquired.
  2. This initial call should signal that the process has started, with 0 chapters downloaded. For example: `onProgress?.({ novelId: currentNovel?.id ?? "", totalChapters: 0, downloadedChapters: 0, ... });`
- **Architecture Impact**: Minimal.
- **Behavior Impact**: Improves the user experience by providing immediate feedback during the import process.
- **Reproduction Steps**:
  1. On a simulated slow network, import a novel from a URL.
  2. Observe that the progress bar or percentage remains at 0 or in an indeterminate state for a long time before the first update.

---
## 5. Backup & Restore

### ID: BR-001
- **Title**: Backup Import Does Not Validate File Version
- **Severity**: MEDIUM
- **Feature**: Backup
- **Expected**: The `importLibrary` function should check the `version` field of the backup JSON file and either handle the old version (if possible) or throw an error if the version is incompatible.
- **Actual**: The `importLibrary` and `importLibraryFromText` functions do not inspect the `version` field in the backup file. They directly attempt to parse the `novels` array. If a future update introduces a breaking change to the `Novel` data structure, importing an old backup file could lead to data corruption or crashes.
- **Root Cause**: The versioning mechanism was added to the export format, but the corresponding check on import was not implemented.
- **Files Involved**:
  - `features/backup/services/backupService.ts`
- **Suggested Fix**:
  1. In `importLibraryFromText` (which the streaming parser also implicitly relies on for the overall structure), parse the initial part of the JSON to get the `version`.
  2. Compare the version to the current version expected by the app.
  3. If the version is unsupported, throw an informative error to the user (e.g., "This backup file is from an older, incompatible version of the app.").
  4. If it's a supported older version, apply a data migration function to transform the old novel structures into the new format before adding them to the database.
- **Architecture Impact**: This introduces the need for a data migration path within the backup/restore feature, which is a good practice for long-term maintenance.
- **Behavior Impact**: Prevents data corruption from importing old backups and provides clear feedback to the user.
- **Reproduction Steps**:
  1. Create a backup file with `version: 1`.
  2. Manually edit the backup file to simulate a future breaking change (e.g., rename a field in one of the novel objects).
  3. Attempt to import the modified backup file.
  4. Observe that the import may fail with a cryptic error or import corrupted data, instead of a clear version incompatibility error.

---
## 6. Dead Code

### ID: DC-001
- **Title**: Unused Backend Service
- **Severity**: HIGH
- **Feature**: Architecture, Import
- **Expected**: The repository should not contain large, unreferenced directories of code.
- **Actual**: The entire `backend/` directory appears to be dead code. It contains a full Node.js Express server for scraping novels, but the application has been migrated to use a configurable external API for this purpose (controlled by `NEXT_PUBLIC_IMPORT_API_URL`). The `package.json` has no scripts to run this backend, and there are no apparent references to it in the application code.
- **Root Cause**: This is a remnant of a previous architecture where the application and its scraping backend were in the same repository. The frontend was migrated to a new system, but the old backend was never removed.
- **Files Involved**:
  - The entire `backend/` directory.
- **Suggested Fix**:
  1. Confirm with the development team that no part of the deployment process or any other hidden script relies on this directory.
  2. Once confirmed, delete the entire `backend/` directory from the repository.
  3. Remove any related dependencies (`express`, `cors`, `cheerio`, etc.) from the root `package.json` if they are no longer needed by any other part of the application.
- **Architecture Impact**: Major positive impact. Removes a significant amount of dead code, reduces repository size, and eliminates confusion about the application's architecture.
- **Behavior Impact**: None, as the code is already unused.
- **Reproduction Steps**: N/A (Dead code).

### ID: DC-002
- **Title**: Leftover Debugging and Artifact Files
- **Severity**: LOW
- **Feature**: Architecture
- **Expected**: The repository should not contain temporary debugging files, backups, or redundant file formats.
- **Actual**: Several files appear to be artifacts of the development process and should be removed:
  - `debug.html`, `debug-novel.html`, `debug-mvlempyr.html`: Old HTML files for debugging.
  - `components.zip`, `app.zip`, `lib.zip`: Zip archives that should not be in the repository.
  - `core/domain/genres.js`: A JavaScript file that is redundant due to the existence of `core/domain/genres.ts`.
- **Root Cause**: These files were likely created during development and were not added to `.gitignore` or were forgotten and never cleaned up.
- **Files Involved**:
  - `debug.html`
  - `debug-novel.html`
  - `debug-mvlempyr.html`
  - `components.zip`
  - `app.zip`
  - `lib.zip`
  - `core/domain/genres.js`
- **Suggested Fix**:
  1. Delete these files from the repository.
  2. Add `*.zip` and `*.html` (if appropriate for the project's root) to the `.gitignore` file to prevent them from being committed again.
- **Architecture Impact**: Minor. Improves repository hygiene.
- **Behavior Impact**: None.
- **Reproduction Steps**: N/A (Dead code).

---
## 7. Performance

### ID: PERF-001
- **Title**: Unstable Function References in `useReaderScroll` Dependency Array
- **Severity**: MEDIUM
- **Feature**: Reader, Performance
- **Expected**: `useEffect` hooks should not run unnecessarily. Functions passed as props and used in dependency arrays should be memoized with `useCallback` to prevent re-renders.
- **Actual**: The main `useEffect` in `useReaderScroll.ts` has a large dependency array that includes several functions passed down as props (`clearTopNavigationRequest`, `getLegacyScrollPosition`, `readTopNavigationRequest`). If these functions are not wrapped in `useCallback` in the parent component (`ReaderPageClient`), they will have a new reference on every render, causing this effect to re-run every time the parent component re-renders. This can lead to unexpected scrolling behavior and performance issues.
- **Root Cause**: Lack of memoization for functions passed as props to the `useReaderScroll` hook.
- **Files Involved**:
  - `features/reader/hooks/useReaderScroll.ts`
  - `components/reader/reader-page-client.tsx` (Likely parent)
- **Suggested Fix**:
  1. In the parent component that calls `useReaderScroll` (likely `reader-page-client.tsx`), wrap the definitions of `clearTopNavigationRequest`, `getLegacyScrollPosition`, and `readTopNavigationRequest` in `useCallback` with appropriate dependency arrays.
- **Architecture Impact**: Minor. Encourages better performance practices.
- **Behavior Impact**: Prevents a potential bug where the reader scrolls to the top unexpectedly during a re-render. Improves performance by avoiding unnecessary effect executions.
- **Reproduction Steps**:
  1. Add a `console.log` inside the first `useEffect` of `useReaderScroll.ts`.
  2. Trigger a re-render of the parent `ReaderPageClient` component (e.g., by changing a state that doesn't affect the scroll position).
  3. Observe that the `console.log` is fired, indicating the effect is re-running, which may trigger a scroll.
