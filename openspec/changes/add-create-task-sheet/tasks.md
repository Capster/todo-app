# Tasks

## 1. Task Draft Naming and Validation

- [x] 1.1 Add `src/tasks/taskDraft.ts` with a pure `normalizeTaskDraft` that trims the name, rejects empty names, `/`, `\`, `.`, and `..`, reports whether the description has non-whitespace content, and strips a trailing `.md` from the base name. Verify with `npm run typecheck` and confirm the cases `""`, `"  "`, `"a/b"`, `"a\\b"`, `"."`, `".."`, `"  Buy groceries  "`, and `"Buy groceries.md"` produce the outputs required by the `todo-list` delta spec.
- [x] 1.2 Add naming and duplicate helpers that choose `<base>.md` for a non-empty description and plain `<base>` otherwise, then append ` 2`, ` 3`, ... until the display name is unique. Verify with `npm run typecheck` and confirm against the spec cases: existing open `Buy groceries`, existing archived `Pay the bill`, existing `Buy groceries` and `Buy groceries 2`, and an existing plain `Buy groceries` when creating `Buy groceries.md`.

## 2. Git Creation Pipeline

- [x] 2.1 Add `listTrackedFiles()` to `src/git/repository.ts` that requires the existing checkout and returns `git.listFiles` paths without a network call, plus a shared root/`archived/` path-availability check that refuses an existing destination. Verify with `npm run typecheck` and confirm the existing load, refresh, and completion call sites still compile unchanged.
- [x] 2.2 Add `createTaskFile(fileName, content, message)` to `src/git/repository.ts`: write UTF-8 bytes with `Buffer.from`, stage the root file, commit on `master` with `AUTHOR`, invalidate the creation-date cache, and on failure unlink the partial file, reset its index entry, and rethrow a token-sanitized error. Verify with `npm run typecheck` and inspect that both the success and failure paths always leave no staged entry or commit on failure.
- [x] 2.3 Add a `"creating"` service status and `createTask(name, description)` in `src/tasks/taskService.ts` behind the existing `runExclusive` guard. Return distinct `success`, `saved_locally`, `invalid`, and `failed` results; validate before touching git, choose a unique tracked name, commit, re-read tracked files, and rebuild the list through `buildView`. Verify with `npm run typecheck` and confirm a validation failure performs no filesystem or git work.
- [x] 2.4 Complete the service failure handling: on push failure keep the committed task, set the global error banner, and return `saved_locally`; on missing checkout or write/commit failure return `failed` with an inline message and no global banner; if rebuilding the list fails after a commit, insert the new task at the top instead of reporting a creation failure. Verify with `npm run typecheck` and confirm the result union is narrowed correctly at every return.

## 3. Create Sheet UI and Documentation

- [x] 3.1 Add `src/components/CreateTaskSheet.tsx` using a transparent bottom-anchored `Modal` at half screen height, a backdrop close target, a close control, a name field that wraps and grows without accepting newlines, a multiline description field, an inline error area, and a Create button with a busy state. Verify with `npm run typecheck`, `npm run web`, and a narrow browser window that the sheet occupies the bottom half and both fields remain usable.
- [x] 3.2 Wire the sticky 56×56 round plus button into `src/components/HomeScreen.tsx`, open the sheet from it, disable it while a task operation is busy, and connect Create to `taskService.createTask`. Close the sheet on `success` and `saved_locally`; keep it open on `invalid` and `failed` with the returned message. Verify with `npm run web` by creating one task with a description and one without, confirming both close the sheet and appear newest first.
- [x] 3.3 Confirm web behavior for the full sheet flow: long names expand, empty and path-like names show inline errors, duplicate names receive numeric suffixes, and the Create button cannot submit twice. Verify with `npm run web` against the configured CORS proxy and confirm the created files, contents, and commit messages in the repository.
- [x] 3.4 Update `README.md` with the plus button, bottom-sheet fields, `.md`/plain naming, duplicate suffixing, validation, and offline saved-then-pushed behavior. Verify the README commands still match `package.json` and that the described flow matches the implemented UI.

## 4. Integration Verification

- [ ] 4.1 On Android in Expo Go, open the sheet with the keyboard visible and confirm the FAB, half-height sheet, wrapped long name, multiline description, and Create button remain reachable; dismiss via close control and Android back without creating.
- [ ] 4.2 Create a task while offline with an existing checkout and confirm the sheet closes, the task appears at the top, a readable saved-locally error appears, and the file plus commit exist locally. Reconnect, refresh, and confirm the pending commit reaches the remote without a duplicate.
- [ ] 4.3 Simulate a creation write/commit failure and confirm the rollback leaves no file, staged entry, or commit, the sheet stays open, and an inline error appears. Confirm creation with no checkout shows a readable error and keeps the sheet open.
- [x] 4.4 Run `npm run typecheck` as the final check and confirm it passes; run `npm run web` and confirm the list loads, creation works, and no new dependencies appear in `package.json`.
