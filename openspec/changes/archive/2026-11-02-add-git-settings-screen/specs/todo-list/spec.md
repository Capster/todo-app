# Spec Delta

## MODIFIED Requirements

### Requirement: Load the task list on launch

On Android, iOS, and web, when the home route opens with valid saved git configuration, the app SHALL ensure a matching local checkout by cloning when none exists or pulling when one exists, and then render the task list. While loading, the app SHALL show a loading state. A failure SHALL show a readable error without crashing and without discarding a previously rendered list. When required git configuration is missing or invalid, the app SHALL NOT load tasks and SHALL open the settings route instead.

#### Scenario: First launch clones

- **WHEN** the home route opens on a device or browser with no local checkout and valid saved configuration
- **THEN** the app clones the configured repository and branch, derives tasks, and renders the list

#### Scenario: First launch without configuration opens settings

- **WHEN** the app starts with no saved git configuration
- **THEN** the settings screen opens and the app does not clone, pull, or render a task list

#### Scenario: Later launch pulls

- **WHEN** the home route opens and a matching local checkout already exists
- **THEN** the app pulls the latest configured branch and renders the updated list

#### Scenario: Web launch uses the stored checkout

- **WHEN** the home route opens in a browser that already stored a matching checkout from an earlier session
- **THEN** the app pulls the configured branch and renders the list without cloning again

#### Scenario: Checkout from another configuration is not shown

- **WHEN** the saved repository URL or branch differs from the configuration that produced the local checkout
- **THEN** the app does not render tasks from that checkout and requires Clone to replace it

#### Scenario: Load failure

- **WHEN** cloning or pulling fails while loading
- **THEN** the app clears the loading state, shows a readable error, and keeps any previously rendered tasks visible
