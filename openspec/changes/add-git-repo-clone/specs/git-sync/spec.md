# Spec Delta

## Purpose

Keep a local checkout of the configured todo git repository on the device and expose its tracked files to the app for display.

## ADDED Requirements

### Requirement: Clone the configured repository

On mobile, when the user activates the clone control and no local checkout exists, the app SHALL clone the configured private repository's `master` branch into persistent device storage.

#### Scenario: First clone succeeds

- **WHEN** the user activates the clone control and the device has no local checkout
- **THEN** the app clones the configured repository's `master` branch and reports that the clone succeeded

#### Scenario: Clone fails

- **WHEN** the first clone cannot complete because of a network, authentication, or storage error
- **THEN** the app reports a readable error and leaves no partial checkout that a later attempt would treat as an existing repository

### Requirement: Update an existing checkout

When the user activates the clone control and a local checkout already exists, the app SHALL pull the latest `master` from the remote instead of cloning the repository again.

#### Scenario: Subsequent activation pulls

- **WHEN** the user activates the clone control and a local checkout already exists
- **THEN** the app fetches and pulls the latest `master` and reports that the update succeeded

#### Scenario: Pull fails

- **WHEN** a pull cannot complete because of a network or authentication error
- **THEN** the app reports a readable error and the previously checked-out files remain unchanged

### Requirement: Persist the checkout across restarts

The app SHALL store the checkout in persistent app storage so it remains available after the app is restarted without cloning again.

#### Scenario: Reopen the app

- **WHEN** the app is restarted after a successful clone
- **THEN** the checkout is still present and activating the clone control performs an update rather than a first clone

### Requirement: Authenticate with the embedded token

The app SHALL authenticate clone and pull requests with the configured GitHub token injected at build time and SHALL NOT ask the user for repository credentials.

#### Scenario: Authenticated access to the private repository

- **WHEN** the app contacts the configured private repository
- **THEN** it authenticates with the embedded token and accesses the repository without prompting the user

#### Scenario: Token is rejected

- **WHEN** the remote rejects the embedded token
- **THEN** the app reports an authentication error and does not expose the token value in the message

### Requirement: Display repository contents as a text tree

After a successful clone or pull, the app SHALL display the repository's tracked files as a plain indented text tree, excluding git internals and untracked files.

#### Scenario: Nested files are shown

- **WHEN** the checkout contains files at the repository root and inside subdirectories
- **THEN** the app shows those files as indented lines under their directory names

#### Scenario: Git internals are hidden

- **WHEN** the tree is displayed
- **THEN** no files from the `.git` directory appear in the output

### Requirement: Show progress and errors

The app SHALL show an in-progress state while cloning or pulling and SHALL display a readable error message when the operation fails, without crashing.

#### Scenario: Operation in progress

- **WHEN** a clone or pull is running
- **THEN** the app shows an in-progress state and prevents overlapping clone or pull requests

#### Scenario: Operation fails

- **WHEN** a clone or pull fails
- **THEN** the app clears the in-progress state and shows the error to the user

### Requirement: Mobile-only availability

The clone and file tree feature SHALL be available on Android and iOS. The web build SHALL state that repository checkout is unsupported and SHALL NOT attempt local filesystem operations.

#### Scenario: Open on the web

- **WHEN** the app runs in a web browser
- **THEN** the clone control reports that repository checkout is unsupported on the web

### Requirement: Fixed repository configuration

The app SHALL use one configured repository URL and the `master` branch, and SHALL NOT offer repository or branch selection in this change.

#### Scenario: No repository input required

- **WHEN** the user views the clone control
- **THEN** there is no field for a repository URL, branch, or credentials
