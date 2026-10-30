# Spec Delta

## MODIFIED Requirements

### Requirement: Clone the configured repository

On Android, iOS, and web, when the todo screen loads or the user refreshes, saved git configuration is valid, and no local checkout exists, the app SHALL clone the configured repository's configured branch into persistent platform storage, using app document storage on mobile and browser IndexedDB on web. When required configuration is missing or invalid, the app SHALL NOT attempt to clone.

#### Scenario: First clone succeeds

- **WHEN** the todo screen loads on a supported platform, saved configuration is valid, and no local checkout exists
- **THEN** the app clones the configured repository's configured branch into that platform's persistent storage and reports that the clone succeeded

#### Scenario: First clone on the web

- **WHEN** the todo screen loads in a browser with valid saved configuration and the browser has no stored checkout
- **THEN** the app clones the configured branch into browser storage and renders the task list from that checkout

#### Scenario: Clone uses the configured branch

- **WHEN** the saved configuration names a branch other than the repository's default branch
- **THEN** the app clones that branch rather than the default branch

#### Scenario: Missing configuration blocks cloning

- **WHEN** the todo screen would load but required saved configuration is missing or invalid
- **THEN** the app opens the settings screen and sends no clone request

#### Scenario: Clone fails

- **WHEN** the first clone cannot complete because of a network, authentication, storage, or proxy configuration error
- **THEN** the app reports a readable error and leaves no partial checkout that a later attempt would treat as an existing repository

### Requirement: Update an existing checkout

When the todo screen loads or the user refreshes, saved git configuration is valid, and a local checkout created for that same repository URL and branch already exists, the app SHALL pull the latest configured branch from the remote instead of cloning the repository again. A checkout created for a different repository URL or branch SHALL NOT be updated or displayed for the current configuration.

#### Scenario: Subsequent activation pulls

- **WHEN** the todo screen loads or the user refreshes on any supported platform and a matching local checkout already exists
- **THEN** the app fetches and pulls the latest configured branch and reports that the update succeeded

#### Scenario: Pull uses the configured branch

- **WHEN** the saved configuration names a branch other than the repository's default branch and a matching checkout exists
- **THEN** the app pulls that branch

#### Scenario: Checkout from another configuration is not reused

- **WHEN** the saved repository URL or branch differs from the configuration that produced the local checkout
- **THEN** the app does not pull the old checkout and requires Clone to replace it

#### Scenario: Pull fails

- **WHEN** a pull cannot complete because of a network, authentication, or proxy configuration error
- **THEN** the app reports a readable error and the previously checked-out files remain unchanged

### Requirement: Authenticate with the saved token

The app SHALL authenticate clone, pull, and push requests with the token saved in the settings screen. It SHALL NOT embed a token at build time and SHALL NOT ask the user for repository credentials on the todo screen. The token SHALL be used only for git authentication and SHALL NOT appear in user-facing errors or logs.

#### Scenario: Authenticated access to the private repository

- **WHEN** the app clones, pulls, or pushes to the configured repository
- **THEN** it authenticates with the saved token and accesses the repository without prompting on the todo screen

#### Scenario: Token is rejected

- **WHEN** the remote rejects the saved token
- **THEN** the app reports an authentication error and does not expose the token value in the message

#### Scenario: Missing token blocks network access

- **WHEN** a clone, pull, or push would start and no token is saved
- **THEN** the app reports a readable configuration error and sends no request to the remote or proxy

#### Scenario: Token is not built into the app

- **WHEN** the application bundle and tracked source are inspected
- **THEN** no user's git token is embedded at build time

## RENAMED Requirements

- FROM: `### Requirement: Authenticate with the embedded token`
- TO: `### Requirement: Authenticate with the saved token`

## REMOVED Requirements

### Requirement: Fixed repository configuration

**Reason**: The fixed repository URL and branch are replaced by user-provided configuration saved from the settings screen.

**Migration**: Existing users enter the repository URL, branch, and token on the settings screen. Repository and branch selection are now supported, and the root `token` file is no longer used by the app.
