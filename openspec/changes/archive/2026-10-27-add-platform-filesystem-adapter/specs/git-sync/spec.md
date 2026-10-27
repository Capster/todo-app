# Spec Delta

## ADDED Requirements

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

## RENAMED Requirements

- FROM: `### Requirement: Mobile-only availability`
- TO: `### Requirement: Cross-platform availability`

## MODIFIED Requirements

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

### Requirement: Cross-platform availability

The app SHALL support repository checkout, task listing, refresh, and task completion on Android, iOS, and web. No platform SHALL show an unsupported-feature message for the todo list. The web build SHALL use browser storage and SHALL NOT attempt to access native device storage.

#### Scenario: Open on the web

- **WHEN** the app runs in a web browser
- **THEN** it loads the todo list from the browser-stored checkout, performs no native filesystem access, and shows no unsupported-feature message

#### Scenario: Open on mobile

- **WHEN** the app runs on Android or iOS
- **THEN** it loads the todo list from the device checkout as before
