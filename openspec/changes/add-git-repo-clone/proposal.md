# Proposal

## Why

The todo list will be stored as a git repository where one file represents one
task. Before any task editing or syncing can be built, the app needs a local
checkout: it must clone the private repository onto the phone and make the
checked-out files readable on-device.

## What Changes

- Add `isomorphic-git` and a direct `expo-file-system` dependency.
- Add an `expo-file-system`-backed promise-style filesystem adapter for
  `isomorphic-git`, since the package has no React Native filesystem support.
- Clone `https://github.com/Capster/todo.git` (branch `master`) over HTTPS with
  the provided GitHub token, then pull on subsequent presses when the checkout
  already exists.
- Store the checkout persistently in the app's document directory so it survives
  app restarts.
- Add a "Clone" button to the home screen that runs the clone/pull, shows
  progress and errors, and renders the repository contents as a plain indented
  text tree.
- Inject the token at build time from the existing gitignored root `token` file
  through Expo config `extra`; do not commit or hardcode it in tracked source.
- Limit the feature to Android/iOS. The web build shows a short unsupported
  message instead of attempting the filesystem clone.
- **Out of scope**: editing, creating, or deleting tasks; committing; pushing;
  conflict handling; multiple repositories or branches; auth UI.

## Capabilities

### New Capabilities

- `git-sync`: Cloning and pulling the todo git repository to persistent local
  storage and exposing its tracked files for display.

### Modified Capabilities

- None. The existing `app-shell` requirements remain unchanged; this adds a new
  feature area.

## Impact

- Dependencies: `isomorphic-git`, direct `expo-file-system`, and
  `expo-constants` (to read the injected token).
- Expo config: add a dynamic config that reads the root `token` file and exposes
  it as build-time `extra`; add `token` to `.gitignore`.
- New code: git filesystem adapter, git clone/pull service, repository tree
  builder, and configuration constants under `src/git/`.
- UI: `src/components/HomeScreen.tsx` gains the clone control, status, error,
  and tree output.
- Platform behavior: mobile clone only; web remains usable but reports that git
  checkout is unsupported.
- Security: the token still ends up in the JavaScript bundle at build time and
  has write/admin access to the repository. This is accepted for this local
  prototype; the token must be rotated if the build is ever distributed.
