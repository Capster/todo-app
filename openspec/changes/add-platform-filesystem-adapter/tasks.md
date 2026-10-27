# Tasks

## 1. Dependency and Type Surface

- [ ] 1.1 Install `@isomorphic-git/lightning-fs` with the Expo-compatible install command and confirm it appears in `package.json` and `npm ls @isomorphic-git/lightning-fs` succeeds.
- [ ] 1.2 Add a narrow ambient module declaration for `@isomorphic-git/lightning-fs` (constructor plus the promise methods used by the adapter) under `src/types/` and confirm `npm run typecheck` passes with the real import typed.

## 2. Shared Filesystem Contract and Expo Extraction

- [ ] 2.1 Add `src/git/fileSystem/types.ts` with the platform contract: `gitFs`, repository and temporary directories, `exists`, `readFile`, `writeFile`, `unlink`, `mkdirp`, `removeDirectory`, and `rename`. Verify `npm run typecheck` passes with the interface in place.
- [ ] 2.2 Move the existing Expo adapter into `src/git/fileSystem/expo.ts` without changing its git-facing behavior, keep `getDocumentDirectory`/`toFileUri` private to that module, and add the new path helpers by wrapping the existing `Directory`/`File` calls. Verify `npm run typecheck` and confirm the native adapter still exports the same `FsClient` method set plus the new helpers.
- [ ] 2.3 Add `src/git/fileSystem/index.ts` as the native entry point that re-exports the Expo adapter, remove the old `src/git/expoFileSystem.ts` imports, and confirm `npm run typecheck` passes.

## 3. Lightning-fs Web Adapter

- [ ] 3.1 Add `src/git/fileSystem/index.web.ts` with a lazily constructed named `FS('todo-app-git')`, expose its promise API as `gitFs`, and set the repository and temporary directories to `/todo-repo` and `/todo-repo.tmp`. Verify `npm run typecheck` and confirm no `IndexedDB` access happens at module import time by inspecting the module for a top-level `new FS(...)`.
- [ ] 3.2 Implement `exists`, `readFile`, `writeFile`, `unlink`, `mkdirp`, `removeDirectory`, and `rename` for lightning-fs, including tolerant parent creation and recursive directory removal without relying on unsupported Node options. Verify `npm run typecheck` and check the wrappers cover every method the shared contract declares.
- [ ] 3.3 Verify the web/native split: confirm `src/git/fileSystem/index.web.ts` is the only file that imports `@isomorphic-git/lightning-fs`, and run `npm run typecheck` plus a web bundle start (`npm run web`) to ensure Metro resolves the web entry and the app still boots.

## 4. Repository Refactor for Platform Selection

- [ ] 4.1 Refactor `src/git/repository.ts` to import the shared adapter from `./fileSystem` and replace every direct `expo-file-system` operation: checkout detection, temp cleanup, `archived/` creation, clone rename, task byte copy, existence checks, and unlink. Verify `npm run typecheck` and confirm `grep -n "expo-file-system" src/git/repository.ts` returns nothing.
- [ ] 4.2 Remove `WEB_UNSUPPORTED_MESSAGE` and all `Platform.OS === "web"` rejections from `syncRepository`, `getCreationTimestamps`, `moveTaskFile`, `restoreTaskFile`, `resetTaskIndex`, and `pushRepository` while keeping the single-flight guard, fast-forward pull, temp-clone/rename, push error inspection, and token redaction. Verify `npm run typecheck` and confirm the only remaining `Platform` use in the module is proxy selection.
- [ ] 4.3 Confirm the refactor preserves mobile behavior by reviewing the clone path (temp directory, `.git/HEAD` detection, rename), the pull path, and the task move/restore byte operations against the adapter contract. Verify `npm run typecheck` and run the Android app to confirm clone, pull, and toggle still work.

## 5. Web CORS Proxy Configuration

- [ ] 5.1 Update `app.config.js` to read and trim `EXPO_PUBLIC_GIT_CORS_PROXY`, validate that a configured value is an `http`/`https` URL, and forward it as `expo.extra.gitCorsProxy`. Verify with `EXPO_PUBLIC_GIT_CORS_PROXY=http://localhost:9999 npx expo config --json` that the value is present without printing the token, and with an invalid value that config fails clearly.
- [ ] 5.2 Add `getGitCorsProxy()` and a web-only requirement helper to `src/git/config.ts` that throws a readable error naming `EXPO_PUBLIC_GIT_CORS_PROXY` when the value is missing. Verify `npm run typecheck` and confirm the message does not include the token.
- [ ] 5.3 Pass `corsProxy` only for web clone, pull, and push, and validate its presence before `getGitToken()` is used for a network request. Verify `npm run typecheck`; on web with no proxy confirm clone reports the configuration error and sends no request, and on native confirm no proxy is required.

## 6. Enable Web Task Flows and UI

- [ ] 6.1 Remove the `Platform.OS === "web"` rejections and the `WEB_UNSUPPORTED_MESSAGE` import from `src/tasks/taskService.ts` so load, refresh, and completion run on web; keep the serialized operation guard and existing failure handling. Verify `npm run typecheck` and confirm the module no longer imports `Platform` unless still needed.
- [ ] 6.2 Update `src/components/HomeScreen.tsx` to always load on mount, remove the unsupported message and its styles, and keep the loading, error banner, empty state, and pending-task behavior. Verify `npm run typecheck` and confirm the web build renders the list instead of the message.
- [ ] 6.3 Add a visible web-only Refresh control that calls the existing `refresh()` operation, is disabled while loading or refreshing, and leaves mobile pull-to-refresh unchanged. Verify `npm run typecheck` and confirm clicking it in the browser runs a push-then-pull refresh.

## 7. Documentation

- [ ] 7.1 Update `README.md` to document web support, the `EXPO_PUBLIC_GIT_CORS_PROXY` requirement, an example local/self-hosted proxy setup, IndexedDB checkout persistence, clearing site data, and single-tab use. Verify the documented commands match `package.json` and the token warning still describes the browser exposure risk.

## 8. Integration Verification

- [ ] 8.1 Run `npm run typecheck` as the final static check and confirm it exits successfully.
- [ ] 8.2 Start the web build without `EXPO_PUBLIC_GIT_CORS_PROXY` and confirm the app no longer shows an unsupported message, loads the todo screen, and reports the missing-proxy configuration error without leaking the token.
- [ ] 8.3 Start a local CORS proxy, set `EXPO_PUBLIC_GIT_CORS_PROXY`, and in the browser confirm: first load clones into IndexedDB, reload pulls instead of cloning, the Refresh control pushes any pending commit and pulls, and checking/unchecking a task moves the file, commits, pushes, and updates the list.
- [ ] 8.4 Confirm the browser checkout survives a page reload and that clearing site data causes the next load to clone again without crashing.
- [ ] 8.5 Run the Android app and confirm clone on first launch, pull on later launches, and task toggle still behave as before, with no browser storage dependency.
- [ ] 8.6 Review the final diff for accidental secrets or raw token output and confirm every new error path is readable and sanitized.
