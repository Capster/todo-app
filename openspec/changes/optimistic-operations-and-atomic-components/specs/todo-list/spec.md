# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
