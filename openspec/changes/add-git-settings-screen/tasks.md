# Tasks

## 1. Add routing dependencies and Expo Router scaffolding

- [ ] 1.1 Install `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, and `expo-status-bar` with `npx expo install`, then verify the resolved versions in `package.json` and that `npm ls` reports no missing peers.
- [ ] 1.2 Add the Expo Router config (`scheme`, `expo-router` plugin, typed routes) and extend the TypeScript include list for generated route types; verify with `npx expo config --type public` and `npm run typecheck`.
- [ ] 1.3 Convert the entry point so `index.ts` keeps the `Buffer` polyfill and imports `expo-router/entry` last, remove `App.tsx` and the direct `registerRootComponent` call, and add `src/app/_layout.tsx`, `src/app/index.tsx`, and a placeholder `src/app/settings.tsx`; verify the web build renders both routes and `npm run typecheck` passes.

## 2. Build the settings model, validation, and platform storage

- [ ] 2.1 Add `GitSettings` and per-field validation/normalization utilities under `src/settings/` that enforce an absolute http(s) repository URL, a safe branch name, a non-empty token, and optional author fields; verify `npm run typecheck` and exercise valid and invalid combinations through the settings form in a later task.
- [ ] 2.2 Add `src/settings/storage.ts` using `expo-secure-store` and `src/settings/storage.web.ts` using guarded `localStorage`, storing the non-secret settings JSON and the token under separate keys; verify `npm run typecheck` and that web saves survive a page reload.

## 3. Add the settings service and active git connection

- [ ] 3.1 Implement a module-level settings service with cached loading, `subscribe`/`getSnapshot`, save, and an async `getActiveConnection()` that builds the repository URL, branch, token, and fallback author identity from saved settings; verify `npm run typecheck` and that the service throws a readable configuration error before any settings are saved.
- [ ] 3.2 Add checkout matching that compares the saved repository URL and branch with the checkout's `remote.origin.url` and current branch, normalizing trailing slashes and `.git`; verify a checkout made with the same URL and branch matches, while a changed URL or branch does not.

## 4. Refactor the git layer to use saved settings

- [ ] 4.1 Remove the fixed repository URL, branch, and build-time token access from `src/git/config.ts`, keep the checkout directory, proxy helpers, and default author, and export the runtime connection type; verify `npm run typecheck` and that no source file still imports `getGitToken`, `REPOSITORY_URL`, or `BRANCH`.
- [ ] 4.2 Update every operation in `src/git/repository.ts` (clone, pull, push, list, log, refs, commits, moves, reads, writes, deletes) to use the active connection's repository URL, branch, token, and author; verify `npm run typecheck` and that clone/pull/push and task mutations still work against a configured repository.
- [ ] 4.3 Implement `cloneConfiguredRepository` to clone into the temporary directory and only replace the existing checkout after success, preserving the previous checkout on failure and keeping token redaction and the web proxy check; verify a failed clone leaves the old checkout readable and a successful clone uses the configured branch.

## 5. Build the settings screen and navigation entry point

- [ ] 5.1 Add atomic `SettingsField` and `SettingsScreen` components plus a `useSettingsForm` hook that loads saved values, shows masked token input, validates on Save and Clone, handles busy state, and displays inline and banner errors; verify `npm run typecheck` and that an invalid submit shows field errors without saving.
- [ ] 5.2 Implement Save behavior so it persists without network access, returns home when no checkout exists or the checkout matches, and stays on settings with a Clone-required notice when the checkout belongs to another configuration; verify on web that Save works offline and that changing the repository URL with an existing checkout keeps the settings screen open.
- [ ] 5.3 Implement Clone behavior so it saves first, runs in the foreground with progress, prevents overlap, opens the home route on success, and shows a token-safe error on failure; verify a successful clone of a non-default branch and a failed clone with a bad token.
- [ ] 5.4 Add the top-right cog control to `TaskListHeader`, forward its callback through `HomeScreen`, and wire the home route to open `/settings`; verify the cog opens settings on web and that back navigation returns to the list.

## 6. Add onboarding routing and remove the build-time token

- [ ] 6.1 Add the home-route gate that loads settings and checkout status, shows the existing loading presentation, redirects to settings when configuration is missing, invalid, or mismatched, and renders the list when configuration is usable; verify a first launch with no settings never calls clone or pull.
- [ ] 6.2 Stop `app.config.js` from reading `./token` and exposing `extra.gitToken`, keeping the `EXPO_PUBLIC_GIT_CORS_PROXY` handling; verify `npx expo start` succeeds without a root `token` file and `npx expo config --type public` contains no token.
- [ ] 6.3 Update the README to remove the token-file setup requirement and document the settings screen, onboarding behavior, configurable repository/branch/author, native secure storage, web local-storage caveat, and Clone replacement behavior; verify the documented setup and run commands match the code.

## 7. Verify the integrated behavior

- [ ] 7.1 Run `npm run typecheck` and confirm it passes with no TypeScript errors.
- [ ] 7.2 In a browser, verify first launch with no saved settings opens settings, entering valid values saves without network, Clone loads the configured branch, reloading keeps the token, and an invalid token stays on the list with a readable error banner.
- [ ] 7.3 On Android or iOS, verify the token is saved through SecureStore, the settings route opens from the cog and on first launch, Clone and pull use the configured branch, and a task commit uses the saved author or the fallback identity when fields are blank.
- [ ] 7.4 Run `openspec validate add-git-settings-screen` and confirm the change validates after implementation.
