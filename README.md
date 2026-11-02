# Todo App

A cross-platform todo application built with Expo and React Native. The same
TypeScript source runs in a web browser and on a physical Android device through
Expo Go.

## Requirements

- Node.js **24.19.0** (the version pinned in `.nvmrc`), or any version matching
  the `engines.node` range in `package.json`:
  `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`. This range is required by
  Expo SDK 58.
- npm (bundled with Node.js).
- For Android device preview: the latest Expo Go app installed on an Android
  device, updated to the version compatible with Expo SDK 58.
- A git repository URL, the branch to use, and an access token with read and
  write (push) access to that repository. You enter these in the app's settings
  screen; no build-time token file is needed.

## Setup

Activate the pinned Node.js version and install dependencies:

```bash
nvm use
npm install
```

## Running the app

### Web browser

```bash
npm run web
```

This starts the development server and opens the app in your browser.

### Android

```bash
npm run android
```

This starts the development server targeting an Android emulator or a
USB-connected device with adb.

### Expo Go on a physical device

```bash
npx expo start
```

Then scan the QR code shown in the terminal with Expo Go on your Android device.
For LAN mode, the computer and the phone must be on the same network. If local
network discovery is unavailable, start the server in tunnel mode instead:

```bash
npx expo start --tunnel
```

The tunnel fallback requires installing `@expo/ngrok` on first use.

### Type checking

```bash
npm run typecheck
```

## Git settings

The app reads the repository URL, branch, and token from its own settings screen
instead of build-time constants. On first launch, or whenever the saved values
are missing or invalid, the app opens the settings screen instead of the task
list and does not clone or pull. The settings route is also reachable at any time
from the cog icon in the top-right corner of the home screen; the icon stays
available while the list is loading, refreshing, or syncing.

The settings screen contains repository URL, branch, token, author name, and
author email fields. All five start empty on a first launch. Author name and
email are optional; when either is blank, commits use the default `Todo App` name
or `todo-app@example.com` email for that field.

- **Save** validates the values and persists them without contacting the
  repository. It returns to the list when no checkout exists or the existing
  checkout matches the saved repository and branch. If the checkout was created
  for another repository or branch, the screen stays open and says that Clone is
  required.
- **Clone** validates and saves first, then clones the configured repository and
  branch in the foreground with a visible in-progress state and replaces any
  existing checkout. The clone is written to a temporary directory and only
  moved into place after it succeeds, so a failed clone leaves the previous
  checkout usable and leaves no partial checkout. Overlapping clone requests share
  one operation. On success the app opens the task list; on failure the settings
  screen shows a readable error that never contains the token.

On Android and iOS the token is stored with the platform secure credential store
(`expo-secure-store`). On web it is stored in browser `localStorage`, which is
not encrypted and is visible to scripts on the page; it persists across reloads
and is removed when you clear site data. The non-secret values are stored
separately from the token. The token is never embedded in the bundle and is
redacted from logs and user-facing errors.

## Todo list

The home screen shows one checklist that mixes open and completed tasks. Files
tracked directly in the repository root are open tasks, files tracked directly
inside `archived/` are completed tasks, and each display name is the file name
without its final extension. The list is ordered newest first using each task's
creation date. Task file contents are not read to display, order, or refresh the
list; they are read only when you open a task for editing.

Opening the screen shows the tasks from the existing matching local checkout
immediately, then pulls the latest configured branch behind that view. The list
shows its refreshing state and stays read-only until the pull settles, so a
background pull cannot overwrite an optimistic change. On a first launch with no
checkout, a loading state appears while the repository is cloned. On mobile, pull
down on the list to refresh; in a browser, use the visible **Refresh** button. A
refresh first pushes any pending local commit, then pulls the latest configured
branch, then re-renders the list.

Checking a task updates the list immediately, then moves its file from the root
into `archived/`, commits the move with the configured author identity, and
pushes the configured branch in the background. Unchecking a task moves it back
to the root and repeats the background commit and push. The list stays interactive while this
runs, and further changes are queued instead of rejected. If the push fails
after the commit succeeds, the change stays committed locally, the app shows a
readable error, and the next refresh retries the push before pulling. If the
move or commit fails, the task is restored to its original location and state.

### Creating tasks

Tap the round plus button at the bottom-right of the list to open the task
creation sheet. The sheet covers the bottom half of the screen and contains a
task-name field that wraps long names without accepting newlines, a multiline
description field, and a Create button. The close control, a tap on the backdrop,
or the Android back action dismisses the sheet without creating anything.

The entered name is trimmed before use. Empty names, names containing `/` or
`\`, and the names `.` and `..` are rejected with an inline error. When the
description contains non-whitespace text, the app creates a root file named
`<name>.md` containing the description exactly as entered. When the description
is empty or whitespace-only, it creates an empty plain file named `<name>`.
A trailing `.md` in the entered name is not duplicated. If the resulting task
name already exists as an open or completed task, a numeric suffix (` 2`, ` 3`,
...) is added instead of overwriting anything.

The sheet closes as soon as Create is accepted and the new task appears at the
top of the list immediately. The file is created, committed with the configured
author identity, and pushed in the background. If the push fails, the task remains
committed locally and the error banner explains that it was saved but not
pushed. The next refresh pushes the pending commit before pulling, so the task
reaches the remote without being duplicated.

### Editing and deleting tasks

Hold a task row (press and hold for about half a second) to open the edit sheet.
A normal tap still toggles completion. The edit sheet uses the same bottom-half
layout as creation and is prefilled with the task's display name and its exact
file content. The close control, a tap on the backdrop, or the Android back
action dismisses the sheet and discards any changes.

Save trims the name and applies the same validation, `.md`/plain naming, and
duplicate-name suffixing rules as creation, but ignores the task being edited
when checking for duplicates. Changing the description rewrites the file content.
A non-whitespace description produces a `<name>.md` file, and an empty or
whitespace-only description produces a plain `<name>` file. An open task stays in
the repository root and a completed task stays in `archived/`. Saving without
changing the name or description closes the sheet without creating a commit.

Delete permanently removes the selected open or completed task file. There is no
confirmation or undo. If you delete a task while offline, the change stays local
and is pushed on the next refresh.

The sheet closes as soon as Save or Delete is accepted, and the list shows the
change immediately while the file work and push run in the background. Save and
delete commit with the configured author identity and push the configured
branch. If the push
fails, the commit stays local and the error banner explains that it was saved or
deleted but not pushed. The next refresh pushes the pending commit before
pulling. If reading, writing, renaming, or committing fails, the original file
name, location, content, and list row are restored, no staged entry or commit
remains, and the error appears in the banner. Invalid names are still reported
inline while the sheet is open. Renaming a task starts its file history at the
rename commit, so the renamed task can move in the newest-first list.

The list works on Android, iOS, and web. On mobile the checkout is stored in the
app's document directory; in a browser it is stored in IndexedDB, so the
repository is pulled rather than cloned after a restart or page reload. Clearing
site data removes the browser checkout, and the next load clones again. Run git
operations in one browser tab at a time; multiple tabs sharing the same
IndexedDB database are not coordinated.

### Web CORS proxy

GitHub does not send CORS headers, so browser clone, pull, and push requests
must go through a CORS proxy. There is no default proxy. Set
`EXPO_PUBLIC_GIT_CORS_PROXY` to the proxy URL before starting Expo:

```bash
EXPO_PUBLIC_GIT_CORS_PROXY=http://localhost:9999 npm run web -- --clear
```

The config value is inlined into the web bundle at build time. After adding the
variable or changing its value, clear Metro's cache with `--clear`; otherwise the
dev server can keep serving a previously bundled config and still report the
missing-proxy error. Stop any running dev server before restarting it with the
variable and `--clear`.

The value must be an `http` or `https` URL. When it is missing, web git
operations fail with a configuration error and no request is sent. Any proxy
you use sees the GitHub token, so run a trusted local or self-hosted proxy and
never point this at a public proxy. The free `cors.isomorphic-git.org` proxy is
a last-resort debugging option only.

There is a minimal example proxy in `scripts/git-cors-proxy.js`. It listens on
`127.0.0.1:9999`, only forwards to `https://github.com`, and adds the CORS
headers the browser needs. Start it in one terminal and the web app in another:

```bash
npm run proxy
```

```bash
EXPO_PUBLIC_GIT_CORS_PROXY=http://localhost:9999 npm run web -- --clear
```

You can override the bind address and port with `GIT_CORS_PROXY_HOST` and
`GIT_CORS_PROXY_PORT`. Run a trusted local or self-hosted proxy and never point
the app at a public proxy; the proxy sees the GitHub token. The same variable is
optional on native builds and is ignored there.

> The token you save needs push permission and is forwarded to the configured
> CORS proxy during git operations. On web it is kept in browser local storage,
> is not encrypted, and is visible to scripts on the page. Use a token scoped to
> the configured repository and prefer a trusted local proxy.

## Project structure

- `index.ts` - Expo entry point that installs the `Buffer` polyfill and loads
  `expo-router/entry`.
- `src/app/` - file-based routes: the shared stack layout, the home route, and
  the settings route.
- `src/components/` - presentational pieces such as the home screen, settings
  screen and fields, task list, rows, sheets, and form fields.
- `src/hooks/` - single-purpose state and orchestration hooks for the task list,
  sheets, forms, settings, onboarding gate, and animation.
- `src/settings/` - git settings model and validation, checkout matching, the
  cached settings service, and platform credential storage (SecureStore for
  native, guarded `localStorage` for web).
- `src/utils/` - small shared helpers such as error and token-safe formatting.
- `src/git/` - checkout association, platform filesystem adapters
  (Expo for native, lightning-fs/IndexedDB for web), CORS proxy helpers, and git
  sync/clone/move/push operations that read the active saved settings.
- `src/tasks/` - task derivation, ordering, pure draft logic, and the optimistic
  task service with its background mutation queue.
- `assets/` - icons and static images.

## Code organization

Components, hooks, and utilities stay atomic, decoupled, and shallow. A
component owns presentation and at most small glue such as a callback or a
single boolean expression; state, effects, orchestration, and data access live
in a hook, and pure logic lives in `src/tasks/` or `src/utils/`. Keep JSX trees
about two to three levels deep. Go deeper only when a platform or accessibility
requirement genuinely needs it, such as the modal and keyboard shell in
`TaskSheetChrome`.

```tsx
// src/components/TaskList.tsx - presentation and callbacks only
<FlatList data={tasks} renderItem={renderRow} />

// src/hooks/useTaskList.ts - state, effects, and orchestration
const state = useSyncExternalStore(subscribe, getState, getState);
```
