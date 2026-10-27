# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Refresh by pulling down`
- TO: `### Requirement: Refresh the task list`

## MODIFIED Requirements

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
