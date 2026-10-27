# Spec Delta

## ADDED Requirements

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
