# git-settings Specification

## Purpose

Let a user supply, validate, and persist the git repository, branch, credentials, and optional commit identity, and use that configuration to onboard or reconfigure the app.

## Requirements

### Requirement: Configure git connection settings

The settings screen SHALL provide fields for repository URL, branch, token, author name, and author email. All five fields SHALL be empty on a first launch with no saved configuration. Previously saved values SHALL be loaded when the screen opens, with the token shown as a masked value. Author name and author email SHALL be optional.

#### Scenario: First launch shows empty fields

- **WHEN** the settings screen opens and no configuration has ever been saved
- **THEN** the repository URL, branch, token, author name, and author email fields are empty

#### Scenario: Saved values are loaded

- **WHEN** the settings screen opens after configuration was saved
- **THEN** the repository URL, branch, author name, and author email fields show the saved values

#### Scenario: Token is masked

- **WHEN** a saved token is loaded into the settings screen
- **THEN** the token field displays a masked value rather than the token text

#### Scenario: Author fields are optional

- **WHEN** the user leaves the author name and author email empty and provides the other fields
- **THEN** the configuration is accepted

### Requirement: Validate git configuration

When the user activates Save or Clone, the app SHALL trim entered values and reject the configuration if the repository URL is empty or is not an absolute `http` or `https` URL, if the branch is empty, contains whitespace or control characters, starts with `-`, or contains `..`, or if the token is empty. Rejection SHALL show a readable inline error and SHALL NOT overwrite saved configuration or start a git operation.

#### Scenario: Empty repository URL is rejected

- **WHEN** the user activates Save or Clone with an empty repository URL
- **THEN** the screen shows an inline error and no configuration is saved

#### Scenario: Malformed repository URL is rejected

- **WHEN** the user enters a repository value that is not an absolute `http` or `https` URL
- **THEN** the screen shows an inline error and no git operation starts

#### Scenario: Empty branch is rejected

- **WHEN** the user activates Save or Clone with an empty or whitespace-only branch
- **THEN** the screen shows an inline error and no configuration is saved

#### Scenario: Invalid branch name is rejected

- **WHEN** the branch contains whitespace or control characters, starts with `-`, or contains `..`
- **THEN** the screen shows an inline error and no git operation starts

#### Scenario: Empty token is rejected

- **WHEN** the user activates Save or Clone with an empty or whitespace-only token
- **THEN** the screen shows an inline error and no configuration is saved

#### Scenario: Invalid input preserves saved configuration

- **WHEN** saved configuration exists and the user submits invalid values
- **THEN** the previously saved configuration remains in use and unchanged

### Requirement: Save configuration without contacting the remote

When the user activates Save with valid values, the app SHALL persist the repository URL, branch, optional author identity, and token and SHALL NOT clone, pull, push, or otherwise contact the remote. It SHALL return to the home route when no checkout exists or when the existing checkout matches the saved configuration. When an existing checkout belongs to a different configuration, it SHALL remain on the settings screen and indicate that Clone is required to replace that checkout.

#### Scenario: Save persists values

- **WHEN** the user enters valid values and activates Save
- **THEN** the values are persisted and remain available after the app restarts or the browser reloads

#### Scenario: Save works offline

- **WHEN** the user activates Save while no network is available
- **THEN** the configuration is persisted without a network error

#### Scenario: Save returns to the list when the checkout matches

- **WHEN** the user activates Save with valid values and no checkout exists or the existing checkout already matches the saved configuration
- **THEN** the app navigates from the settings screen to the home route

#### Scenario: Save with a mismatched checkout stays on settings

- **WHEN** the user activates Save with valid values and an existing checkout was created for a different repository URL or branch
- **THEN** the app stays on the settings screen, does not pull or display the old checkout, and indicates that Clone is required

### Requirement: Store the token securely

The app SHALL store the token in platform secure credential storage on Android and iOS and in browser local storage on web. The token SHALL NOT be written to tracked source, build-time configuration, logs, or error messages, and SHALL be used only to authenticate git operations. On web, the token SHALL persist across page reloads and SHALL be removed when the user clears site data.

#### Scenario: Native token storage

- **WHEN** the user saves a token on Android or iOS
- **THEN** the token is stored in the platform's secure credential storage

#### Scenario: Web token persistence

- **WHEN** the user saves a token in a browser and reloads the page
- **THEN** the token is still available from browser local storage

#### Scenario: Token is not embedded at build time

- **WHEN** the application bundle and tracked source are inspected
- **THEN** they do not contain a user's saved token

#### Scenario: Token is absent from errors and logs

- **WHEN** a git operation fails with an authentication or network error
- **THEN** the displayed error and logs do not contain the token value

### Requirement: Require configuration before loading tasks

On launch, the app SHALL open the settings route instead of the task list when required git configuration is missing or invalid. It SHALL NOT attempt to clone, pull, or display a task list in that case. When required configuration is saved and valid, the app SHALL open the home route.

#### Scenario: First launch opens settings

- **WHEN** the app starts with no saved configuration
- **THEN** the settings screen opens and no clone or pull is attempted

#### Scenario: Partial configuration opens settings

- **WHEN** the app starts with only some required values saved
- **THEN** the settings screen opens and no clone or pull is attempted

#### Scenario: Invalid configuration opens settings

- **WHEN** the app starts with saved values that fail configuration validation
- **THEN** the settings screen opens and no clone or pull is attempted

#### Scenario: Valid configuration opens the list

- **WHEN** the app starts with valid saved configuration
- **THEN** the home route opens and the task list loads normally

#### Scenario: Home route cannot bypass onboarding

- **WHEN** the home route is opened while required configuration is missing or invalid
- **THEN** the app redirects to the settings route

### Requirement: Bind the checkout to its configuration

The app SHALL record the repository URL and branch that produced the local checkout. A checkout created for a different repository URL or branch SHALL NOT be pulled or presented as the current configuration. The app SHALL require the Clone action to replace it.

#### Scenario: Matching checkout is reused

- **WHEN** the saved repository URL and branch match the recorded checkout configuration
- **THEN** the app loads and updates that checkout

#### Scenario: Changed configuration is not mixed with the old checkout

- **WHEN** the saved repository URL or branch differs from the recorded checkout configuration
- **THEN** the app does not pull or display the old checkout for the new configuration

#### Scenario: Clone replaces the old checkout

- **WHEN** the user activates Clone after changing the repository URL or branch
- **THEN** the app replaces the old checkout with a checkout of the newly configured repository and branch

### Requirement: Clone with the saved configuration

When the user activates Clone with valid values, the app SHALL save the values first, then clone the configured repository and branch with the saved token and replace any existing local checkout. Clone SHALL run in the foreground with a visible in-progress state, SHALL prevent overlapping clone operations, and SHALL open the home route after success. On failure it SHALL show a readable token-safe error on the settings screen, leave any previous checkout unchanged, and leave no partial checkout.

#### Scenario: Clone creates the first checkout

- **WHEN** the user activates Clone with valid values and no checkout exists
- **THEN** the app clones the configured repository and branch into persistent storage and opens the task list

#### Scenario: Clone with a non-default branch

- **WHEN** the user configures a branch other than the repository's default branch and activates Clone
- **THEN** the app clones that branch

#### Scenario: Clone replaces an existing checkout

- **WHEN** a checkout already exists and the user activates Clone
- **THEN** the app replaces it with a checkout of the configured repository and branch

#### Scenario: Clone failure keeps the previous checkout

- **WHEN** Clone fails because of a network, authentication, or configuration error
- **THEN** the settings screen shows a readable error and any previous checkout remains usable

#### Scenario: Failed clone leaves no partial checkout

- **WHEN** the first clone fails before completing
- **THEN** the app leaves no partial checkout that a later attempt would treat as an existing repository

#### Scenario: Overlapping clones are prevented

- **WHEN** a clone is already running
- **THEN** the app does not start a second clone

#### Scenario: Clone requires valid configuration

- **WHEN** the user activates Clone with invalid values
- **THEN** the app does not contact the remote and shows the validation error

### Requirement: Use the configured author identity

The app SHALL use the saved author name and author email for commits. When the saved author name is blank, the app SHALL fall back to the default app author name; when the saved author email is blank, it SHALL fall back to the default app author email.

#### Scenario: Both author fields are saved

- **WHEN** the user saves both an author name and an author email and a task is committed
- **THEN** the commit uses the saved name and email

#### Scenario: Only the name is saved

- **WHEN** the user saves an author name but leaves the email blank and a task is committed
- **THEN** the commit uses the saved name and the default author email

#### Scenario: Only the email is saved

- **WHEN** the user saves an author email but leaves the name blank and a task is committed
- **THEN** the commit uses the default author name and the saved email

#### Scenario: Neither author field is saved

- **WHEN** the user leaves both author fields blank and a task is committed
- **THEN** the commit uses the default app author name and email
