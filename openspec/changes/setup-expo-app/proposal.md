# Proposal

## Why

The repository currently holds only OpenSpec artifacts and plain-text todo data; there is no runnable application. We need an Expo-based React Native foundation that runs the same TypeScript code in a browser and on a physical Android device through Expo Go, so feature work can start from a working cross-platform shell.

## What Changes

- Scaffold the latest stable Expo app at the repository root using the blank TypeScript template (Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6).
- Add web support (`react-dom`, `react-native-web`, `@expo/metro-runtime`) so `npm run web` renders the app in a browser.
- Configure the app for Expo Go on a physical Android device over the local network, with a tunnel fallback.
- Introduce the requested `src/` layout, starting with `src/components/`, and compose the starter screen from a component there.
- Set a Node.js requirement that matches Expo SDK 58 (`>=22.13`) via `.nvmrc` and `package.json` `engines`; the repo's current Node 22.2.0 is below the minimum.
- Add run, typecheck, and device-connection instructions to the repository README.

Out of scope: todo feature implementation, state management, navigation, authentication, native iOS/Android project folders (`prebuild`), EAS builds, and app-store distribution.

## Capabilities

### New Capabilities
- `app-shell`: Cross-platform Expo application bootstrap, including web and Android/Expo Go launch paths, TypeScript source organization, and the starter screen.

### Modified Capabilities
<!-- No existing capabilities are affected. -->

## Impact

- New root-level files: `package.json`, `package-lock.json`, `app.json`, `index.ts`, `App.tsx`, `tsconfig.json`, `.nvmrc`, `README.md`, `.gitignore`, and `assets/`.
- New source tree: `src/components/` with the starter component.
- New dependencies: Expo SDK 58 packages plus web runtime packages.
- No existing files under `openspec/` or `todo/` are modified; the nested `todo/` git repository and plain-text todo data remain untouched.
- Development requires Node.js 22.13+ or 24.3+ (repo will standardize on the already-installed Node 24.19.0 via nvm).
- Physical-device testing requires Expo Go compatible with SDK 58 and both devices on the same network (or a tunnel).
