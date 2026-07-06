# Refinement Backlog

This document tracks known issues, bugs, and areas for future improvement that are discovered during the Phase A architecture refactor. These items should be addressed in a later phase (e.g., Phase B: Performance, Phase C: Polish) and should not block the current architectural work.

## Known Issues

-   **Import Feature:**
    -   Progress indicator sometimes shows an incorrect total (e.g., "100 of 51").
    -   The status message "Starting download..." persists even after the import process has completed.
    -   The "Download" button does not always reset its state after an import finishes or fails.

-   **Reader Feature:**
    -   Scrolling can feel jerky or unsmooth on certain devices or with large chapters.

-   **TTS (Text-to-Speech) Feature:**
    -   The word or sentence highlighting is sometimes slightly out of sync with the spoken audio.
