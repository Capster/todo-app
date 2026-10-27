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
- A root `token` file containing a GitHub token with access to
  `https://github.com/Capster/todo.git`. This file is gitignored and is injected
  at build time; the app will fail to start without it.

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

## Git checkout (mobile only)

The home screen can clone the private todo repository and display its tracked
files as an indented text tree. This feature uses the device filesystem and is
available only on Android and iOS; on the web the app shows an unsupported
message instead. The checkout is stored in the app's document directory, so
pressing Clone again after a restart pulls updates instead of cloning again.

> The GitHub token is embedded in the JavaScript bundle at build time. Use a
> token scoped to this repository and rotate it before distributing any build.

## Project structure

- `App.tsx` - application entry point, composes the starter screen.
- `src/components/` - reusable UI components.
- `src/git/` - repository configuration, Expo filesystem adapter, and clone/pull
  service.
- `assets/` - icons and static images.
- `token` - local, gitignored GitHub token read by `app.config.js`.
