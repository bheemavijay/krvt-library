# Refinement Backlog

This document tracks all deferred work discovered during the Architecture Refactor.

Rules

- Never stop an architecture sprint to fix an item here unless it blocks the build.
- Every new issue discovered during development is added here.
- Remove an item only after it has been verified as fixed.
- Architecture always has higher priority than polish.

---

# Phase B - UI / UX

## Import

- [ ] Progress occasionally shows incorrect values (example: 100 of 51 chapters).
- [ ] Status text remains "Starting download..." after completion.
- [ ] Download button sometimes stays in loading state.
- [ ] Improve progress animation.
- [ ] Better error messages.
- [ ] Better cancel handling.
- [ ] Disable duplicate clicks while importing.
- [ ] Improve mobile layout.
- [ ] Better provider detection.
- [ ] Show ETA.
- [ ] Show downloaded chapter speed.

---

## Library

- [ ] Improve loading animation.
- [ ] Better empty state.
- [ ] Faster filtering.
- [ ] Better search highlighting.
- [ ] Better continue-reading cards.
- [ ] Better sorting UI.
- [ ] Skeleton loaders.
- [ ] Reduce homepage render time.

---

## Reader

- [ ] Scrolling still feels jerky on long chapters.
- [ ] Improve chapter switching animation.
- [ ] Preserve scroll position more accurately.
- [ ] Better chapter dropdown.
- [ ] Better paragraph spacing.
- [ ] Better font rendering.
- [ ] Reader performance profiling.
- [ ] Better loading skeleton.
- [ ] Reduce unnecessary rerenders.

---

## TTS

- [ ] Highlight timing drifts slightly.
- [ ] Paragraph restart when settings change.
- [ ] Resume should continue from exact sentence.
- [ ] Voice switching should not restart chapter.
- [ ] Better buffering.
- [ ] Better pause/resume.
- [ ] Better Android synchronization.
- [ ] Improve chunk splitting.
- [ ] Improve sentence detection.

---

## Backup

- [ ] Better export progress.
- [ ] Better import progress.
- [ ] Backup validation.
- [ ] Duplicate detection.
- [ ] Corruption detection.

---

## Settings

- [ ] Better settings organization.
- [ ] Search inside settings.
- [ ] Reset section individually.
- [ ] Preview before applying.

---

# Phase C - Performance

## Database

- [ ] Benchmark IndexedDB.
- [ ] Reduce unnecessary reads.
- [ ] Reduce writes.
- [ ] Better caching.
- [ ] Lazy loading.

---

## Rendering

- [ ] Remove unnecessary rerenders.
- [ ] Memoize expensive calculations.
- [ ] Virtualize large lists if needed.
- [ ] Optimize reader rendering.

---

## Backend

- [ ] Improve scraper retry logic.
- [ ] Better provider logging.
- [ ] Better timeout handling.
- [ ] Better download queue.
- [ ] Parallel download tuning.

---

# Phase D - Code Cleanup

## Remove Compatibility Wrappers

- [ ] Remove lib/importer.ts
- [ ] Remove lib/storage/indexeddb.ts wrapper
- [ ] Remove remaining legacy facades
- [ ] Remove commented legacy code

---

## Repository Cleanup

- [ ] Split files larger than 350 lines.
- [ ] Remove duplicated utilities.
- [ ] Remove dead code.
- [ ] Remove unused exports.
- [ ] Remove obsolete comments.

---

# Architecture Audit

Run after Phase A is complete.

## Large Files (>350 lines)

- [ ] app/page.tsx
- [ ] components/reader/reader-page-client.tsx
- [ ] lib/tts.ts
- [ ] storage/repositories/NovelRepository.ts
- [ ] backend/providers/mvlempyr/index.js
- [ ] components/reader/settings-modal.tsx
- [ ] components/reader/reader-shell.tsx

Each file must be reviewed and split if possible.

---

## Final Verification

- [ ] No circular dependencies.
- [ ] No feature imports internals from another feature.
- [ ] All features expose only index.ts.
- [ ] Build passes.
- [ ] Android build passes.
- [ ] Import works.
- [ ] Reader works.
- [ ] TTS works.
- [ ] Backup works.
- [ ] Update works.