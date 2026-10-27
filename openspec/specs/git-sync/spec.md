# git-sync Specification

## Purpose

Keep a local checkout of the configured todo git repository on the device and expose its tracked files to the app for display.

## Requirements

### Requirement: Clone the configured repository

On Android, iOS, and web, when the todo screen loads or the user refreshes and no local checkout exists, the app SHALL clone the configured private repository's `master` branch into persistent platform storage, using app document storage on mobile and browser IndexedDB on web.

#### Scenario: First clone succeeds

- **WHEN** the todo screen loads on a supported platform and no local checkout exists
- **THEN** the app clones the configured repository's `master` branch into that platform's persistent storage and reports that the clone succeeded

#### Scenario: First clone on the web

- **WHEN** the todo screen loads in a browser and the browser has no stored checkout
- **THEN** the app clones `master` into browser storage and renders the task list from that checkout

#### Scenario: Clone fails

- **WHEN** the first clone cannot complete because of a network, authentication, storage, or proxy configuration error
- **THEN** the app reports a readable error and leaves no partial checkout that a later attempt would treat as an existing repository

### Requirement: Update an existing checkout

When the todo screen loads or the user refreshes and a local checkout already exists, the app SHALL pull the latest `master` from the remote instead of cloning the repository again.

#### Scenario: Subsequent activation pulls

- **WHEN** the todo screen loads or the user refreshes on any supported platform and a local checkout already exists
- **THEN** the app fetches and pulls the latest `master` and reports that the update succeeded

#### Scenario: Pull fails

- **WHEN** a pull cannot complete because of a network, authentication, or proxy configuration error
- **THEN** the app reports a readable error and the previously checked-out files remain unchanged

### Requirement: Persist the checkout across restarts

The app SHALL store the checkout in persistent platform storage so it remains available after the mobile app is restarted or the web page is reloaded without cloning again.

#### Scenario: Reopen the app

- **WHEN** the app is restarted after a successful clone on Android or iOS
- **THEN** the checkout is still present and loading the app performs an update rather than a first clone

#### Scenario: Reload the web page

- **WHEN** a browser page is reloaded after a successful clone
- **THEN** the checkout is still present in browser storage and loading the app performs an update rather than a first clone

### Requirement: Require a CORS proxy for web git operations

The app SHALL route browser clone, pull, and push requests through a CORS proxy configured at build time. It SHALL NOT use a public proxy by default. When the app runs on the web and no proxy is configured, git network operations SHALL fail with a readable configuration error that does not reveal the token.

#### Scenario: Web operation with a configured proxy

- **WHEN** a web git network operation runs and a CORS proxy is configured
- **THEN** the request is sent through that proxy

#### Scenario: Web operation without a proxy

- **WHEN** a web clone, pull, or push starts and no CORS proxy is configured
- **THEN** the app reports a readable configuration error and does not send the token to a proxy or to GitHub

#### Scenario: Mobile operation does not require a proxy

- **WHEN** a clone, pull, or push runs on Android or iOS
- **THEN** the operation proceeds without a CORS proxy

### Requirement: Authenticate with the embedded token

The app SHALL authenticate clone, pull, and push requests with the configured GitHub token injected at build time and SHALL NOT ask the user for repository credentials.

#### Scenario: Authenticated access to the private repository

- **WHEN** the app clones, pulls, or pushes to the configured private repository
- **THEN** it authenticates with the embedded token and accesses the repository without prompting the user

#### Scenario: Token is rejected

- **WHEN** the remote rejects the embedded token
- **THEN** the app reports an authentication error and does not expose the token value in the message

### Requirement: Show progress and errors

The app SHALL show an in-progress state while cloning or pulling and SHALL display a readable error message when the operation fails, without crashing.

#### Scenario: Operation in progress

- **WHEN** a clone or pull is running
- **THEN** the app shows an in-progress state and prevents overlapping clone or pull requests

#### Scenario: Operation fails

- **WHEN** a clone or pull fails
- **THEN** the app clears the in-progress state and shows the error to the user

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

### Requirement: Fixed repository configuration

The app SHALL use one configured repository URL and the `master` branch, and SHALL NOT offer repository or branch selection in this change.

#### Scenario: No repository input required

- **WHEN** the user views the todo list
- **THEN** there is no field for a repository URL, branch, or credentials

### Requirement: Write and commit a new task file

The app SHALL create a new task file directly in the repository root of an existing local checkout, write the supplied description as its UTF-8 content, stage it, and commit it on `master` with the configured app author identity. It SHALL NOT overwrite an existing file at the root or `archived/` path. An operation that fails before the commit completes SHALL leave no task file, staged entry, or commit behind.

#### Scenario: New file is committed

- **WHEN** task creation runs in an existing checkout with no conflicting file
- **THEN** the file is written at the repository root, staged, and committed on `master` with the configured author identity

#### Scenario: Content is written exactly

- **WHEN** the description contains multiple lines and trailing whitespace
- **THEN** the committed file content matches the supplied description exactly

#### Scenario: Existing file is not overwritten

- **WHEN** the chosen file name already exists at the root or in `archived/`
- **THEN** the operation fails without modifying the existing file or creating a commit

#### Scenario: Checkout is required

- **WHEN** task creation runs and no local checkout exists
- **THEN** the operation fails with a readable error and does not create a checkout or a commit

#### Scenario: Failure leaves no partial change

- **WHEN** writing, staging, or committing the new file fails
- **THEN** the app removes the partial file and staged entry and leaves no commit

### Requirement: Push and retry a newly created task

After committing a new task file, the app SHALL push `master`. If the push fails, it SHALL keep the local commit, report a readable error without exposing the token, and leave the commit for a later refresh to push before pulling. Browser pushes SHALL continue to use the configured CORS proxy, and mobile pushes SHALL continue without one.

#### Scenario: Push succeeds

- **WHEN** a new task is committed and `master` is pushed successfully
- **THEN** the remote `master` contains the new task file and the app reports success

#### Scenario: Push fails after commit

- **WHEN** the commit succeeds but pushing `master` fails because of a network, authentication, or proxy error
- **THEN** the local commit remains, the app shows a readable error, and the file stays in the local checkout

#### Scenario: Refresh retries the push

- **WHEN** a previous task creation committed locally but did not push and the user refreshes
- **THEN** the app pushes the pending local commit before pulling `master` and does not create a second commit for that task

#### Scenario: Token is not exposed

- **WHEN** a creation commit or push fails with an authentication error
- **THEN** the reported message does not contain the GitHub token value

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
