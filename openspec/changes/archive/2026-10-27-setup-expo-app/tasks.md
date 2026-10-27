# Tasks

## 1. Scaffold the Expo project at the repository root

- [x] 1.1 Activate the supported Node version (`source ~/.nvm/nvm.sh && nvm use 24.19.0`) and scaffold the blank TypeScript template into a temporary directory with `npx create-expo-app@latest /tmp/todo-app-expo-scaffold --template blank-typescript --no-install --no-agents-md`. Verify the temp directory contains `app.json`, `App.tsx`, `index.ts`, `package.json`, `tsconfig.json`, and `assets/`.
- [x] 1.2 Copy only the allow-listed template files into the repository root (`app.json`, `App.tsx`, `index.ts`, `package.json`, `tsconfig.json`, `assets/`, `.gitignore`), explicitly excluding the template `.git/` and `LICENSE`. Verify with `git status --short` that only the intended root files appear and that `todo/` and `openspec/` are unchanged.
- [x] 1.3 Set the package name to `todo-app` and update `app.json` `expo.name`/`expo.slug` to `Todo App`/`todo-app`. Verify `npm pkg get name` returns `todo-app` and `app.json` parses as valid JSON.
- [x] 1.4 Add `.nvmrc` containing `24.19.0` and `engines.node` set to `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`. Verify `cat .nvmrc` and `npm pkg get engines.node` match the Expo SDK 58 requirement.

## 2. Install dependencies and enable web

- [x] 2.1 With Node 24 active, run `npm install` and verify it exits successfully and creates `package-lock.json` with the template's Expo SDK 58 / React Native 0.88 versions.
- [x] 2.2 Add web runtime support with `npx expo install react-dom react-native-web @expo/metro-runtime`. Verify the three packages appear in `package.json` and that `npx expo-doctor` reports no dependency or SDK incompatibility errors.

## 3. Build the starter screen and TypeScript workflow

- [x] 3.1 Create `src/components/HomeScreen.tsx` as a typed React Native component showing a short "Todo App" starter message. Verify the file exists under `src/components/` and exports a component.
- [x] 3.2 Update `App.tsx` to import and render `HomeScreen` instead of inline placeholder content. Verify no duplicate starter UI remains and the import path resolves to `src/components/HomeScreen`.
- [x] 3.3 Add a `typecheck` script (`tsc --noEmit`) to `package.json`. Verify `npm run typecheck` exits successfully with Node 24 active.

## 4. Document the development workflow

- [x] 4.1 Write `README.md` covering the Node.js 24 requirement, `nvm use`, `npm install`, `npm run web`, `npm run android`, `npx expo start` with QR scanning in Expo Go, and the `npx expo start --tunnel` fallback. Verify every documented npm script exists in `package.json` and the commands match the installed scripts.
- [x] 4.2 Document that Expo Go must be updated to the SDK 58-compatible version and that the phone and computer need the same network for LAN mode. Verify the README states both constraints and the tunnel alternative.

## 5. Integration verification

- [x] 5.1 Run `npx expo export --platform web --output-dir /tmp/todo-app-web-export` and verify it exits successfully and produces an `index.html` in the output directory.
- [x] 5.2 Run `npx expo export --platform android --output-dir /tmp/todo-app-android-export` and verify it exits successfully, proving the Android bundle compiles without a device.
- [x] 5.3 Run `npx expo start --web`, open the reported URL, and verify the starter screen renders in the browser without runtime errors; stop the server afterward.
- [x] 5.4 Run `npx expo start`, open the project from Expo Go on the Android device over the same network, and verify the starter screen renders without runtime errors. If LAN discovery fails, repeat with `npx expo start --tunnel` and verify the same result.
- [x] 5.5 Run `npx expo-doctor` and `npm run typecheck` one final time, then confirm `git status --short` shows only intended app files and no changes under `todo/` or existing `openspec/` files.
