# todo-list Specification

## Purpose

Turn the files tracked in the todo repository into one checklist of open and completed tasks, ordered by when each task was created, with completion toggled by moving, committing, and pushing task files.

## Requirements

### Requirement: Derive tasks from tracked files

The app SHALL derive tasks from tracked files in the local checkout. A file directly in the repository root SHALL be an open task, and a file directly inside `archived/` SHALL be a completed task. Other paths SHALL be ignored. A task's display name SHALL be its file name with the final extension removed. File contents SHALL NOT be read to display, order, or refresh the list; they SHALL be read only when the user opens the edit sheet for a task.

#### Scenario: Open task from a root file

- **WHEN** the checkout contains a tracked file `Buy groceries.md` at the repository root
- **THEN** the list includes an open task named `Buy groceries`

#### Scenario: Completed task from an archived file

- **WHEN** the checkout contains a tracked file `archived/Pay the bill`
- **THEN** the list includes a completed task named `Pay the bill`

#### Scenario: Extension removal

- **WHEN** a task file is named `notes.txt`
- **THEN** the list shows the task name `notes`
- **AND** a file name without an extension is shown unchanged

#### Scenario: Unrelated paths are ignored

- **WHEN** the checkout contains a tracked file under a directory other than `archived/`
- **THEN** that file does not appear as a task

#### Scenario: No tasks

- **WHEN** the checkout contains no task files
- **THEN** the app shows an empty task list rather than an error

#### Scenario: Contents are not read for the list

- **WHEN** the app loads or refreshes the task list
- **THEN** it derives every task from tracked file paths without reading task file contents

### Requirement: One mixed list ordered by creation date

The app SHALL display open and completed tasks in one mixed list ordered by task creation date, newest first. The creation date SHALL be the timestamp of the earliest commit that introduced the task file at either its root or its `archived/` path, and moving a task SHALL NOT change its date. Ties SHALL be broken by task name in ascending order.

#### Scenario: Open and completed tasks are mixed

- **WHEN** the checkout contains tasks of both kinds with different creation dates
- **THEN** the app renders both kinds in a single list with the newest task at the top and the oldest at the bottom

#### Scenario: Completing a task does not reorder it

- **WHEN** the user marks a task complete and its file moves to `archived/`
- **THEN** the task keeps its original creation date and position in the list

#### Scenario: Tasks created in the same commit

- **WHEN** two tasks have the same creation date
- **THEN** the task whose name sorts first ascending appears above the other

#### Scenario: Archived-only task

- **WHEN** a task's only commit history is under `archived/`
- **THEN** its creation date is taken from the earliest of those commits

### Requirement: Load the task list on launch

On Android, iOS, and web, when the todo screen opens, the app SHALL ensure a local checkout by cloning when none exists or pulling when one exists, and then render the task list. While loading, the app SHALL show a loading state. A failure SHALL show a readable error without crashing and without discarding a previously rendered list.

#### Scenario: First launch clones

- **WHEN** the todo screen opens on a device or browser with no local checkout
- **THEN** the app clones `master`, derives tasks, and renders the list

#### Scenario: Later launch pulls

- **WHEN** the todo screen opens and a local checkout already exists
- **THEN** the app pulls the latest `master` and renders the updated list

#### Scenario: Web launch uses the stored checkout

- **WHEN** the todo screen opens in a browser that already stored a checkout from an earlier session
- **THEN** the app pulls `master` and renders the list without cloning again

#### Scenario: Load failure

- **WHEN** cloning or pulling fails while loading
- **THEN** the app clears the loading state, shows a readable error, and keeps any previously rendered tasks visible

### Requirement: Refresh the task list

The app SHALL support refreshing the task list on Android, iOS, and web. On mobile, pull-to-refresh SHALL trigger a refresh; on web, a visible Refresh control SHALL trigger a refresh. A refresh SHALL first push any pending local commit, then pull the latest `master`, then re-render the list. The app SHALL show an in-progress state and SHALL NOT run overlapping load or refresh operations.

#### Scenario: Refresh picks up remote changes

- **WHEN** the user pulls down on the task list on mobile and the remote has newer commits
- **THEN** the app pulls those commits and renders the updated task list

#### Scenario: Web refresh

- **WHEN** the user activates the Refresh control in a browser
- **THEN** the app pushes any pending local commit, pulls the latest `master` through the configured proxy, and re-renders the list

#### Scenario: Refresh retries a pending push

- **WHEN** a previous commit was not pushed and the user refreshes
- **THEN** the app pushes the pending local commit before pulling

#### Scenario: Refresh failure

- **WHEN** a refresh push or pull fails
- **THEN** the app shows a readable error and keeps the current task list visible

#### Scenario: Overlapping operations are prevented

- **WHEN** a load or refresh is already running
- **THEN** the app does not start a second load or refresh

### Requirement: Apply task mutations optimistically

Creating, toggling, editing, and deleting a task SHALL update the displayed task list immediately, before the local git commit and remote push complete. The user SHALL be able to continue interacting with the list while those operations run. Clone and pull SHALL remain foreground operations and SHALL NOT be made optimistic.

#### Scenario: Mutation is visible immediately

- **WHEN** the user creates, toggles, edits, or deletes a task
- **THEN** the task list reflects the change before the local commit and push finish

#### Scenario: UI stays responsive during sync

- **WHEN** a task mutation is waiting for a local commit or remote push
- **THEN** the user can open other tasks and start other task mutations without waiting for it

#### Scenario: Clone and pull stay foreground

- **WHEN** the app loads or the user refreshes and a clone or pull is required
- **THEN** the app shows its loading or refreshing state instead of applying the operation optimistically

### Requirement: Queue task mutations

The app SHALL accept a new task mutation while a previous mutation is still syncing and SHALL apply accepted mutations in the order the user triggered them. It SHALL NOT reject a mutation solely because another task operation is running.

#### Scenario: Second mutation is accepted

- **WHEN** the user toggles one task and then edits another before the first sync finishes
- **THEN** both changes are accepted and displayed without a busy rejection

#### Scenario: Queued mutations apply in order

- **WHEN** several task mutations are triggered while an earlier one is still syncing
- **THEN** the displayed results match applying those mutations in trigger order

### Requirement: Toggle task completion

The app SHALL provide a checkbox per task that reflects whether the task is complete, and SHALL update the displayed checkbox immediately when the user toggles it. Checking an open task moves its file from the repository root into `archived/`; unchecking moves it back. The file name and content SHALL be preserved. The move, commit, and push SHALL run in the background, and each successful change SHALL be committed with the configured app author identity and pushed to `master`. This behavior SHALL apply on Android, iOS, and web.

#### Scenario: Mark a task complete

- **WHEN** the user checks the checkbox of an open task
- **THEN** the task immediately shows as completed and the app moves the task file into `archived/`, commits the move, and pushes `master` in the background

#### Scenario: Mark a task incomplete

- **WHEN** the user unchecks the checkbox of a completed task
- **THEN** the task immediately shows as open and the app moves the task file back to the repository root, commits the move, and pushes `master` in the background

#### Scenario: Toggle on the web

- **WHEN** the user checks or unchecks a task in a browser
- **THEN** the list updates immediately, and the app moves the file in the browser-stored checkout, commits the change, and pushes `master` through the configured proxy

#### Scenario: File content is preserved

- **WHEN** a task file is moved between the root and `archived/`
- **THEN** its file name and content are unchanged

#### Scenario: Destination name already exists

- **WHEN** moving a task would overwrite an existing file at the destination
- **THEN** the displayed checkbox returns to its original state, the task stays in its original location, and the app shows a readable error without creating a commit

### Requirement: Handle toggle failures

If the move or commit fails, the app SHALL restore the task to its original location and original displayed checkbox state and SHALL show a readable error. If the commit succeeds but the push fails, the app SHALL keep the local commit and the displayed completion state, report a readable error, and retry the push on the next refresh.

#### Scenario: Move or commit fails

- **WHEN** moving or committing a completion change fails
- **THEN** the task remains in its original location and its checkbox returns to its original state, with a readable error

#### Scenario: Push fails after commit

- **WHEN** the commit succeeds but pushing `master` fails
- **THEN** the app keeps the completed change and its displayed state, shows a readable error, and pushes it on the next refresh

### Requirement: Open the task creation sheet

The list screen SHALL show a sticky round button with a plus icon at the bottom-right corner. Activating it SHALL open a modal bottom sheet that overlays the list and occupies the bottom half of the screen. The sheet SHALL contain a task-name field, a multiline description field, and a Create button. The name field SHALL accept a single line of text and SHALL grow vertically to show the full name when the text does not fit on one line.

#### Scenario: Plus button opens the sheet

- **WHEN** the user activates the round plus button on the list screen
- **THEN** the task creation sheet appears over the list, anchored to the bottom half of the screen

#### Scenario: Long name wraps and expands

- **WHEN** the user enters a task name that is wider than the name field
- **THEN** the name wraps onto additional lines and the field grows in height to show the full name without adding a newline to the name

#### Scenario: Description accepts multiple lines

- **WHEN** the user enters several lines in the description field
- **THEN** the field keeps the line breaks and displays the full description

### Requirement: Create a task from the sheet

When the user activates Create with valid input, the app SHALL accept the task immediately: close the sheet, show the new open task at the top of the list, and run file creation, commit, and push in the background. The entered name SHALL be trimmed before use, and a whitespace-only description SHALL be treated as empty. The background operation SHALL create one open task file at the repository root, write the description as its content, commit with the configured app identity, and push `master`.

#### Scenario: Create a task with a description

- **WHEN** the user enters the name `Buy groceries` and a non-empty description and activates Create
- **THEN** the sheet closes, a new open task named `Buy groceries` appears immediately, and the app creates and commits `Buy groceries.md` with that content and pushes `master`

#### Scenario: Create a task without a description

- **WHEN** the user enters the name `Pay the bill` and an empty or whitespace-only description and activates Create
- **THEN** the sheet closes, a new open task named `Pay the bill` appears immediately, and the app creates and commits an empty root file named `Pay the bill` and pushes `master`

#### Scenario: Markdown extension is not duplicated

- **WHEN** the user enters the name `Buy groceries.md` with a non-empty description
- **THEN** the app creates a root file named `Buy groceries.md`, not `Buy groceries.md.md`

#### Scenario: Trailing extension is removed for a plain task

- **WHEN** the user enters the name `Buy groceries.md` with an empty description
- **THEN** the app creates a plain root file named `Buy groceries`

#### Scenario: Surrounding whitespace is trimmed

- **WHEN** the user enters `  Buy groceries  ` as the name
- **THEN** the app creates the task using the trimmed name `Buy groceries`

#### Scenario: New task appears newest first

- **WHEN** a task is accepted successfully
- **THEN** the sheet closes and the new open task appears at the top of the list before the background sync finishes

### Requirement: Validate names and resolve conflicts

The app SHALL reject a trimmed name that is empty, contains `/` or `\`, or is `.` or `..`, without creating or committing a file, and SHALL show an inline error in the sheet. When the candidate name without its final extension matches the display name of an existing open or completed task, ignoring case, the app SHALL append a numeric suffix (` 2`, ` 3`, ...) to the base name before the extension until the name is unique.

#### Scenario: Empty name is rejected

- **WHEN** the user activates Create with an empty or whitespace-only name
- **THEN** the app keeps the sheet open, shows a readable inline error, and does not create a file or commit

#### Scenario: Path separators are rejected

- **WHEN** the user enters a name containing `/` or `\`
- **THEN** the app keeps the sheet open, shows a readable inline error, and does not create a file or commit

#### Scenario: Duplicate open task is suffixed

- **WHEN** an open task named `Buy groceries` exists and the user creates another task with the same name
- **THEN** the app creates the new file as `Buy groceries 2.md` instead of overwriting or duplicating the display name

#### Scenario: Duplicate completed task is suffixed

- **WHEN** a completed task named `Pay the bill` exists in `archived/` and the user creates another task with the same name
- **THEN** the app creates the new file as `Pay the bill 2.md` in the repository root

#### Scenario: Suffix keeps increasing

- **WHEN** tasks named `Buy groceries` and `Buy groceries 2` already exist and the user creates another task with the same base name
- **THEN** the app creates `Buy groceries 3.md`

#### Scenario: Names that differ only by extension conflict

- **WHEN** a file named `Buy groceries` exists and the user creates a task named `Buy groceries.md` with a description
- **THEN** the app treats the names as conflicting and creates `Buy groceries 2.md`

### Requirement: Keep a task created without network access

If the file is committed but the push fails, the app SHALL keep the local commit and file, keep the new task in the list, and display a readable sync error. The pending creation commit SHALL be pushed by a later refresh before pulling. The sheet SHALL already have closed when the task was accepted.

#### Scenario: Create while offline

- **WHEN** the user creates a task and the push fails because the network is unavailable
- **THEN** the task remains visible, and a readable error says it was saved but not pushed

#### Scenario: Reconnect and refresh

- **WHEN** a task was created locally but not pushed and the user refreshes after connectivity returns
- **THEN** the app pushes the pending creation commit before pulling and does not create a duplicate task

#### Scenario: Creation without an existing checkout

- **WHEN** the user tries to create a task before any checkout exists, as on a first launch with no network
- **THEN** the optimistic task is removed and a readable error is shown without creating a file or commit

### Requirement: Roll back a task that cannot be created

If writing, staging, or committing the new file fails, the app SHALL remove the optimistic task from the list, remove any partial file and staged index entry, SHALL NOT leave a commit, and SHALL show a readable error. A Create action activated while another task operation is running SHALL be queued rather than rejected.

#### Scenario: Commit failure is rolled back

- **WHEN** writing or committing a new task fails
- **THEN** the optimistic task disappears, no new task file or commit remains, and a readable error is shown

#### Scenario: Repeated Create taps do not duplicate

- **WHEN** the user activates Create repeatedly while earlier creations are still syncing
- **THEN** the app queues one task per activation and does not commit a duplicate for a single activation

### Requirement: Dismiss the task creation sheet

The sheet SHALL close without creating anything when the user taps a close control, taps the backdrop outside the sheet, or uses the Android back action, and any entered text SHALL be discarded. The sheet SHALL also close as soon as a valid Create action is accepted, whether or not the background commit or push has finished.

#### Scenario: Close without creating

- **WHEN** the user enters text and dismisses the sheet with the close control or backdrop
- **THEN** the sheet closes and no file or commit is created

#### Scenario: Android back dismisses

- **WHEN** the sheet is open on Android and the user presses back
- **THEN** the sheet closes without creating a task

#### Scenario: Sheet closes after local save

- **WHEN** the user activates Create with valid input and the task is accepted optimistically
- **THEN** the sheet closes immediately, before the background commit and push finish

### Requirement: Open the task edit sheet

The app SHALL open the edit sheet when the user holds a task row. A normal tap SHALL continue to toggle completion and SHALL NOT open the edit sheet. Every open or completed task SHALL be editable. Before opening, the app SHALL read the task file and prefill the name field with the task's display name and the description field with its exact UTF-8 content. The sheet SHALL use the same bottom-half modal layout, fields, and close controls as the creation sheet and SHALL add Save and Delete actions.

#### Scenario: Holding a row opens the edit sheet

- **WHEN** the user holds an open task row
- **THEN** the edit sheet appears over the list with the task name and description prefilled

#### Scenario: Tap still toggles completion

- **WHEN** the user taps a task row without holding it
- **THEN** the task's completion state toggles and the edit sheet does not open

#### Scenario: Completed task can be edited

- **WHEN** the user holds a completed task row in `archived/`
- **THEN** the edit sheet opens with that task's name and description prefilled

#### Scenario: Multiline content is prefilled exactly

- **WHEN** the user opens the edit sheet for a task whose file contains several lines and trailing whitespace
- **THEN** the description field contains the exact file content

#### Scenario: Holding does not also toggle

- **WHEN** the user holds a row long enough to open the edit sheet
- **THEN** the task's completion state does not change

#### Scenario: Unreadable task

- **WHEN** the task file cannot be read
- **THEN** the app shows a readable error, does not open the edit sheet, and leaves the task unchanged

#### Scenario: Busy operations block editing

- **WHEN** a load or refresh is running and the user holds a row
- **THEN** the edit sheet does not open and no task is changed

### Requirement: Save edited task

When the user activates Save with valid input, the app SHALL apply the same trimmed-name validation, `.md`/plain naming, and case-insensitive duplicate suffixing rules as creation, excluding the task being edited from conflict detection. It SHALL update the displayed task immediately, close the sheet, and run writing, renaming, committing, and pushing in the background. An open task SHALL remain in the repository root, a completed task SHALL remain in `archived/`, and the change SHALL be committed with the configured app identity and pushed to `master`.

#### Scenario: Update only the description

- **WHEN** the user changes the description and activates Save
- **THEN** the sheet closes, the task stays in place, and the app writes the new content and commits and pushes it in the background

#### Scenario: Rename an open task

- **WHEN** the user changes the name of an open task and activates Save
- **THEN** the sheet closes, the list shows the new display name immediately, and the app removes the old root file and commits and pushes a new root file in the background

#### Scenario: Rename a completed task

- **WHEN** the user changes the name of a completed task and activates Save
- **THEN** the sheet closes, the list shows the new display name immediately, and the app commits and pushes the renamed file inside `archived/`

#### Scenario: Description added to a plain task

- **WHEN** the user adds a non-whitespace description to a plain task and activates Save
- **THEN** the task file becomes `<name>.md` with that content while keeping the same display name and completion state

#### Scenario: Description cleared from a markdown task

- **WHEN** the user clears the description of a `.md` task and activates Save
- **THEN** the task file becomes an empty plain file named `<name>` while keeping the same display name and completion state

#### Scenario: Edited name conflicts with another task

- **WHEN** the edited name matches another open or completed task's display name, ignoring case
- **THEN** the app appends ` 2`, ` 3`, ... until the name is unique, ignoring the task being edited

#### Scenario: Invalid edited name is rejected

- **WHEN** the user activates Save with an empty, path-containing, `.` or `..` name
- **THEN** the sheet stays open, shows an inline error, and no file or commit changes

#### Scenario: Saving without changes

- **WHEN** the user activates Save without changing the name or description
- **THEN** the sheet closes and no new commit is created

### Requirement: Delete a task

The app SHALL provide a Delete action at the bottom of the edit sheet. Activating it SHALL remove the task from the displayed list immediately, close the sheet, and run file removal, commit, and push in the background. Delete SHALL apply to open and completed tasks.

#### Scenario: Delete an open task

- **WHEN** the user opens an open task and activates Delete
- **THEN** the sheet closes, the task disappears from the list immediately, and the app removes and commits the root file and pushes `master` in the background

#### Scenario: Delete a completed task

- **WHEN** the user opens a completed task and activates Delete
- **THEN** the sheet closes, the task disappears from the list immediately, and the app removes and commits the `archived/` file and pushes `master` in the background

### Requirement: Keep edits and deletions without network access

If a save or delete is committed but the push fails, the app SHALL keep the local commit and the displayed change, show a readable sync error, and push the pending commit on a later refresh before pulling. If no checkout exists, the operation SHALL fail without changing the repository and the optimistic change SHALL be reverted with a readable error.

#### Scenario: Edit while offline

- **WHEN** the user saves an edit and the push fails because the network is unavailable
- **THEN** the edited task stays updated locally and a readable error says it was saved but not pushed

#### Scenario: Delete while offline

- **WHEN** the user deletes a task and the push fails because the network is unavailable
- **THEN** the task stays gone locally and a readable error says it was deleted but not pushed

#### Scenario: Reconnect and refresh

- **WHEN** an edit or deletion was committed locally but not pushed and the user refreshes after connectivity returns
- **THEN** the app pushes the pending commit before pulling and does not duplicate the edit or restore the deleted task

#### Scenario: Operation without an existing checkout

- **WHEN** the user tries to save or delete before any checkout exists
- **THEN** the optimistic change is reverted, a readable error is shown, and no file or commit is created

### Requirement: Roll back a failed edit or deletion

If writing, renaming, staging, or committing an edit or deletion fails, the app SHALL restore the task to its original displayed name, location, and content, SHALL NOT leave a commit or staged change, and SHALL show a readable error. A Save or Delete activated while another task operation is running SHALL be queued rather than rejected.

#### Scenario: Save failure is rolled back

- **WHEN** writing, renaming, or committing an edited task fails
- **THEN** the original display name, location, and content return and a readable error is shown

#### Scenario: Delete failure is rolled back

- **WHEN** removing or committing the deletion of a task fails
- **THEN** the task reappears at its original path with its original content and a readable error is shown

#### Scenario: Repeated Save taps do not duplicate work

- **WHEN** the user activates Save repeatedly while earlier saves are still syncing
- **THEN** the app queues one save per activation and does not create duplicate tasks or commits for a single activation

#### Scenario: Repeated Delete taps do not duplicate work

- **WHEN** the user activates Delete repeatedly while earlier deletions are still syncing
- **THEN** the app queues one deletion per activation and does not create a second commit for a single activation

### Requirement: Dismiss the task edit sheet

The edit sheet SHALL close without saving or deleting when the user taps a close control, taps the backdrop outside the sheet, or uses the Android back action, and any edited text SHALL be discarded. The sheet SHALL also close as soon as a valid Save or Delete action is accepted, whether or not the background commit or push has finished.

#### Scenario: Close without saving

- **WHEN** the user changes the fields and dismisses the edit sheet with the close control or backdrop
- **THEN** the sheet closes, no file or commit changes, and the list is unchanged

#### Scenario: Android back dismisses

- **WHEN** the edit sheet is open on Android and the user presses back
- **THEN** the sheet closes without saving or deleting

#### Scenario: Sheet closes after local save or delete

- **WHEN** a valid Save or Delete is accepted optimistically
- **THEN** the sheet closes immediately, before the background commit and push finish
