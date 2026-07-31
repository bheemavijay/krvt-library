# KRVT Architecture

KRVT uses a one-way feature architecture:

Component -> Hook -> Service -> Repository -> Storage

Components render UI and receive state or callbacks from hooks. Hooks adapt React state and lifecycle to the service layer. Services own business rules, orchestration, validation, normalization, and merge logic. Repositories own persistence boundaries and call storage/platform APIs. Storage owns IndexedDB, local platform APIs, and low-level browser or Capacitor access.

Feature code should communicate with another feature through that feature's public `index.ts` barrel. Internal service, repository, hook, and type paths are implementation details unless the import stays inside the same feature.

Compatibility wrappers are temporary. They may stay only while real consumers remain, and new code should use the canonical feature or storage owner instead.
