# KRVT Refinement Backlog

This document tracks all deferred work for the KRVT project, including architectural cleanup, UI/UX polish, performance optimizations, and code quality improvements.

---

## Rules During Refactor

- **Never rewrite working code:** Always move existing, proven logic before refactoring or improving it.
- **Build after every migration:** Ensure the application is in a working state after every small, verifiable step.
- **Stop immediately on build failure:** Do not stack fixes. Investigate and resolve the root cause of each failure independently.
- **Audit before cleanup:** A feature's internal architecture must be stable and audited before its legacy UI components are migrated.
- **Cleanup only after migration:** Address technical debt (e.g., removing wrappers, deleting old files) only after a feature is fully migrated and verified.

---

# Phase A: Architecture Migration

This phase is focused exclusively on moving existing code into the new KRVT V2 architecture without changing runtime behavior.

## Migration Checklists

### Library Migration Cleanup
- [ ] Replace `HomePage` state with `useLibrary()`.
- [ ] Remove duplicate filtering logic from the component.
- [ ] Remove duplicate sorting logic from the component.
- [ ] Remove duplicate search logic from the component.
- [ ] Remove unused state after migration.
- [ ] Final library dependency audit.

### Import Migration Cleanup
- [ ] Replace `ImportBox` state with `useImport()`.
- [ ] Remove duplicate import lifecycle logic.
- [ ] Remove legacy importer calls from UI components.
- [ ] Final import dependency audit.

### Reader UI Migration
- [ ] Replace `ReaderPageClient` loading logic with `useReader()`.
- [ ] Replace Reader settings state with `useReaderSettings()`.
- [ ] Replace bookmark logic with `useBookmarks()`.
- [ ] Remove duplicate lifecycle logic from the component.
- [ ] Remove legacy `useEffect` hooks.
- [ ] Remove unused state after migration.
- [ ] Build passes.
- [ ] Manual reader verification (scrolling, navigation, settings, bookmarks).

---

# Phase B: UI / UX Polish

This phase focuses on improving the user experience and visual presentation.

## Import
- [ ] Progress occasionally shows incorrect values (e.g., 100 of 51 chapters).
- [ ] Status text remains "Starting download..." after completion.
- [ ] Download button sometimes stays in loading state.
- [ ] Improve progress animation and ETA display.

## Library
- [ ] Improve loading animation and add skeleton loaders.
- [ ] Design a better empty state.
- [ ] Improve search highlighting and filtering speed.

## Reader
- [ ] Address jerky scrolling on long chapters.
- [ ] Improve chapter switching animation.
- [ ] Preserve scroll position more accurately.

## TTS
- [ ] Highlight timing drifts slightly on some devices.
- [ ] Paragraph restart when settings change.
- [ ] Resume should continue from the exact sentence.

## Backup & Settings
- [ ] Improve export/import progress indicators.
- [ ] Add backup validation and corruption detection.
- [ ] Reorganize settings for better clarity.

---

# Phase C: Performance

This phase focuses on optimizing application speed and resource usage.

## Database
- [ ] Benchmark IndexedDB operations.
- [ ] Reduce unnecessary reads and writes.
- [ ] Implement a more sophisticated caching strategy.

## Rendering
- [ ] Remove unnecessary component re-renders.
- [ ] Memoize expensive calculations.
- [ ] Virtualize large lists (e.g., chapter index, library view).

## Backend
- [ ] Improve scraper retry logic and timeout handling.
- [ ] Tune parallel download queue for optimal performance.

---

# Phase D: Code Quality & Cleanup

This phase focuses on addressing technical debt and improving the overall health of the codebase.

## Architecture Cleanup
- [ ] **Compatibility Wrappers:** Remove all temporary compatibility wrappers (e.g., `lib/importer.ts`).
- [ ] **Legacy Libs:** Remove `lib/reader-storage.ts`, `lib/settings.ts`, etc., after their logic is fully migrated.
- [ ] **Duplicate Code:** Remove all duplicated implementations intentionally left during migration.
- [ ] **Type Verification:** Verify every feature imports only canonical shared types.
- [ ] **Barrel File Verification:** Verify every feature uses only public barrels for cross-feature access.
- [ ] **Final Architecture Audit:** Perform a final, full-project audit against `ARCHITECTURE.md`.

## Large Files Review
- **150-250 lines:** Review for potential splitting.
- **250-350 lines:** Split if possible.
- **350+ lines:** Must be split.
- **Files to Review:**
    - [ ] `app/page.tsx`
    - [ ] `components/reader/reader-page-client.tsx`
    - [ ] `lib/tts.ts`
    - [ ] `storage/repositories/NovelRepository.ts`

---

# Future Architecture Work

- [ ] **Feature Facades:** Review if any feature's orchestration logic has become complex enough to warrant a `facade.ts` service.
- [ ] **State Management:** Evaluate if a dedicated state management library (e.g., Zustand, Jotai) is needed as complexity grows, to replace module-level listeners.
- [ ] **Repository Layer:** Plan the migration of `localStorage`-based services (`reader-storage`, `settings`) to a formal `SettingsRepository` using IndexedDB.
