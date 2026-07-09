# KRVT Architecture V2 Standard

This document is the definitive and final source of truth for the KRVT project's architecture. All new and refactored features must strictly adhere to this standard.

## Core Principles

1.  **Single Responsibility Principle (SRP):** Every file must have exactly one reason to change.
2.  **Separation of Concerns:** Layers must be independent and unaware of each other's internal implementations.
3.  **Feature Independence:** Each feature must be self-contained. Features can only communicate through their public `index.ts` barrel file. Avoid importing internal files from another feature.
4.  **Consistency:** All features must follow the same architectural pattern.

## Feature Ownership

Every feature owns exactly one domain. No feature should duplicate another feature's responsibility.

-   **Library:** Owns novels, search, filters, library state.
-   **Reader:** Owns chapter navigation, progress, history, continue reading.
-   **Import:** Owns scraping, parsing, importing, updating.
-   **TTS:** Owns voices, playback, queue, adapters.

## Type Ownership

A type has exactly one canonical owner.

-   **Shared Domain Models** (e.g., `Novel`, `Chapter`, `ReaderProgress`) live in `shared/types`.
-   **Feature-Specific View Models** (e.g., `ReaderViewState`, `LibraryActions`) live in `features/<feature>/types`.
-   Never duplicate an existing type. Import the canonical type instead. If two identical types exist, remove the duplicate.

## Directory Structure

Each feature within the `features/` directory must follow this layout. A new folder should not be created until at least two files need it.

```
feature/
│
├── README.md           # Feature-specific documentation.
├── components/         # (UI) React components.
├── hooks/              # (View-Logic) React state and lifecycle management.
├── services/           # (Business Logic) Business operations and orchestration.
├── repositories/       # (Data Access) Data source abstraction.
├── types/              # Feature-owned TypeScript types.
├── utils/              # Pure, reusable helper functions.
├── constants/          # Feature-specific constants.
└── index.ts            # Barrel file for the feature's public API.
```

## Dependency Flow & Layer Responsibilities

The dependency flow is strictly unidirectional: **Component → Hook → Service → Repository → Storage**. There are **no exceptions**.

#### Components
-   **Responsibility:** Render UI only.
-   Receives state and callbacks from Hooks.
-   Must not contain any business logic.

#### Hooks
-   **Responsibility:** Adapt React state and lifecycle to the service layer.
-   Manages React state (`useState`, `useEffect`, `useMemo`, `useCallback`).
-   Calls Services to execute business logic.
-   Must not contain reusable business algorithms.

#### Services
-   **Responsibility:** Contain all business logic. One service should represent one use case.
-   Services must be pure (Input → Output) and framework-agnostic (no React/DOM).
-   One file = one responsibility.

#### Repositories
-   **Responsibility:** Provide a pure data access layer (CRUD).
-   Translates data between the application and the storage layer.
-   Must **never** contain business logic like searching, filtering, sorting, or validation.

## Refactoring Rules

1.  **Move, Don't Rewrite:** Existing implementations must be moved, not rewritten from memory. Git history is the source of truth.
2.  **One Responsibility Per Sprint:** Do not refactor unrelated code.
3.  **Repositories are Stable:** Do not refactor repositories while migrating a feature unless the repository itself is the current sprint's objective.
4.  **One-Way Wrappers:** Compatibility wrappers are temporary and one-way only. New code must never depend on a legacy wrapper.
5.  **Preserve Behavior:** Every migration must preserve existing behavior before improving design.
6.  **Build After Every Migration:** A build must pass after every small, verifiable step.

## File Size Guidelines

-   **Ideal:** < 150 lines
-   **Warning:** 150–250 lines (Consider refactoring)
-   **Hard Limit:** 350 lines (Must be split before adding new functionality)
