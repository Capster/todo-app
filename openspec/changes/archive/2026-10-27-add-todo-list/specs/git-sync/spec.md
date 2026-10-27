# Spec Delta

## MODIFIED Requirements

### Requirement: Clone the configured repository

On mobile, when the todo screen loads or the user refreshes and no local checkout exists, the app SHALL clone the configured private repository's `master` branch into persistent device storage.

#### Scenario: First clone succeeds

- **WHEN** the todo screen loads on mobile and the device has no local checkout
- **THEN** the app clones the configured repository's `master` branch and reports that the clone succeeded

#### Scenario: Clone fails

- **WHEN** the first clone cannot complete because of a network, authentication, or storage error
- **THEN** the app reports a readable error and leaves no partial checkout that a later attempt would treat as an existing repository

### Requirement: Update an existing checkout

When the todo screen loads or the user refreshes and a local checkout already exists, the app SHALL pull the latest `master` from the remote instead of cloning the repository again.

#### Scenario: Subsequent activation pulls

- **WHEN** the todo screen loads or the user refreshes and a local checkout already exists
- **THEN** the app fetches and pulls the latest `master` and reports that the update succeeded

#### Scenario: Pull fails

- **WHEN** a pull cannot complete because of a network or authentication error
- **THEN** the app reports a readable error and the previously checked-out files remain unchanged

### Requirement: Persist the checkout across restarts

The app SHALL store the checkout in persistent app storage so it remains available after the app is restarted without cloning again.

#### Scenario: Reopen the app

- **WHEN** the app is restarted after a successful clone
- **THEN** the checkout is still present and loading the app performs an update rather than a first clone

### Requirement: Authenticate with the embedded token

The app SHALL authenticate clone, pull, and push requests with the configured GitHub token injected at build time and SHALL NOT ask the user for repository credentials.

#### Scenario: Authenticated access to the private repository

- **WHEN** the app clones, pulls, or pushes to the configured private repository
- **THEN** it authenticates with the embedded token and accesses the repository without prompting the user

#### Scenario: Token is rejected

- **WHEN** the remote rejects the embedded token
- **THEN** the app reports an authentication error and does not expose the token value in the message

### Requirement: Mobile-only availability

Repository checkout, task listing, and task completion SHALL be available on Android and iOS. The web build SHALL state that the todo list is unsupported and SHALL NOT attempt local filesystem or git operations.

#### Scenario: Open on the web

- **WHEN** the app runs in a web browser
- **THEN** the app reports that the todo list is unsupported on the web and performs no checkout or task operation

### Requirement: Fixed repository configuration

The app SHALL use one configured repository URL and the `master` branch, and SHALL NOT offer repository or branch selection in this change.

#### Scenario: No repository input required

- **WHEN** the user views the todo list
- **THEN** there is no field for a repository URL, branch, or credentials

## REMOVED Requirements

### Requirement: Display repository contents as a text tree

**Reason**: The raw indented file tree is replaced by the todo-list capability, which presents the same tracked files as open and completed tasks.

**Migration**: Use the `todo-list` capability. The git-sync layer still exposes tracked file paths but no longer defines how they are rendered.
