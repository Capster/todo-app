# Spec Delta

## MODIFIED Requirements

### Requirement: Source organization

Reusable UI components SHALL live under `src/components/`, and the application entry point SHALL compose the starter screen from a component in that directory. Components SHALL stay atomic and decoupled: they SHALL contain presentation markup and at most shallow glue such as a callback or a single boolean expression, and SHALL delegate state, effects, orchestration, and data access to hooks or utilities. Custom hooks and utility functions SHALL also be small, single-purpose, and shallow. JSX trees SHALL be no more than roughly two to three levels deep unless a platform or accessibility constraint genuinely requires deeper nesting. Additional `src/` subdirectories SHALL be introduced only when a feature needs them.

#### Scenario: Starter screen is composed from a src component

- **WHEN** the application source is inspected
- **THEN** at least one starter-screen component exists under `src/components/` and is imported and rendered by the application entry point

#### Scenario: Components stay presentational

- **WHEN** a component under `src/components/` is inspected
- **THEN** orchestration, effects, data access, and multi-step state transitions live in a hook or utility rather than in the component

#### Scenario: Hooks and utilities stay atomic

- **WHEN** a custom hook or utility is inspected
- **THEN** it has one cohesive purpose and does not combine unrelated concerns

#### Scenario: JSX stays shallow

- **WHEN** a component's render tree is inspected
- **THEN** the JSX nesting is about two to three levels deep, except where a platform or accessibility requirement makes deeper nesting necessary

#### Scenario: Feature logic is reused, not duplicated

- **WHEN** two components need the same behavior
- **THEN** that behavior is provided by a shared hook, utility, or service rather than copied into both components
