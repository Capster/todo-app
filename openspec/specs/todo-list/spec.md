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

### Requirement: Toggle task completion

The app SHALL provide a checkbox per task that reflects whether the task is complete. Checking an open task SHALL move its file from the repository root into `archived/`. Unchecking a completed task SHALL move its file from `archived/` back to the repository root. The file name and content SHALL be preserved. Each successful change SHALL be committed with the configured app author identity and pushed to `master`. This behavior SHALL apply on Android, iOS, and web.

#### Scenario: Mark a task complete

- **WHEN** the user checks the checkbox of an open task
- **THEN** the app moves the task file into `archived/`, commits the move, pushes `master`, and shows the task as completed

#### Scenario: Mark a task incomplete

- **WHEN** the user unchecks the checkbox of a completed task
- **THEN** the app moves the task file back to the repository root, commits the move, pushes `master`, and shows the task as open

#### Scenario: Toggle on the web

- **WHEN** the user checks or unchecks a task in a browser
- **THEN** the app moves the file in the browser-stored checkout, commits the change, pushes `master` through the configured proxy, and updates the list

#### Scenario: File content is preserved

- **WHEN** a task file is moved between the root and `archived/`
- **THEN** its file name and content are unchanged

#### Scenario: Destination name already exists

- **WHEN** moving a task would overwrite an existing file at the destination
- **THEN** the app leaves the task in its original location, shows a readable error, and does not create a commit

### Requirement: Handle toggle failures

If the move or commit fails, the app SHALL restore the task to its original location and state. If the commit succeeds but the push fails, the app SHALL keep the local commit, report a readable error, and retry the push on the next refresh.

#### Scenario: Move or commit fails

- **WHEN** moving or committing a completion change fails
- **THEN** the task remains in its original location with its original checkbox state and the app shows a readable error

#### Scenario: Push fails after commit

- **WHEN** the commit succeeds but pushing `master` fails
- **THEN** the app keeps the completed change locally, shows a readable error, and pushes it on the next refresh

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

When the user activates Create with valid input, the app SHALL create one open task file directly in the repository root, write the description as the file content, commit the new file with the configured app identity, and push `master`. The entered name SHALL be trimmed before use. The description SHALL be treated as empty when it contains only whitespace.

#### Scenario: Create a task with a description

- **WHEN** the user enters the name `Buy groceries` and a non-empty description and activates Create
- **THEN** the app creates a root file named `Buy groceries.md` whose content is the entered description, commits it, pushes `master`, and shows a new open task named `Buy groceries`

#### Scenario: Create a task without a description

- **WHEN** the user enters the name `Pay the bill` and an empty or whitespace-only description and activates Create
- **THEN** the app creates an empty root file named `Pay the bill`, commits it, pushes `master`, and shows a new open task named `Pay the bill`

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

- **WHEN** a task is created successfully
- **THEN** the sheet closes and the new open task appears at the top of the list because its creation commit is the newest

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

If the file is committed but the push fails, the app SHALL keep the local commit and file, close the sheet, show the new task in the list, and display a readable sync error. The pending creation commit SHALL be pushed by a later refresh before pulling.

#### Scenario: Create while offline

- **WHEN** the user creates a task and the push fails because the network is unavailable
- **THEN** the sheet closes, the task appears locally, and a readable error says it was saved but not pushed

#### Scenario: Reconnect and refresh

- **WHEN** a task was created locally but not pushed and the user refreshes after connectivity returns
- **THEN** the app pushes the pending creation commit before pulling and does not create a duplicate task

#### Scenario: Creation without an existing checkout

- **WHEN** the user tries to create a task before any checkout exists, as on a first launch with no network
- **THEN** the app keeps the sheet open and shows a readable error without creating a file or commit

### Requirement: Roll back a task that cannot be created

If writing, staging, or committing the new file fails, the app SHALL remove the partial file and any staged index entry, SHALL NOT leave a commit, SHALL keep the sheet open, and SHALL show a readable error. If the Create action is activated while another task operation is running, the app SHALL reject the attempt without creating a file.

#### Scenario: Commit failure is rolled back

- **WHEN** writing or committing a new task fails
- **THEN** no new task file or commit remains and the sheet stays open with a readable error

#### Scenario: Repeated Create taps do not duplicate

- **WHEN** the user activates Create repeatedly while the first creation is still running
- **THEN** the app creates at most one task and does not commit a duplicate

### Requirement: Dismiss the task creation sheet

The sheet SHALL close without creating anything when the user taps a close control, taps the backdrop outside the sheet, or uses the Android back action, and any entered text SHALL be discarded. The sheet SHALL also close after a task is created locally, whether or not the push succeeded.

#### Scenario: Close without creating

- **WHEN** the user enters text and dismisses the sheet with the close control or backdrop
- **THEN** the sheet closes and no file or commit is created

#### Scenario: Android back dismisses

- **WHEN** the sheet is open on Android and the user presses back
- **THEN** the sheet closes without creating a task

#### Scenario: Sheet closes after local save

- **WHEN** the file was committed locally but could not be pushed
- **THEN** the sheet closes and the task remains visible in the list

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

- **WHEN** another task operation is running and the user holds a row
- **THEN** the edit sheet does not open and no task is changed

### Requirement: Save edited task

When the user activates Save with valid input, the app SHALL apply the same trimmed-name validation, `.md`/plain naming, and case-insensitive duplicate suffixing rules as creation, excluding the task being edited from conflict detection. It SHALL write the description as the file content and rename the file when needed. An open task SHALL remain in the repository root and a completed task SHALL remain in `archived/`. The change SHALL be committed with the configured app identity, pushed to `master`, close the sheet, and update the list.

#### Scenario: Update only the description

- **WHEN** the user changes the description and activates Save
- **THEN** the task file keeps its name and location, receives the new content, is committed and pushed, and the task keeps its completion state and list position

#### Scenario: Rename an open task

- **WHEN** the user changes the name of an open task and activates Save
- **THEN** the old root file is removed, a new root file with the edited name is committed and pushed, and the list shows the new display name

#### Scenario: Rename a completed task

- **WHEN** the user changes the name of a completed task and activates Save
- **THEN** the old `archived/` file is removed, a new file with the edited name is committed in `archived/`, and the task remains completed

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

The app SHALL provide a Delete action at the bottom of the edit sheet. Activating it SHALL permanently remove the task file from the repository root or `archived/`, commit the removal with the configured app identity, push `master`, close the sheet, and remove the task from the list. Delete SHALL apply to open and completed tasks.

#### Scenario: Delete an open task

- **WHEN** the user opens an open task and activates Delete
- **THEN** the file is removed, the removal is committed and pushed, the sheet closes, and the task disappears from the list

#### Scenario: Delete a completed task

- **WHEN** the user opens a completed task and activates Delete
- **THEN** the file is removed from `archived/`, the removal is committed and pushed, the sheet closes, and the task disappears from the list

### Requirement: Keep edits and deletions without network access

If a save or delete is committed but the push fails, the app SHALL keep the local commit, close the sheet, show the updated list, and display a readable sync error. The pending commit SHALL be pushed by a later refresh before pulling. If no checkout exists, the operation SHALL fail without changing the repository and the sheet SHALL stay open with a readable error.

#### Scenario: Edit while offline

- **WHEN** the user saves an edit and the push fails because the network is unavailable
- **THEN** the sheet closes, the edited task appears locally, and a readable error says it was saved but not pushed

#### Scenario: Delete while offline

- **WHEN** the user deletes a task and the push fails because the network is unavailable
- **THEN** the sheet closes, the task is gone locally, and a readable error says it was deleted but not pushed

#### Scenario: Reconnect and refresh

- **WHEN** an edit or deletion was committed locally but not pushed and the user refreshes after connectivity returns
- **THEN** the app pushes the pending commit before pulling and does not duplicate the edit or restore the deleted task

#### Scenario: Operation without an existing checkout

- **WHEN** the user tries to save or delete before any checkout exists
- **THEN** the sheet stays open, shows a readable error, and no file or commit is created

### Requirement: Roll back a failed edit or deletion

If reading, writing, renaming, staging, or committing an edit or deletion fails, the app SHALL restore the task file to its original path and content, SHALL NOT leave a commit or staged change, SHALL keep the edit sheet open, and SHALL show a readable error. If Save or Delete is activated while another task operation is running, the app SHALL reject the attempt without changing the repository.

#### Scenario: Save failure is rolled back

- **WHEN** writing, renaming, or committing an edited task fails
- **THEN** the original file name, location, and content remain and the sheet stays open with a readable error

#### Scenario: Delete failure is rolled back

- **WHEN** removing or committing the deletion of a task fails
- **THEN** the task file remains at its original path with its original content and the sheet stays open with a readable error

#### Scenario: Repeated Save taps do not duplicate work

- **WHEN** the user activates Save repeatedly while the first save is still running
- **THEN** the app performs at most one save and does not create a duplicate task or commit

#### Scenario: Repeated Delete taps do not duplicate work

- **WHEN** the user activates Delete repeatedly while the deletion is still running
- **THEN** the app performs at most one deletion and does not create a second commit

### Requirement: Dismiss the task edit sheet

The edit sheet SHALL close without saving or deleting when the user taps a close control, taps the backdrop outside the sheet, or uses the Android back action, and any edited text SHALL be discarded. The sheet SHALL also close after an edit or deletion commits locally, whether or not the push succeeded.

#### Scenario: Close without saving

- **WHEN** the user changes the fields and dismisses the edit sheet with the close control or backdrop
- **THEN** the sheet closes, no file or commit changes, and the list is unchanged

#### Scenario: Android back dismisses

- **WHEN** the edit sheet is open on Android and the user presses back
- **THEN** the sheet closes without saving or deleting

#### Scenario: Sheet closes after local save or delete

- **WHEN** an edit or deletion is committed locally but could not be pushed
- **THEN** the sheet closes and the updated list remains visible
