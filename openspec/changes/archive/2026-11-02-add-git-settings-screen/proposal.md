# Proposal

## Why

The app currently hardcodes the todo repository and branch, and embeds one GitHub
token at build time, so a user cannot point the app at their own repository or
rotate credentials without rebuilding it. The app also has no way to onboard a
first-time user when no usable git configuration exists.

## What Changes

- **BREAKING**: Remove the fixed repository URL, branch, and build-time token
  injection. The root `token` file is no longer read by `app.config.js`, and the
  app no longer requires it to start.
- Add Expo Router with a home route and a settings route. The settings screen is
  reachable from a cog icon in the top-right of the home screen.
- Add a settings screen with repository URL, branch, token, and optional author
  name and email fields. All fields start empty.
- Store the token with `expo-secure-store` on Android and iOS and with browser
  `localStorage` on web, behind one credential-storage module.
- Persist the repository URL, branch, and optional author identity with a
  non-secret cross-platform storage mechanism.
- Add a Save action that validates and persists the values without contact with
  the remote, and a Clone action that saves first, replaces any existing local
  checkout, and clones the configured repository and branch.
- Route to the settings screen instead of the task list when required
  configuration is missing or malformed. A configured but unreachable
  repository, branch, or token stays on the task list and uses the existing
  error banner.
- Use the saved author name and email for commits, falling back to the existing
  app author identity when either field is blank.
- Update `git-sync`, `app-shell`, and `todo-list` behavior where they assume a
  fixed repository, embedded token, or single-screen app.

## Capabilities

### New Capabilities

- `git-settings`: User-provided git configuration, credential storage, settings
  form behavior, onboarding routing, and the Clone action that replaces the
  local checkout.

### Modified Capabilities

- `git-sync`: Clone, pull, and push use the repository, branch, and token from
  saved settings instead of fixed build-time values; remove the fixed
  configuration and embedded-token requirements.
- `app-shell`: Add Expo Router navigation, the home route, and the settings
  route with its top-right entry point.
- `todo-list`: The list's launch behavior depends on usable saved git
  configuration and routes to settings when it is missing or invalid.

## Impact

- Dependencies: add `expo-router`, `expo-secure-store`,
  `react-native-safe-area-context`, `react-native-screens`, and
  `expo-linking`.
- Entry point: replace `index.ts` + `App.tsx` registration with Expo Router's
  `expo-router/entry` and an `app/` directory.
- Expo config: add a URL scheme for routing; stop reading `./token` in
  `app.config.js`.
- New code: settings storage module, config/validation utilities, settings
  screen, settings hook, and cog entry point under `src/`.
- Modified code: `src/git/config.ts` becomes runtime access to saved settings;
  `src/git/repository.ts` uses the saved repository, branch, and author;
  `src/tasks/taskService.ts` and `src/components/HomeScreen.tsx` handle the
  onboarding decision.
- Documentation: README setup no longer requires a `token` file and documents
  the settings screen.
- Security: the token moves from the JavaScript bundle to platform secure
  storage on native and to `localStorage` (not encrypted) on web.
