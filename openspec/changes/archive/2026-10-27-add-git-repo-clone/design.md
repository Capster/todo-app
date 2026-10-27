# Design

## Context

See `proposal.md` for motivation and `specs/git-sync/spec.md` for the behavior
contract. The current app is an Expo SDK 58 / React Native 0.88 starter with a
single `HomeScreen` and TypeScript in strict mode. There is no test framework.

Facts established while planning:

- The target repository is private: `Capster/todo`, default branch `master`.
- The token in the gitignored root `token` file authenticates successfully over
  HTTPS and currently has admin/push permission.
- `isomorphic-git` (latest 1.44.5) supports only HTTP(S) with Basic auth. It
  cannot use SSH keys or `git@github.com` URLs.
- `expo-file-system` is present only as a transitive dependency of `expo`; it is
  not a direct dependency. Its new API provides `File`, `Directory`, and
  `Paths`, with async `bytes()`/`text()`/`write()` and sync
  `exists`/`create()`/`delete()`/`list()`.
- `isomorphic-git` uses a global `Buffer`; React Native does not provide one.
- The web build must keep working but cannot use this filesystem feature.

## Goals / Non-Goals

**Goals:**

- Clone and update a private GitHub repository from Expo Go on Android/iOS.
- Persist the checkout across app restarts.
- Keep the token out of tracked source while still embedding it at build time.
- Render the tracked files as a plain text tree with a minimal UI.
- Keep the git layer isolated so later task editing, commits, and pushes can
  reuse it.

**Non-Goals:**

- Task creation/editing/deletion, commits, pushes, conflict resolution, branch
  selection, multiple repositories, auth UI.
- Background sync or periodic refresh.
- Supporting git checkout on web.
- Symlink support in the filesystem adapter.
- Full git fidelity on mobile (file modes, ownership, symlinks).

## Decisions

### Git client and transport

Use `isomorphic-git` with `isomorphic-git/http/web`, which is fetch-based and
works in React Native without CORS restrictions. Authenticate with
`onAuth: () => ({ username: 'x-access-token', password: token })`; this exact
form was verified against the repository.

Alternatives rejected: SSH/native git (unavailable in Expo Go), a GitHub REST
archive download (not a git checkout, cannot pull), and a third-party git
service (out of scope).

Add a `buffer` polyfill in `index.ts` before `registerRootComponent`:

```ts
import { Buffer } from 'buffer';
(globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
```

Without it, clone fails on Node-style `Buffer` usage inside `isomorphic-git`.

### Filesystem adapter

Create a promise-style adapter under `src/git/expoFileSystem.ts` and pass it as
`fs` to every git call. It implements:

- `readFile` → `File.text()` when an encoding is requested, otherwise
  `File.bytes()`
- `writeFile` → create the file and parent directory if needed, then
  `File.write()`
- `unlink`, `readdir`, `mkdir`, `rmdir`, `stat`, `lstat`, `chmod`, `readlink`,
  `symlink`

Implementation notes:

- `isomorphic-git` receives plain absolute POSIX paths. Derive the document
  directory by stripping `file://` from `Paths.document.uri`, and prefix
  `file://` only inside the adapter. This avoids POSIX path joining mangling a
  `file:///...` string.
- `stat`/`lstat` return a Node-like stats object built from
  `File.info()`/`Directory.info()` with `isFile()`, `isDirectory()`,
  `isSymbolicLink()`, `size`, `mode`, `mtimeMs`, and `ctimeMs`. Directories use
  mode `0o040000`; files use `0o100644` because Expo does not expose Unix modes.
- Missing paths throw errors with `code: 'ENOENT'`; unsupported symlinks throw
  `code: 'ENOSYS'`. The repository contains no symlinks.
- Resolve a path's type by probing `Directory` then `File` in `try/catch`,
  because constructing the wrong class for an existing path throws.
- Do not access `Paths.document` at module import time, so importing the module
  on web does not crash.

Alternatives rejected: the legacy `expo-file-system` API (deprecated and slower)
and the third-party `expo-fs` wrapper (built for the legacy API, unmaintained).

### Storage layout and clone/update flow

- Checkout lives at `<document>/todo-repo`.
- Clone into `<document>/todo-repo.tmp`, then rename to `todo-repo` only after
  success. On failure, delete the temp directory. This prevents a half-written
  `.git` from being mistaken for a valid checkout later.
- Treat a checkout as existing only when `todo-repo/.git/HEAD` exists. A
  directory without it is deleted and re-cloned.
- If the checkout exists, `git.pull` with `ref: 'master'`, `singleBranch: true`,
  and a fixed author identity. The app never edits files yet, so this is a
  fast-forward update. Do not use `depth: 1`; it complicates later pulls and the
  repository is small.
- After clone/pull, list tracked files with
  `git.listFiles({ fs, dir, ref: 'master' })`. This excludes `.git` and
  untracked files by construction.
- Build the tree with a pure `buildTree(paths: string[]): string` function:
  sort paths, group by directory, indent two spaces per level, and append `/`
  to directory labels.

### Token injection

Keep the existing root `token` file as the single source of truth and add it to
`.gitignore`.

- Add `app.config.js` that requires `app.json`, reads and trims `./token`, and
  exposes it as `expo.extra.gitToken`. Throw a clear config-time error if the
  file is missing or empty so `expo start` fails fast.
- Read it at runtime through `expo-constants`:
  `Constants.expoConfig?.extra?.gitToken`.
- Keep the repository URL and branch as constants in `src/git/config.ts`.

Alternatives rejected: hardcoding the token in tracked source (commits a
secret), and a gitignored TS module (extra local setup and easy to forget).

The token is still embedded in the JavaScript bundle. This is accepted only
because the build is a local prototype; rotate the token if it is ever
distributed, and prefer a read-only token for clone-only builds.

### Service and UI

`src/git/repository.ts` exposes one operation,
`cloneOrUpdateRepository(onProgress?): Promise<{ files: string[] }>`:

- Guard with a module-level in-flight promise so overlapping presses share one
  operation.
- If `Platform.OS === 'web'`, reject with an unsupported-feature error before
  touching the filesystem.
- Sanitize error messages before returning them so the token can never appear in
  UI text.

`HomeScreen` gains:

- A "Clone" button, disabled while the operation runs.
- An in-progress label, an error line, and the text tree in a `ScrollView` with
  a monospace font.
- A web-only message stating that repository checkout is unsupported.

No navigation or state library is introduced; local component state is enough.

## Risks / Trade-offs

- **Token has admin/push access and is embedded in the bundle** → Use it only
  for this local prototype; rotate it before any distribution and prefer a
  read-only PAT. Never log or surface it.
- **`isomorphic-git` may hit React Native runtime gaps beyond `Buffer`** →
  Polyfill `Buffer` first, test an actual clone on a device early, and fall back
  to `@craftzdog/react-native-buffer` if Metro/runtime issues appear.
- **Mobile memory limits during clone** → The repository is currently tiny; use
  a full clone (no partial clone) and avoid parallel operations. Revisit if the
  repo grows.
- **Filesystem adapter differs from Node `fs` (no modes, no symlinks)** → Return
  fixed modes, throw `ENOSYS` for symlinks, and keep the adapter isolated so it
  can be replaced.
- **Failed pull could leave partial working-tree state** → Fetch/pull only
  fast-forwards because the app does not modify files; report the error and keep
  the existing directory for the next attempt.
- **Dynamic `app.config.js` requires the token file for every build/start** →
  Fail with a clear message in config; document the requirement. No production
  build is in scope.
- **Web bundle imports the git module** → Lazy-path handling and an explicit
  platform guard prevent web-time filesystem access.

## Migration Plan

1. Install dependencies and add the Buffer polyfill.
2. Add config injection and ignore the token file.
3. Add the adapter and repository service.
4. Wire the UI.
5. Verify on web (unsupported message) and on a device (clone, restart, pull,
   tree).
6. Rollback: remove the UI entry point and new `src/git/` files; no data
   migration is needed, and deleting `<document>/todo-repo` removes the
   checkout.
