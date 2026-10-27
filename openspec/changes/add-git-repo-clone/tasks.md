# Tasks

## 1. Dependencies and Runtime Polyfill

- [x] 1.1 Install `isomorphic-git`, `buffer`, `expo-file-system`, and `expo-constants` with the Expo-compatible install commands. Verify with `npm ls isomorphic-git buffer expo-file-system expo-constants` that all four are direct dependencies.
- [x] 1.2 Add the `Buffer` polyfill at the top of `index.ts` before `registerRootComponent`. Verify `npm run typecheck` passes and the app boots on web without a `Buffer is not defined` error.

## 2. Configuration and Token Injection

- [x] 2.1 Add `token` to `.gitignore` and confirm with `git check-ignore -v token` that the secret file is ignored.
- [x] 2.2 Add `app.config.js` that imports `app.json`, reads the root `token` file, trims it, exposes it as `expo.extra.gitToken`, and throws a clear error when the file is missing or empty. Verify with `npx expo config --json` that the config resolves and `extra.gitToken` is present, without printing the token value.
- [x] 2.3 Add `src/git/config.ts` with the repository URL `https://github.com/Capster/todo.git`, branch `master`, author identity, repository directory name, and an accessor that reads `expo-constants` and throws a readable error when the token is missing. Verify `npm run typecheck` passes.
- [x] 2.4 Document in `README.md` that the root `token` file is required, that the feature is mobile-only, and how to start the app. Verify the documented commands match `package.json` scripts.

## 3. Expo Filesystem Adapter

- [x] 3.1 Implement the promise-style path, read/write, delete, directory-list, make-directory, and remove-directory methods in `src/git/expoFileSystem.ts`, converting plain absolute paths to `file://` URIs. Verify `npm run typecheck` passes.
- [x] 3.2 Implement Node-like `stat`/`lstat` results and `ENOENT`/`ENOSYS` error mapping, including directory/file probing without crashing on the wrong constructor. Verify `npm run typecheck` passes and the adapter exports the `promises` object expected by `isomorphic-git`.
- [x] 3.3 Implement `chmod` as a no-op and symlink operations as `ENOSYS`. Verify `npm run typecheck` passes and the repository contains no symlinks that would need support (`git -C todo ls-files -s | grep ^120000` returns nothing).

## 4. Repository Service

- [x] 4.1 Implement repository detection via `todo-repo/.git/HEAD`, clone into `todo-repo.tmp`, rename on success, and delete the temp directory on failure. Verify `npm run typecheck` passes.
- [x] 4.2 Implement the existing-checkout path with `git.pull` on `master` and a fixed author identity, keeping the previous checkout when the pull fails. Verify `npm run typecheck` passes.
- [x] 4.3 Implement a pure `buildTree(paths)` that sorts paths, groups directories, indents two spaces per level, and marks directories with a trailing slash. Verify the function on a sample list containing a nested file (for example `archived/Pay the bill`) produces the expected indented lines.
- [x] 4.4 Implement `cloneOrUpdateRepository` using `isomorphic-git/http/web`, `onAuth` with the `x-access-token` username, `git.listFiles` for the tree input, a single-flight guard, a web guard, and error sanitization that never includes the token. Verify `npm run typecheck` passes and the web path returns the unsupported-feature error without touching the filesystem.

## 5. Home Screen UI

- [x] 5.1 Add the Clone button, in-progress state, error line, and tree output to `src/components/HomeScreen.tsx`, disabling the button while an operation runs. Verify the screen renders in the web build with no crash.
- [x] 5.2 Show the web-only unsupported message instead of starting a clone when `Platform.OS === 'web'`, and render the tree in a scrollable monospace block on native. Verify `npm run web` shows the unsupported message and `npm run typecheck` passes.

## 6. Integration Verification

- [ ] 6.1 On an Android device in Expo Go, press Clone and confirm the private repository is checked out to the app document directory and the tree lists the same tracked files as `git -C todo ls-files` with indentation for `archived/`.
- [ ] 6.2 Restart the app and press Clone again; confirm it pulls instead of re-cloning and the tree still renders.
- [ ] 6.3 Disable network access and press Clone; confirm a readable error appears, the app does not crash, and any previously displayed tree remains usable.
- [x] 6.4 Run `npm run typecheck` as the final check and confirm it exits successfully; run `npm run web` to confirm the web build still renders.
