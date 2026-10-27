# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
