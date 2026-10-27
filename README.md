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
- A root `token` file containing a GitHub token with read and write (push)
  access to `https://github.com/Capster/todo.git`. This file is gitignored and
  is injected at build time; the app will fail to start without it.

## Setup

Activate the pinned Node.js version, install dependencies, and create the token
file:

```bash
nvm use
npm install
printf '%s\n' '<your-github-token>' > token
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

## Todo list (mobile only)

The home screen shows one checklist that mixes open and completed tasks. Files
tracked directly in the repository root are open tasks, files tracked directly
inside `archived/` are completed tasks, and each display name is the file name
without its final extension. The list is ordered newest first using each task's
creation date. Task file contents are never displayed, edited, or interpreted.

On mobile, opening the screen clones the private todo repository when no local
checkout exists and pulls `master` when it does. A loading state appears while
this runs. Pull down on the list to refresh: the app first pushes any pending
local commit, then pulls the latest `master`, then re-renders the list.

Checking a task moves its file from the root into `archived/`, commits the move
with the configured app identity, and pushes `master`. Unchecking a task moves
it back to the root and repeats the commit and push. If the push fails after the
commit succeeds, the change stays committed locally, the app shows a readable
error, and the next pull-to-refresh retries the push before pulling. If the move
or commit fails, the task is restored to its original location and state.

This feature uses the device filesystem and is available only on Android and
iOS; on the web the app shows an unsupported message and performs no checkout or
task operation. The checkout is stored in the app's document directory, so the
repository is pulled rather than cloned after a restart.

> The GitHub token is embedded in the JavaScript bundle at build time and needs
> push permission. Use a token scoped to this repository and rotate it before
> distributing any build.

## Project structure

- `App.tsx` - application entry point, composes the todo screen.
- `src/components/` - todo screen, task row, and checkbox components.
- `src/git/` - repository configuration, Expo filesystem adapter, and git
  sync/move/push operations.
- `src/tasks/` - task derivation, ordering, and the serialized task service.
- `assets/` - icons and static images.
- `token` - local, gitignored GitHub token read by `app.config.js`.
