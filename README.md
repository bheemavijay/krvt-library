# krvt-library

KRVT Library is a novel reading app with import utilities for parsing external sources.

## mvlempyr import runner

The project includes a simple Node-friendly import runner at `lib/import/run-mvlempyr-import.ts`.

It will:
- fetch a mvlempyr novel page
- parse novel metadata and chapter URLs with the existing parser
- fetch chapters in batches of 5
- retry failed chapter fetches up to 2 times with a 500ms delay
- skip failed chapters after retries
- log progress, timing, and an import summary

The runner accepts an optional novel URL argument. If none is provided, it uses the default sample mvlempyr novel URL in the script.
