# Tasks

## 1. Task Derivation and Ordering

- [ ] 1.1 Add `src/tasks/tasks.ts` with the task type and a pure derivation function that turns tracked paths into open tasks (root children), completed tasks (`archived/` children), ignores other paths, and strips the final extension from display names. Verify with `npm run typecheck` and confirm the current checkout derives six tasks, with `Pay the bill` and `Vacuum the vent` marked complete.
- [ ] 1.2 Add a pure ordering function that sorts by creation timestamp descending and display name ascending, with a deterministic non-locale tie-break. Verify with `npm run typecheck` and confirm the ordering handles equal timestamps and keeps a task's position when its completed state changes.

## 2. Git Repository Operations

- [ ] 2.1 Refactor the clone/pull internals in `src/git/repository.ts` into an `ensureCheckout` helper using `fastForwardOnly: true`, a `syncRepository` helper with an optional pending-push retry, and keep the module-level single-flight guard, web rejection, and token sanitization. Verify with `npm run typecheck` and confirm the web rejection happens before any filesystem access.
- [ ] 2.2 Add creation-timestamp lookup that queries `git.log` for both the root and archived paths with `force: true`, takes the oldest author timestamp, falls back to HEAD, and caches results by HEAD oid and file name. Verify with `npm run typecheck` and compare results against `git -C todo log --format=%at -- <root-or-archived-path>` for an existing task.
- [ ] 2.3 Add the move operation: reject an existing destination, ensure `archived/` exists, copy file bytes, write the destination, unlink the source, stage with `git.add`/`git.remove`, and commit with the existing `AUTHOR` identity. Verify with `npm run typecheck` and confirm the staged status is clean after a successful move.
- [ ] 2.4 Add push support using the existing `onAuth` callback that inspects the returned `errors` array and treats a non-empty result as failure, with token redaction applied to commit and push errors. Verify with `npm run typecheck` and confirm no code path returns an unsanitized git error.
- [ ] 2.5 Add pending-push detection by comparing the local `master` oid with `refs/remotes/origin/master` via `git.resolveRef`, and wire it into the refresh sync path. Verify with `npm run typecheck` and confirm a refresh with no divergence performs no extra commit.

## 3. Task Service

- [ ] 3.1 Add `src/tasks/taskService.ts` exposing load, refresh, and set-completion operations that compose sync, derivation, ordering, and toggling behind one serialized operation guard. Verify with `npm run typecheck` and confirm a second load, refresh, or toggle started during an operation is rejected or coalesced.
- [ ] 3.2 Add failure handling to the service: restore the file and reset both index entries when a move or commit fails, but keep the commit when only the push fails and surface a readable error. Verify with `npm run typecheck` and confirm the service returns a distinct push-failure result from a rollback result.
- [ ] 3.3 Expose loading, refreshing, per-task pending, and error state needed by the screen without leaking git paths or timestamps into the view model. Verify with `npm run typecheck` and confirm the view model contains only file name, display name, completion, and creation-order data.

## 4. Todo List UI and Documentation

- [ ] 4.1 Add `Checkbox` and `TaskRow` components under `src/components/` with a drawn checkbox, `accessibilityRole="checkbox"`, checked state, task label, and disabled/pending styling. Verify with `npm run typecheck` and confirm the row renders both open and completed states.
- [ ] 4.2 Rework `src/components/HomeScreen.tsx` into a mixed `FlatList` with initial loading, `RefreshControl` pull-to-refresh, an error banner that preserves the current list, an empty state, and the existing web unsupported message. Verify with `npm run typecheck` and `npm run web`, confirming the web build shows the unsupported message and performs no checkout.
- [ ] 4.3 Update `README.md` to describe the todo checklist, automatic clone/pull on launch, pull-to-refresh, completion moves/commits/pushes, pending-push retry, the token's push permission, and mobile-only availability; remove references to the manual Clone button and tree output. Verify the documented commands still match `package.json`.
- [ ] 4.4 Confirm no dependencies were added and no task content is read or modified: `git diff package.json` shows no dependency changes, and the completion path only reads and writes file bytes for the move. Verify with `npm run typecheck`.

## 5. Integration Verification

- [ ] 5.1 On an Android device in Expo Go with no checkout, launch the app and confirm it clones automatically and shows one mixed list with `Buy groceries`, `Finish the measurements`, `Plan the summer trip`, `Test the new workflow`, `Pay the bill`, and `Vacuum the vent`, with the last two checked.
- [ ] 5.2 Restart the app and confirm it pulls instead of cloning, shows the loading state, and renders the same list with the checkout still present.
- [ ] 5.3 Add a temporary task commit to the remote with a newer timestamp, pull-to-refresh, and confirm the new task appears at the top while older tasks remain below; remove the temporary commit afterward.
- [ ] 5.4 Check an open task, then confirm the file moved from the root to `archived/` in the device checkout, a commit was created, the remote `master` was updated, and the task stayed in the same list position with a checked box; uncheck it and confirm the reverse.
- [ ] 5.5 Toggle a task while offline and confirm the checkbox state changes, the commit is kept locally, and a readable push error appears; reconnect, pull-to-refresh, and confirm the pending commit is pushed without duplicating the change.
- [ ] 5.6 Simulate a move/commit failure (for example by making `archived/` unwritable or creating a destination collision) and confirm the task stays in its original location with its original checkbox state and a readable error.
- [ ] 5.7 Run `npm run typecheck` as the final check and confirm it passes; run `npm run web` and confirm the unsupported message appears with no git or filesystem errors.
