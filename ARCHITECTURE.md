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

## Directory Structure

Each feature within the `features/` directory must follow this layout. A new folder should not be created until at least two files need it (e.g., do not create `queries/` for a single query file).

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

#### Types
-   **Responsibility:** Define data contracts for a feature.
-   Types should be feature-owned. Only move a type to `shared/types` if it is genuinely reused by 2 or more features.

## Migration Rules

1.  **Move, Don't Rewrite:** Existing implementations must be moved, not rewritten from memory. Git history is the source of truth.
2.  **Compatibility wrappers are temporary.** They are used to allow legacy code to call new implementations without breaking.
3.  **Compatibility wrappers are ONE-WAY only.**
    -   **Allowed:** `Legacy Code` → `Legacy Wrapper` → `New Implementation`
    -   **Forbidden:** `New Implementation` → `Legacy Wrapper`
4.  Every migration must preserve behavior before improving design.
5.  A feature is considered migrated only after the build passes, runtime passes, the feature works, and the legacy wrapper is the only remaining compatibility layer.

## File Size Guidelines

-   **Ideal:** < 150 lines
-   **Warning:** 150–250 lines (Consider refactoring)
-   **Hard Limit:** 350 lines (Must be split before adding new functionality)
