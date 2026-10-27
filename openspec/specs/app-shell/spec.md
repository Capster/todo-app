# app-shell Specification

## Purpose

Provide a working cross-platform application shell that developers can start from one TypeScript codebase and preview both in a browser and on a physical Android device through Expo Go.

## Requirements

### Requirement: Cross-platform application startup

The application SHALL render its starter screen from a single TypeScript source tree in a desktop web browser and in Expo Go on a physical Android device.

#### Scenario: Launch in a web browser

- **WHEN** a developer runs the web development script
- **THEN** the application is served locally and the starter screen renders in the browser without a runtime error

#### Scenario: Launch on a physical Android device

- **WHEN** a developer starts the development server and opens the displayed project in Expo Go on an Android device connected to the same network
- **THEN** the application loads and renders the starter screen without a runtime error

#### Scenario: Load on a device when local network discovery is unavailable

- **WHEN** the Android device cannot reach the development server over the local network
- **THEN** the developer can start the server in tunnel mode and still open the project in Expo Go

### Requirement: Source organization

Reusable UI components SHALL live under `src/components/`, and the application entry point SHALL compose the starter screen from a component in that directory. Additional `src/` subdirectories SHALL be introduced only when a feature needs them.

#### Scenario: Starter screen is composed from a src component

- **WHEN** the application source is inspected
- **THEN** at least one starter-screen component exists under `src/components/` and is imported and rendered by the application entry point

### Requirement: Development workflow

The project SHALL provide documented commands to start the development server, run the app on web, run the app on Android, and type-check the codebase. It SHALL declare the supported Node.js versions and fail type-checking when TypeScript errors exist.

#### Scenario: Type-check succeeds on a clean checkout

- **WHEN** a developer using a supported Node.js version runs the type-check command after installing dependencies
- **THEN** the command exits successfully

#### Scenario: Developer discovers how to preview the app

- **WHEN** a developer reads the repository README
- **THEN** it documents the supported Node.js requirement, dependency installation, web preview, Android/Expo Go preview, and tunnel fallback

#### Scenario: Unsupported Node.js version is declared

- **WHEN** dependencies are installed with a Node.js version below the minimum required by the Expo SDK
- **THEN** the project's declared engine range identifies the supported versions
