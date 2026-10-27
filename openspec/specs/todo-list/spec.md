# todo-list Specification

## Purpose

Turn the files tracked in the todo repository into one checklist of open and completed tasks, ordered by when each task was created, with completion toggled by moving, committing, and pushing task files.

## Requirements

### Requirement: Derive tasks from tracked files

The app SHALL derive tasks from tracked files in the local checkout. A file directly in the repository root SHALL be an open task, and a file directly inside `archived/` SHALL be a completed task. Other paths SHALL be ignored. A task's display name SHALL be its file name with the final extension removed, and file contents SHALL NOT be read.

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
