# Spec Delta

## ADDED Requirements

### Requirement: Open the task creation sheet

The list screen SHALL show a sticky round button with a plus icon at the bottom-right corner. Activating it SHALL open a modal bottom sheet that overlays the list and occupies the bottom half of the screen. The sheet SHALL contain a task-name field, a multiline description field, and a Create button. The name field SHALL accept a single line of text and SHALL grow vertically to show the full name when the text does not fit on one line.

#### Scenario: Plus button opens the sheet

- **WHEN** the user activates the round plus button on the list screen
- **THEN** the task creation sheet appears over the list, anchored to the bottom half of the screen

#### Scenario: Long name wraps and expands

- **WHEN** the user enters a task name that is wider than the name field
- **THEN** the name wraps onto additional lines and the field grows in height to show the full name without adding a newline to the name

#### Scenario: Description accepts multiple lines

- **WHEN** the user enters several lines in the description field
- **THEN** the field keeps the line breaks and displays the full description

### Requirement: Create a task from the sheet

When the user activates Create with valid input, the app SHALL create one open task file directly in the repository root, write the description as the file content, commit the new file with the configured app identity, and push `master`. The entered name SHALL be trimmed before use. The description SHALL be treated as empty when it contains only whitespace.

#### Scenario: Create a task with a description

- **WHEN** the user enters the name `Buy groceries` and a non-empty description and activates Create
- **THEN** the app creates a root file named `Buy groceries.md` whose content is the entered description, commits it, pushes `master`, and shows a new open task named `Buy groceries`

#### Scenario: Create a task without a description

- **WHEN** the user enters the name `Pay the bill` and an empty or whitespace-only description and activates Create
- **THEN** the app creates an empty root file named `Pay the bill`, commits it, pushes `master`, and shows a new open task named `Pay the bill`

#### Scenario: Markdown extension is not duplicated

- **WHEN** the user enters the name `Buy groceries.md` with a non-empty description
- **THEN** the app creates a root file named `Buy groceries.md`, not `Buy groceries.md.md`

#### Scenario: Trailing extension is removed for a plain task

- **WHEN** the user enters the name `Buy groceries.md` with an empty description
- **THEN** the app creates a plain root file named `Buy groceries`

#### Scenario: Surrounding whitespace is trimmed

- **WHEN** the user enters `  Buy groceries  ` as the name
- **THEN** the app creates the task using the trimmed name `Buy groceries`

#### Scenario: New task appears newest first

- **WHEN** a task is created successfully
- **THEN** the sheet closes and the new open task appears at the top of the list because its creation commit is the newest

### Requirement: Validate names and resolve conflicts

The app SHALL reject a trimmed name that is empty, contains `/` or `\`, or is `.` or `..`, without creating or committing a file, and SHALL show an inline error in the sheet. When the candidate name without its final extension matches the display name of an existing open or completed task, ignoring case, the app SHALL append a numeric suffix (` 2`, ` 3`, ...) to the base name before the extension until the name is unique.

#### Scenario: Empty name is rejected

- **WHEN** the user activates Create with an empty or whitespace-only name
- **THEN** the app keeps the sheet open, shows a readable inline error, and does not create a file or commit

#### Scenario: Path separators are rejected

- **WHEN** the user enters a name containing `/` or `\`
- **THEN** the app keeps the sheet open, shows a readable inline error, and does not create a file or commit

#### Scenario: Duplicate open task is suffixed

- **WHEN** an open task named `Buy groceries` exists and the user creates another task with the same name
- **THEN** the app creates the new file as `Buy groceries 2.md` instead of overwriting or duplicating the display name

#### Scenario: Duplicate completed task is suffixed

- **WHEN** a completed task named `Pay the bill` exists in `archived/` and the user creates another task with the same name
- **THEN** the app creates the new file as `Pay the bill 2.md` in the repository root

#### Scenario: Suffix keeps increasing

- **WHEN** tasks named `Buy groceries` and `Buy groceries 2` already exist and the user creates another task with the same base name
- **THEN** the app creates `Buy groceries 3.md`

#### Scenario: Names that differ only by extension conflict

- **WHEN** a file named `Buy groceries` exists and the user creates a task named `Buy groceries.md` with a description
- **THEN** the app treats the names as conflicting and creates `Buy groceries 2.md`

### Requirement: Keep a task created without network access

If the file is committed but the push fails, the app SHALL keep the local commit and file, close the sheet, show the new task in the list, and display a readable sync error. The pending creation commit SHALL be pushed by a later refresh before pulling.

#### Scenario: Create while offline

- **WHEN** the user creates a task and the push fails because the network is unavailable
- **THEN** the sheet closes, the task appears locally, and a readable error says it was saved but not pushed

#### Scenario: Reconnect and refresh

- **WHEN** a task was created locally but not pushed and the user refreshes after connectivity returns
- **THEN** the app pushes the pending creation commit before pulling and does not create a duplicate task

#### Scenario: Creation without an existing checkout

- **WHEN** the user tries to create a task before any checkout exists, as on a first launch with no network
- **THEN** the app keeps the sheet open and shows a readable error without creating a file or commit

### Requirement: Roll back a task that cannot be created

If writing, staging, or committing the new file fails, the app SHALL remove the partial file and any staged index entry, SHALL NOT leave a commit, SHALL keep the sheet open, and SHALL show a readable error. If the Create action is activated while another task operation is running, the app SHALL reject the attempt without creating a file.

#### Scenario: Commit failure is rolled back

- **WHEN** writing or committing a new task fails
- **THEN** no new task file or commit remains and the sheet stays open with a readable error

#### Scenario: Repeated Create taps do not duplicate

- **WHEN** the user activates Create repeatedly while the first creation is still running
- **THEN** the app creates at most one task and does not commit a duplicate

### Requirement: Dismiss the task creation sheet

The sheet SHALL close without creating anything when the user taps a close control, taps the backdrop outside the sheet, or uses the Android back action, and any entered text SHALL be discarded. The sheet SHALL also close after a task is created locally, whether or not the push succeeded.

#### Scenario: Close without creating

- **WHEN** the user enters text and dismisses the sheet with the close control or backdrop
- **THEN** the sheet closes and no file or commit is created

#### Scenario: Android back dismisses

- **WHEN** the sheet is open on Android and the user presses back
- **THEN** the sheet closes without creating a task

#### Scenario: Sheet closes after local save

- **WHEN** the file was committed locally but could not be pushed
- **THEN** the sheet closes and the task remains visible in the list
