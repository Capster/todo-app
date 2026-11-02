# Spec Delta

## ADDED Requirements

### Requirement: Route-based screen navigation

The app SHALL use route-based navigation with a home route and a settings route on Android, iOS, and web. The home route SHALL render the task list, and the settings route SHALL render the git settings screen. On web, the browser URL SHALL reflect the active route. On Android and iOS, back navigation SHALL move between the routes.

#### Scenario: Home route renders the task list

- **WHEN** the app opens the home route
- **THEN** the task list screen is displayed

#### Scenario: Settings route renders settings

- **WHEN** the app opens the settings route
- **THEN** the git settings screen is displayed

#### Scenario: Browser URL reflects the route

- **WHEN** the user navigates between the home and settings screens in a browser
- **THEN** the browser URL changes to the corresponding route

#### Scenario: Back navigation returns to the previous route

- **WHEN** the user opens settings from the home screen on Android or iOS and presses back
- **THEN** the app returns to the home screen

#### Scenario: Onboarding chooses the initial route

- **WHEN** the app launches
- **THEN** the initial route is the settings route when required git configuration is missing or invalid, and the home route otherwise

### Requirement: Settings entry point

The home screen SHALL show a cog icon in the top-right corner. The icon SHALL be available on Android, iOS, and web, and activating it SHALL open the settings route.

#### Scenario: Cog icon opens settings

- **WHEN** the user activates the cog icon on the home screen
- **THEN** the settings screen opens

#### Scenario: Cog icon is present on every platform

- **WHEN** the home screen renders on Android, iOS, or web
- **THEN** the cog icon is visible in the top-right corner

#### Scenario: Settings remain reachable

- **WHEN** the user is on the home screen and the task list is loading, refreshing, or syncing
- **THEN** the cog icon remains available to open settings
