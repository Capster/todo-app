# Proposal

## Why

The todo list works only on Android and iOS because `isomorphic-git` is wired
to an Expo-only filesystem adapter, so the web build shows an unsupported
message. That makes every repository, sync, and task-flow check require a
device. A browser filesystem backed by `@isomorphic-git/lightning-fs` lets the
same code run in the web build, which makes debugging practical.

## What Changes

- Add `@isomorphic-git/lightning-fs` as a dependency.
- Introduce a platform-selected filesystem module under `src/git/` that exposes
  one interface to the repository layer: the `isomorphic-git` `FsClient`,
  a stable repository root, and the path helpers currently taken directly from
  `expo-file-system` (existence checks, directory creation/removal, read, write,
  unlink, and rename).
- Keep the existing Expo adapter for Android and iOS. Select the browser adapter
  on web, backed by `lightning-fs` and persisted in IndexedDB, without importing
  browser globals into native bundles.
- Remove the web "unsupported" guard and message so the todo list loads,
  refreshes, and toggles tasks in a browser.
- Persist the web checkout under a fixed lightning-fs path so a page reload
  updates the existing checkout instead of cloning again.
- Add a configurable CORS proxy used only by web git network operations, read
  from `EXPO_PUBLIC_GIT_CORS_PROXY`. Because GitHub does not send CORS headers,
  web clone/pull/push cannot work without one; when the variable is missing,
  show a readable configuration error instead of a network failure.
- Document the web setup, the IndexedDB checkout, the CORS proxy requirement,
  and the requirement to run a local or self-hosted proxy rather than sending
  the token through a public proxy.
- **Out of scope**: multiple repositories or branches; authentication UI;
  background sync; conflict resolution; task creation, editing, or deletion;
  changing mobile storage layout; OPFS or service-worker storage; coordinating
  multiple browser tabs; migrating an existing mobile checkout to the web.

## Capabilities

### New Capabilities

None. The platform adapter is an implementation detail; the observable changes
extend existing behavior to the web build.

### Modified Capabilities

- `git-sync`: web is no longer unsupported. Browser clone/pull/push use an
  IndexedDB-backed checkout that survives reloads, and web network operations
  require a configured CORS proxy.
- `todo-list`: the task list, refresh, and completion toggles work on web as
  well as mobile, using the same repository semantics.

## Impact

- Dependencies: add `@isomorphic-git/lightning-fs` (and its type definitions if
  the package does not ship them).
- New code: a shared filesystem interface plus platform-specific
  implementations selected through React Native/Metro platform extensions.
- Refactor: `src/git/repository.ts` stops importing `expo-file-system` directly
  and uses the platform module for checkout detection, cloning, pulling, listing,
  moving files, committing, and pushing.
- UI/service: `src/components/HomeScreen.tsx` and `src/tasks/taskService.ts`
  remove the web rejection branches so loading and toggles run on web.
- Configuration: `app.config.js` forwards an optional CORS proxy from the
  environment into Expo `extra`; `src/git/config.ts` exposes it and validates it
  for web use.
- Docs: `README.md` explains web debugging, IndexedDB persistence, and the CORS
  proxy setup.
- Security: the existing build-time GitHub token remains embedded in the bundle.
  On web it is sent to the configured proxy, so the documentation must recommend
  a trusted local or self-hosted proxy and warn against public proxies with a
  token that has push access.
