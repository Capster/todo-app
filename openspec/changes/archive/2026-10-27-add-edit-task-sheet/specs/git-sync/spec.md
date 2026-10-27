# Spec Delta

## MODIFIED Requirements

### Requirement: Cross-platform availability

The app SHALL support repository checkout, task listing, refresh, task completion, task editing, and task deletion on Android, iOS, and web. No platform SHALL show an unsupported-feature message for the todo list. The web build SHALL use browser storage and SHALL NOT attempt to access native device storage.

#### Scenario: Open on the web

- **WHEN** the app runs in a web browser
- **THEN** it loads the todo list from the browser-stored checkout, performs no native filesystem access, and shows no unsupported-feature message

#### Scenario: Open on mobile

- **WHEN** the app runs on Android or iOS
- **THEN** it loads the todo list from the device checkout as before

#### Scenario: Edit and delete on the web

- **WHEN** the user saves or deletes a task in a browser
- **THEN** the operation updates the browser-stored checkout and pushes through the configured proxy

#### Scenario: Edit and delete on mobile

- **WHEN** the user saves or deletes a task on Android or iOS
- **THEN** the operation updates the device checkout and pushes without a proxy

## ADDED Requirements

### Requirement: Read a task file for editing

The app SHALL read a task file from the existing local checkout when the user opens the edit sheet, using the root path for an open task and the `archived/` path for a completed task. It SHALL decode the file as UTF-8 and return its exact content. If the checkout or file is missing or cannot be read, the operation SHALL fail with a readable, token-safe error and SHALL NOT modify the repository.

#### Scenario: Read an open task

- **WHEN** the user opens the edit sheet for an open task
- **THEN** the app reads the file at the repository root and returns its content

#### Scenario: Read a completed task

- **WHEN** the user opens the edit sheet for a completed task
- **THEN** the app reads the file inside `archived/` and returns its content

#### Scenario: Content is read exactly

- **WHEN** the file contains multiple lines and trailing whitespace
- **THEN** the returned content matches the file byte-for-byte after UTF-8 decoding

#### Scenario: File is missing

- **WHEN** the task file no longer exists at its expected path
- **THEN** the operation fails with a readable error and makes no change

#### Scenario: Checkout is required

- **WHEN** the user tries to open a task for editing and no local checkout exists
- **THEN** the operation fails with a readable error and does not create a checkout

### Requirement: Save an existing task file atomically

The app SHALL update or rename an existing task file in one commit on `master` with the configured app identity. Content changes SHALL be written exactly. A completed task's file SHALL remain inside `archived/`, and an open task's file SHALL remain at the repository root. It SHALL reject a destination path other than the task's current path when a file already exists there. If writing, staging, or committing fails, the app SHALL restore the original file path and content and SHALL leave no commit or staged change.

#### Scenario: Content update keeps the path

- **WHEN** the edited task keeps its file name and location
- **THEN** the file content is replaced, staged, and committed on `master` with the configured author identity

#### Scenario: Rename updates the path

- **WHEN** the edited task has a new file name
- **THEN** the destination file is written with the edited content, the source file is removed, both path changes are staged, and one commit is created

#### Scenario: Completed task stays archived

- **WHEN** the edited task is completed
- **THEN** the committed file remains inside `archived/`

#### Scenario: Destination is not overwritten

- **WHEN** a different file already exists at the destination path
- **THEN** the operation fails without modifying the existing file or creating a commit

#### Scenario: Failure restores the original file

- **WHEN** writing, staging, or committing the edit fails
- **THEN** the original file name, location, and content are restored, the staged entry is reset, and no commit remains

#### Scenario: Source is missing

- **WHEN** the task file no longer exists at its expected source path
- **THEN** the operation fails with a readable error and makes no change

#### Scenario: Checkout is required

- **WHEN** an edit is saved and no local checkout exists
- **THEN** the operation fails with a readable error and does not create a checkout or commit

### Requirement: Delete a task file

The app SHALL delete an existing task file from the repository root or `archived/` and commit the removal on `master` with the configured app identity. If deleting or committing fails, the app SHALL restore the original file and SHALL leave no commit or staged change.

#### Scenario: Delete an open task

- **WHEN** an open task is deleted
- **THEN** its root file is removed, staged, and committed on `master` with the configured author identity

#### Scenario: Delete a completed task

- **WHEN** a completed task is deleted
- **THEN** its `archived/` file is removed, staged, and committed on `master` with the configured author identity

#### Scenario: Failure restores the file

- **WHEN** removing or committing the deletion fails
- **THEN** the file is restored at its original path with its original content, the staged entry is reset, and no commit remains

#### Scenario: Checkout is required

- **WHEN** a task is deleted and no local checkout exists
- **THEN** the operation fails with a readable error and does not create a checkout or commit

### Requirement: Push and retry task edits and deletions

After committing a task edit or deletion, the app SHALL push `master`. If the push fails, it SHALL keep the local commit, report a readable, token-safe error, and leave the commit for a later refresh to push before pulling. Browser pushes SHALL continue to use the configured CORS proxy, and mobile pushes SHALL continue without one.

#### Scenario: Edit is pushed

- **WHEN** an edited task is committed and `master` is pushed successfully
- **THEN** the remote `master` contains the edited file name and content and the app reports success

#### Scenario: Deletion is pushed

- **WHEN** a deleted task is committed and `master` is pushed successfully
- **THEN** the remote `master` no longer contains the task file and the app reports success

#### Scenario: Push fails after an edit

- **WHEN** the commit succeeds but pushing `master` fails because of a network, authentication, or proxy error
- **THEN** the local commit remains, the app shows a readable error, and the edited file stays in the local checkout

#### Scenario: Push fails after a deletion

- **WHEN** the deletion commit succeeds but pushing `master` fails because of a network, authentication, or proxy error
- **THEN** the local commit remains, the app shows a readable error, and the deleted task stays absent from the local checkout

#### Scenario: Refresh retries the push

- **WHEN** an edit or deletion was committed locally but not pushed and the user refreshes
- **THEN** the app pushes the pending local commit before pulling `master` and does not create a second commit

#### Scenario: Token is not exposed

- **WHEN** an edit, deletion, or push fails with an authentication error
- **THEN** the reported message does not contain the GitHub token value
