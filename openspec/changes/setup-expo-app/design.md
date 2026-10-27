# Design

## Context

See `proposal.md` for motivation. Current constraints that shape the approach:

- The repository root is not empty: it contains `openspec/`, `todo/` (a nested git repository with plain-text todo data), and `.opencode/`. `create-expo-app` refuses to scaffold into a directory with conflicting files.
- The machine runs Node.js 22.2.0 by default, but Expo SDK 58 requires Node 22.13+ or 24.3+. Node 24.19.0 is already installed under nvm.
- Versions verified on this machine: Expo `58.0.19`, React Native `0.88.0`, React `19.3.0`, TypeScript `~6.0.3`, blank TypeScript template `58.0.28`. React Native 0.89.x does not exist; SDK 58 / RN 0.88 is the current stable target.
- The user has Expo Go installed on a physical Android device and chose the repository root as the app location, the blank TypeScript template, and an SDK 58 + Node upgrade path.

## Goals / Non-Goals

**Goals:**

- A managed Expo app at the repository root that starts on web and in Expo Go on Android from the same TypeScript source.
- A minimal, extensible `src/` structure with `src/components/` and no speculative folders.
- Reproducible tooling: pinned Node via nvm, declared engine range, install/run/typecheck scripts, and documented device workflow.

**Non-Goals:**

- Todo features, navigation, state management, persistence, styling system, tests, linting/formatting, or CI.
- Native projects (`ios/`, `android/`), EAS builds, store deployment, or iOS device testing.
- Moving or modifying existing OpenSpec or todo data.

## Decisions

### Scaffold in a temporary directory, then merge into the root

Run `create-expo-app` against a temporary directory, then copy only the generated project files into the repository root. Copy `app.json`, `App.tsx`, `index.ts`, `package.json`, `tsconfig.json`, `assets/`, and `.gitignore`; skip the template's `.git/` and `LICENSE`. Merge package identity (`name`, `slug`) to `todo-app` instead of the temporary directory name. Use `--no-agents-md` to avoid generating agent instruction files.

Alternatives: scaffolding into `app/` (rejected by the user because the app belongs at the root) or hand-writing all Expo config (more error-prone and likely to drift from the SDK template).

### Use the blank TypeScript template and keep the entry at the root

The template provides `index.ts` → `App.tsx`, strict TypeScript via `expo/tsconfig.base`, and Expo SDK 58 defaults with no router. `App.tsx` remains the entry and composes a starter component from `src/components/`. This matches the requested `src/` convention without imposing file-based routing. Expo Router was considered but rejected because it would require an `app/` route tree in addition to `src/` for a basic shell.

### Add web support explicitly

Install `react-dom`, `react-native-web`, and `@expo/metro-runtime` with `npx expo install` so versions match SDK 58. The blank template ships without them and `npm run web` would otherwise prompt for installation on first run. The web bundler remains Metro (the SDK default).

### Standardize the Node.js toolchain

Add `.nvmrc` with `24.19.0` and an `engines.node` range matching Expo's requirement (`^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`). Every install/run command is invoked after `nvm use` (or with the nvm-managed `PATH`) so the default 22.2.0 shell does not silently run an unsupported version. Pinning an older SDK to keep Node 22.2.0 was rejected because it forgoes the latest stable release.

### Managed workflow with Expo Go, tunnel as fallback

Do not run `expo prebuild` and do not commit native folders. The device preview path is `npx expo start` followed by scanning the QR code in Expo Go over the same network; `npx expo start --tunnel` is documented for networks that block LAN discovery. `npm run android` is reserved for emulators or USB-connected devices with adb.

### Verification strategy

- `npx tsc --noEmit` (exposed as `npm run typecheck`) proves the TypeScript baseline.
- `npx expo-doctor` checks dependency/version alignment.
- `npx expo export --platform web` and `npx expo export --platform android` prove both bundles compile without a device.
- Final Android acceptance is a manual scan with Expo Go; the plan records this as a user-verifiable step rather than pretending it can be automated headlessly.

## Risks / Trade-offs

- **Scaffold merge leaves stale or extra files** → Copy an explicit allow-list, never `rsync` the whole temp tree, and confirm `git status` afterward.
- **Default shell keeps using Node 22.2.0** → `.nvmrc` plus documented `nvm use` before commands; `engines` makes the mismatch visible during install.
- **Expo Go on the device is older than SDK 58** → Document updating Expo Go to the latest version before scanning; `expo-doctor` catches project-side mismatches.
- **Corporate/campus Wi-Fi blocks device-to-host traffic** → Tunnel mode fallback documented; tunnel requires installing `@expo/ngrok` on first use.
- **Nested `todo/.git` and large sibling folders are watched by Metro** → No data is moved; if startup or watching becomes slow, add targeted Metro ignore patterns rather than excluding the folder from git.
- **`npm run android` without an emulator or USB device fails** → README directs physical-device users to the QR/Expo Go flow instead.
- **SDK 58 is new** → Pin template-generated versions, run `expo-doctor`, and avoid adding extra native dependencies in this change.

## Migration Plan

This is a greenfield addition, so there is no data migration. Rollout consists of adding the app files, installing dependencies with Node 24, and verifying web/Android bundles. Rollback is deleting the added root files (`package.json`, `package-lock.json`, `app.json`, `index.ts`, `App.tsx`, `tsconfig.json`, `src/`, `assets/`, `.nvmrc`, `README.md`, `.gitignore`) and running `rm -rf node_modules .expo`; no existing OpenSpec or todo files are touched.

## Open Questions

None blocking. The exact starter-screen visual design can be adjusted during implementation without affecting the specs or task breakdown.
