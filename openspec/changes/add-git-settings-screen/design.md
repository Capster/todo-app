# Design

## Context

See `proposal.md` - Why, `specs/git-settings/spec.md`, and the modified
`git-sync`, `app-shell`, and `todo-list` deltas for the behavior contract.

The current app has a single `HomeScreen` registered from `index.ts` through
`App.tsx`, fixed repository constants in `src/git/config.ts`, a build-time token
read by `app.config.js`, and a checkout whose location is fixed at
`todo-repo` (native document directory or IndexedDB `/todo-repo`). Task
mutations already run through a background queue; clone and pull are foreground
operations. The project has no test framework, so verification is type-checking
plus manual web and device smoke tests.

## Goals / Non-Goals

**Goals:**

- Add route-based navigation and a settings screen without moving existing
  feature code out of `src/`.
- Make repository URL, branch, token, and optional author identity runtime
  settings.
- Keep the token out of the JavaScript bundle, logs, and error text.
- Preserve the existing optimistic task mutation behavior and foreground clone
  and pull behavior while making them read the active settings.
- Preserve a working checkout when a replacement clone fails.

**Non-Goals:**

- Multiple saved profiles, repository discovery, OAuth, SSH remotes, or GitHub
  device login.
- Encrypting web storage or hiding the token from browser devtools; web storage
  is explicitly local storage.
- Clearing or resetting saved settings from the UI.
- Changing the CORS proxy configuration flow or allowing it to be edited on the
  settings screen.
- Migrating pending commits from a checkout made for a different repository or
  branch.
- Adding a test framework.

## Decisions

### Use Expo Router with routes under `src/app`

Install `expo-router`, `react-native-safe-area-context`,
`react-native-screens`, `expo-linking`, `expo-constants`, and
`expo-status-bar` through `npx expo install`, which selects SDK 58 compatible
versions. Keep the existing `src/` organization by using `src/app/` rather than
a root-level `app/` directory.

- `src/app/_layout.tsx` renders the shared `Stack` with headers hidden and the
  status bar. Screens own their own headers.
- `src/app/index.tsx` is the home route. It resolves the settings gate and then
  renders the existing `HomeScreen`.
- `src/app/settings.tsx` renders the new settings screen.
- `package.json` keeps `main` as `index.ts`. `index.ts` keeps the global
  `Buffer` polyfill required by `isomorphic-git` and then imports
  `expo-router/entry` last. `App.tsx` and the direct `registerRootComponent`
  call are removed.
- Add `scheme: "todo-app"`, `plugins: ["expo-router"]`, and typed routes to the
  Expo config. Add `.expo/types/**/*.ts` and `expo-env.d.ts` to the TypeScript
  include list.

Alternatives rejected: keeping the single-screen `App.tsx` and faking a second
screen with local state (no URL or back behavior on web), and a root `app/`
directory that splits screen code away from the established `src/` structure.

### Settings model and validation

Define `GitSettings` as repository URL, branch, token, author name, and author
email. Validation is a pure function under `src/settings/`:

- repository URL: trimmed and parseable by `URL`, with an `http:` or `https:`
  protocol.
- branch: trimmed, non-empty, no whitespace or control characters, no leading
  `-`, no `..`, and not the literal `HEAD`.
- token: trimmed and non-empty.
- author fields: optional; trimmed.

Validation returns per-field errors and a normalized settings object. Empty
optional author fields stay empty in storage so the fallback remains visible in
the behavior rather than being baked into the saved value.

### Credential and configuration storage

Use one module with platform-specific implementations, following the existing
`src/git/fileSystem/index.ts` / `index.web.ts` pattern:

- `src/settings/storage.ts` (native) uses `expo-secure-store`.
- `src/settings/storage.web.ts` (web) uses `localStorage` guarded by
  `typeof window`.

Store two values under stable keys: the non-secret settings JSON and the token.
The token is stored under its own key so it is never part of a settings object
that could be logged or copied accidentally. Native storage uses SecureStore for both keys; the settings value
is small enough for SecureStore limits. Web storage is not encrypted and is
documented as such.

Alternatives rejected: an AsyncStorage or SQLite dependency for non-secret
values (extra dependency for a tiny payload), and embedding the token in the
same JSON as the rest of the settings (harder to keep out of logs and error
paths).

### Settings service and route gate

Add a module-level settings service with an in-memory snapshot,
`subscribe`/`getSnapshot` for `useSyncExternalStore`, and a cached load promise.
It exposes the normalized settings, the loaded/ready status, save operations,
and a `getActiveConnection()` function that throws a readable error when the
settings are missing or invalid. All git operations call
`getActiveConnection()` asynchronously.

Checkout association is derived from the checkout itself rather than stored
separately:

- after clone, `isomorphic-git` records `remote.origin.url`;
- the current branch is read from the checkout;
- a checkout matches when its remote URL and branch match the saved settings,
  after trimming trailing slashes and a trailing `.git` from the URL.

This means an existing checkout created before this change is adopted when the
user re-enters the same repository URL and branch, and no separate association
file can drift from the actual checkout. A different URL or branch is a
mismatch and requires Clone.

The home route uses a small gate hook. While settings or checkout status is
loading, it renders the existing loading presentation. It redirects to
`/settings` when required settings are missing or invalid, or when a checkout
exists for a different configuration. If no checkout exists and settings are
valid, it renders `HomeScreen`; the normal load path clones on first use.

Settings actions:

- Save validates, writes storage, and does not touch the network. It navigates
  home when there is no checkout or the checkout matches; otherwise it stays on
  settings and shows a "Clone required" notice.
- Clone validates, saves, runs the replacement clone, and navigates home only
  after success. The previous checkout remains untouched until the new clone
  has completed.

### Git layer reads active settings

Refactor `src/git/config.ts` to remove `REPOSITORY_URL`, `BRANCH`, and
`getGitToken`. Keep the local checkout directory, CORS proxy helpers, and a
default author constant. Build a `GitConnection` from saved settings:

- repository URL and branch from settings;
- token from secure storage;
- author name/email from settings, each falling back independently to the
  default author when blank.

`src/git/repository.ts` awaits `getActiveConnection()` in each public operation
and uses the connection's URL, branch, token, and author for clone, pull,
push, `listFiles`, `log`, `resolveRef`, commits, and token redaction. This keeps
the task service and mutation queue unchanged except that their repository calls
now use runtime settings.

Add a `cloneConfiguredRepository(connection)` operation that:

1. requires the proxy on web before any request;
2. clones into the existing temporary directory;
3. only after a successful clone removes the previous checkout and renames the
   temporary directory into place;
4. removes the temporary directory on failure so the previous checkout is still
   usable.

Reuse the existing module-level in-flight guard so overlapping Clone actions
share one operation. Existing `syncRepository` in-flight behavior and the task
service background queue remain as they are.

Alternatives rejected: mutating the existing checkout in place before the clone
finishes (can destroy a working checkout on failure), and passing settings
through every task-service call (noisy and easy to forget).

### Settings UI composition

- `src/components/SettingsScreen.tsx` owns layout and presentation: title, form
  fields, Save and Clone actions, progress, and banner/error display.
- `src/components/SettingsField.tsx` is an atomic label, input, and inline error
  row.
- `src/hooks/useSettingsForm.ts` owns form state, loading saved values,
  validation errors, busy flags, the Clone notice, and navigation after save or
  clone.
- `src/components/TaskListHeader.tsx` gains an `onOpenSettings` callback and a
  top-right pressable cog glyph with an accessible "Settings" label.
  `HomeScreen` accepts and forwards that callback; `src/app/index.tsx` supplies
  it with `router.push("/settings")`.

The form loads saved values once when the service becomes ready. The token field
uses a masked text input. Save and Clone are disabled while either action is
running. Clone errors are already token-redacted by the repository layer; the
settings hook keeps them in a banner without echoing input values.

### Remove the build-time token

`app.config.js` stops reading `./token` and stops exposing `extra.gitToken`. It
keeps merging `app.json` and the validated `EXPO_PUBLIC_GIT_CORS_PROXY` value.
The root `token` file may remain on developer machines but is unused and stays
gitignored. README requirements and setup lose the token-file step and gain the
settings/onboarding flow, web storage caveat, and configurable repository and
branch.

## Risks / Trade-offs

- **Web token is readable by any script on the page** → Web storage can only be
  local storage; document that the token is not encrypted, use a narrowly scoped
  token, and keep the existing warning about the CORS proxy seeing it.
- **SecureStore has platform size limits** → Store only the small settings
  object and the token separately; do not store repository contents there.
- **Clone replaces a checkout and can discard local commits** → Clone is an
  explicit action, clones to a temporary directory first, and leaves the old
  checkout intact on failure.
- **Save does not validate the token against the remote** → A bad token is
  reported by the existing error banner on the first clone or pull, matching the
  chosen "missing/invalid config only" onboarding rule.
- **Route gate adds an asynchronous startup step** → Use the existing loading
  presentation while settings and checkout status resolve; cache the settings
  load so the home and settings hooks share one read.
- **Legacy checkouts have no explicit association record** → Infer association
  from the git remote and current branch, so re-entering the same settings
  adopts the checkout instead of forcing a destructive Clone.
- **Changing only the branch leaves an old single-branch checkout** → Compare
  both remote URL and branch; a branch change is a mismatch and requires Clone.
- **Expo Router entry changes can break the Buffer polyfill order** →
  Keep the polyfill in `index.ts` and import `expo-router/entry` last, then
  verify web and native startup manually.

## Migration Plan

1. Install Expo Router and secure storage dependencies, update the entry point
   and Expo config, and add the `src/app` routes.
2. On the first launch after upgrade, no settings exist, so the settings screen
   opens instead of the task list.
3. The user enters the repository URL, branch, and token. If the old checkout's
   remote URL and branch match, it is adopted and the list resumes with its
   pending commits. Otherwise Clone replaces the old checkout.
4. Rollback by restoring the previous entry point and config and reinstating the
   build-time token flow; the on-device checkout layout is unchanged.

## Open Questions

None.
