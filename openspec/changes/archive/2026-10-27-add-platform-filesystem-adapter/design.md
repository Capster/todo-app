# Design

## Context

See `proposal.md` for motivation and the delta specs for the behavior contract. The app is an Expo SDK 58 / React Native 0.88 TypeScript app. `src/git/repository.ts` currently imports `expo-file-system` directly for checkout detection, temp-directory cleanup, directory creation, clone-rename, and task-file copies, and passes the Expo promise adapter as `isomorphic-git`'s `fs`. Every public repository operation and the task service short-circuit on `Platform.OS === 'web'`, and `HomeScreen` renders an unsupported message.

Constraints established while planning:

- `isomorphic-git`'s `PromiseFsClient` requires only `readFile`, `writeFile`, `unlink`, `readdir`, `mkdir`, `rmdir`, `stat`, and `lstat`; `readlink`, `symlink`, and `chmod` are optional.
- `@isomorphic-git/lightning-fs` 4.10.3 ships no type declarations and has no `@types` package, so the project needs a local ambient declaration for the subset used.
- GitHub does not send CORS headers. `isomorphic-git` requires a `corsProxy` in browsers; otherwise clone, pull, and push cannot reach `github.com`.
- React Native Web 0.21 implements `RefreshControl` as a plain `View`, so pull-to-refresh does nothing in a browser.
- The existing token is embedded at build time via `app.config.js` and `expo-constants`. On web it is visible in the bundle and would be forwarded to the CORS proxy.
- There is no test framework; `npm run typecheck` and manual web/device runs are the verification tools.

## Goals / Non-Goals

**Goals:**

- Select the git filesystem implementation by platform without changing mobile behavior.
- Keep browser-only code out of native bundles.
- Make the existing todo list, refresh, and completion flows work in the web build with a checkout that survives page reloads.
- Make the CORS proxy requirement explicit and fail before any network request when it is missing.

**Non-Goals:**

- Changing the mobile storage location or migrating existing mobile checkouts.
- Supporting multiple repositories, branches, tabs, or users.
- Adding offline queues, conflict resolution, or background sync.
- Using OPFS, service workers, or a server-side git backend.
- Adding a test framework or a UI component library.

## Decisions

### Platform selection through Metro extension files

Create a small module boundary under `src/git/fileSystem/`:

- `types.ts` defines the shared contract:
  - `gitFs: FsClient` for `isomorphic-git`
  - `repositoryDirectory: string` and `temporaryDirectory: string` (absolute POSIX paths)
  - `exists(path)`, `readFile(path)`, `writeFile(path, data)`, `unlink(path)`,
    `mkdirp(path)`, `removeDirectory(path)`, and `rename(from, to)`
- `expo.ts` contains the current Expo adapter plus the new path helpers.
- `index.ts` re-exports the Expo implementation for Android and iOS.
- `index.web.ts` re-exports the lightning-fs implementation for web.

`repository.ts` imports `./fileSystem` and no longer imports `expo-file-system` or knows about `file://` URIs. Metro resolves `index.web.ts` for web and `index.ts` for native, so `lightning-fs` and any IndexedDB access never enter the native bundle.

Alternative rejected: one module with `Platform.OS` and a lazy dynamic import. It would spread async initialization through synchronous helpers such as `exists` and `checkoutExists`, and a static browser import risks touching `IndexedDB` during native startup.

### Shared adapter contract and path ownership

Move the checkout-path knowledge into the adapter. The native adapter keeps the current layout:

- repository: `<document>/todo-repo`
- temporary: `<document>/todo-repo.tmp`

The web adapter uses the lightning-fs root:

- repository: `/todo-repo`
- temporary: `/todo-repo.tmp`

`repository.ts` constructs child paths by joining the adapter's repository directory with task paths. It continues to use POSIX string joining, not `file://` URIs. `getDocumentDirectory` and `toFileUri` stop being exported to the repository layer; they remain private to the Expo adapter (or move into it).

Path helpers have specific semantics:

- `exists` returns false for missing paths and never throws for normal `ENOENT`.
- `mkdirp` creates missing parents and tolerates an existing directory.
- `removeDirectory` is best-effort recursive deletion.
- `rename` moves a directory, used only from the successful clone temp directory to the repository directory.
- `readFile` returns raw bytes (`Uint8Array` on web, `Buffer` on native) and `writeFile` accepts them, preserving task file contents during moves.

### Expo adapter extraction

Keep the existing `expo-file-system` adapter implementations and error mapping. Add the path helpers by wrapping the current `Directory`/`File` operations:

- `exists` uses `Directory`/`File` probing.
- `mkdirp` uses `Directory.create({ intermediates: true, idempotent: true })`.
- `removeDirectory` uses the existing best-effort `Directory.delete()`.
- `rename` uses `Directory.rename()` and no longer leaks into `repository.ts`.
- `readFile`/`writeFile`/`unlink` reuse the existing promise wrappers.

This is an extraction, not a behavior change: the same document root, temp clone, rename-on-success, and task byte copy remain.

### Lightning-fs web adapter

Instantiate a single named filesystem lazily on first use:

```ts
new FS('todo-app-git')
```

The name is stable so IndexedDB storage survives reloads. Construction is deferred until a helper is called, avoiding `IndexedDB` access at module import or server-side bundling time.

- Pass `fs.promises` as `gitFs`, adding wrappers for any required method that lightning-fs does not provide directly.
- Implement `exists` with `stat`/`lstat` in `try/catch` for `ENOENT`.
- Implement `mkdirp` by creating each missing path segment and tolerating `EEXIST`; do not depend on Node's `recursive` option.
- Implement `removeDirectory` with a recursive walk using `readdir`, `unlink`, and `rmdir` if lightning-fs' `rmdir` does not support `recursive`.
- Implement `rename` over lightning-fs' promise rename; verify directory rename during implementation and fall back to a recursive copy/delete only if necessary.
- Throw `ENOSYS` for symlink operations, matching the Expo adapter; the repository has no symlinks.

Add `src/types/lightning-fs.d.ts` with an ambient module declaration for the constructor and the promise methods used. Keep the declaration narrow so the test is typechecked against the same narrow surface.

Alternative rejected: assuming lightning-fs implements every Node `fs` option and casting to `any`. The adapter boundary is small, so explicit wrappers keep type checking meaningful.

### Web CORS proxy configuration

Add `EXPO_PUBLIC_GIT_CORS_PROXY` as the single configuration input:

- `app.config.js` reads and trims `process.env.EXPO_PUBLIC_GIT_CORS_PROXY`, validates it as an `http(s)` URL when present, and forwards it as `expo.extra.gitCorsProxy`. It is optional at config time so native users and non-git web pages still start.
- `src/git/config.ts` exposes `getGitCorsProxy(): string | undefined` and a web-only assertion that throws a readable error naming the environment variable when it is missing.
- `repository.ts` builds network options as `{ http, corsProxy }` only for web clone, pull, and push. Native calls omit `corsProxy` entirely.
- The check runs before `getGitToken()` is used for a request, so a missing proxy cannot send the token anywhere.

No public proxy is used by default. The free `cors.isomorphic-git.org` proxy is documented only as a last-resort debugging option, with a warning that it sees the token; the README recommends running a trusted local or self-hosted proxy.

Alternative rejected: defaulting to a public proxy. It would make web debugging work immediately but silently expose a push-capable token.

### Web UI and refresh behavior

- Remove `WEB_UNSUPPORTED_MESSAGE`, the web branch in `HomeScreen`, and the web rejections in `repository.ts` and `taskService.ts`.
- The screen always loads on mount on every platform.
- Mobile keeps `RefreshControl` pull-to-refresh.
- Because `RefreshControl` is inert on react-native-web, render a visible "Refresh" button in the web build that calls the same `refresh()` operation. Keep it disabled while loading or refreshing and reuse the existing busy/error state.
- Keep the existing error banner, empty state, and per-task pending behavior unchanged.

Alternative rejected: relying on the browser's native page reload. A reload restarts the app and does not push a pending local commit before pulling, so it would not exercise the refresh path.

### Failure and security behavior

- Keep token redaction around every repository operation, including proxy errors.
- Missing proxy, missing IndexedDB support, storage quota errors, and lightning-fs failures surface as readable errors without crashing.
- A clone still goes to the temp directory and is renamed only after success, so a failed web clone leaves no `.git/HEAD` that a later attempt treats as an existing checkout.
- `syncInFlight` remains a per-tab single-flight guard. Multiple tabs sharing one IndexedDB database are out of scope; the README notes that only one tab should run git operations at a time.

## Risks / Trade-offs

- **The CORS proxy sees the GitHub token** → Use a trusted local/self-hosted proxy, document the risk, never default to a public proxy, and keep the token redaction. A push-capable token in a browser bundle remains a prototype-level risk.
- **IndexedDB can be evicted or unavailable (private mode, storage pressure)** → Treat storage errors as readable clone failures; a later attempt reclones. Document that clearing site data removes the checkout.
- **lightning-fs is a partial Node `fs` implementation** → Keep the adapter surface small, wrap missing behavior, add only a narrow ambient type declaration, and verify clone/pull/move/commit/push against a real browser during implementation.
- **Directory rename support is uncertain** → Verify early; if unsupported, fall back to recursive copy/delete while preserving the no-partial-checkout rule.
- **Multiple browser tabs can race on the same IndexedDB database** → Document single-tab use; per-tab single-flight is unchanged.
- **Web refresh has no pull gesture** → Add an explicit Refresh button on web rather than faking a gesture.
- **A failed pull may leave partial browser state** → Keep the existing fast-forward pull behavior and report the error; conflict resolution remains out of scope.
- **Web bundles grow from lightning-fs** → It is loaded only in the web bundle due to the platform extension, so native startup and bundle size are unaffected.

## Migration Plan

1. Install `@isomorphic-git/lightning-fs`.
2. Extract the Expo adapter into `src/git/fileSystem/expo.ts`, add the shared interface, and make `index.ts` re-export Expo behavior unchanged.
3. Add `index.web.ts`, the lightning-fs implementation, and the ambient type declaration.
4. Refactor `repository.ts` to use the platform module for paths and filesystem operations, and remove web rejections.
5. Add proxy config plumbing and web-only network validation.
6. Remove the web guard from `taskService.ts` and `HomeScreen.tsx`, and add the web Refresh button.
7. Update `README.md` with web startup, the CORS proxy setup, IndexedDB persistence, and the single-tab warning.
8. Verify with `npm run typecheck`, a web run with no proxy configured (readable configuration error), a web run with a local proxy (clone, reload, refresh, toggle), and an Android run (unchanged clone/pull/toggle).
9. Rollback: remove the dependency, delete `index.web.ts` and the ambient declaration, restore direct Expo imports in `repository.ts`, and restore the web guards. The mobile layout and index are untouched, so no data migration is needed; browser checkouts are simply orphaned in IndexedDB.
