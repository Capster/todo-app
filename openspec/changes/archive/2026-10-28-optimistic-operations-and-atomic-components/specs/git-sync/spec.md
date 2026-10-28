# Spec Delta

## ADDED Requirements

### Requirement: Sync task mutations in the background

After a task mutation is accepted, the app SHALL run its file write, git commit, and push without blocking the task list or the edit and creation sheets. The task list SHALL remain interactive while the mutation syncs. Clone and pull SHALL remain foreground operations with visible progress.

#### Scenario: Task mutation does not block interaction

- **WHEN** the app is writing, committing, or pushing a task mutation
- **THEN** the user can still open, toggle, create, edit, or delete tasks

#### Scenario: Clone and pull keep their foreground behavior

- **WHEN** a clone or pull runs
- **THEN** the app shows the existing loading or refreshing state instead of treating the operation as a background mutation

#### Scenario: Future remote waits default to background

- **WHEN** a task-related operation other than clone or pull has to wait on the remote
- **THEN** the operation runs in the background and does not lock the task list

### Requirement: Serialize background git work

The app SHALL execute background task file writes, commits, and pushes one at a time in trigger order, even when several mutations are accepted before earlier ones finish. It SHALL NOT start overlapping git operations that could corrupt the checkout or index. A refresh SHALL wait for queued task mutations to finish before pushing pending commits and pulling.

#### Scenario: Queued mutations do not overlap

- **WHEN** several task mutations are queued
- **THEN** the app finishes each mutation's file and commit work before starting the next mutation's git work

#### Scenario: Refresh drains the queue first

- **WHEN** the user refreshes while background task mutations are still pending
- **THEN** the app waits for those mutations to finish before pushing pending commits and pulling `master`

#### Scenario: Push failure does not block later mutations

- **WHEN** a background push fails after its commit succeeded
- **THEN** the app keeps that local commit, reports the error, and continues processing later queued mutations

#### Scenario: Local failure does not block later mutations

- **WHEN** a background file write or commit fails and is rolled back
- **THEN** the app reports the error and continues processing later queued mutations
