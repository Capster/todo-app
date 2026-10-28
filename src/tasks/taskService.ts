import {
  createTaskFile,
  deleteTaskFile,
  getCreationTimestamps,
  getTaskMove,
  hasCheckout,
  listTrackedFiles,
  moveTaskFile,
  pushRepository,
  readTaskFile,
  resetTaskIndex,
  restoreTaskFile,
  saveTaskFile,
  syncRepository,
} from "../git/repository";
import { formatMessage, messageOf } from "../utils/errors";
import {
  normalizeTaskDraft,
  pickAvailableTaskFileName,
  type ValidTaskDraft,
} from "./taskDraft";
import {
  deriveTasks,
  orderTasks,
  stripExtension,
  taskKey,
  type DatedTask,
  type Task,
} from "./tasks";

export type TaskView = DatedTask;

export type TaskServiceState = {
  status: "idle" | "loading" | "refreshing" | "reading";
  tasks: TaskView[];
  pendingKeys: ReadonlySet<string>;
  error: string | null;
  hasLoaded: boolean;
};

export type CompletionResult =
  | { status: "success" }
  | { status: "rolled_back"; error: string }
  | { status: "push_failed"; error: string };

export type CreateTaskResult =
  | { status: "success" }
  | { status: "saved_locally"; error: string }
  | { status: "invalid"; error: string }
  | { status: "failed"; error: string };

export type SaveTaskResult = CreateTaskResult;

export type DeleteTaskResult =
  | { status: "success" }
  | { status: "deleted_locally"; error: string }
  | { status: "failed"; error: string };

export type LoadTaskDraftResult =
  | { status: "loaded"; content: string }
  | { status: "failed"; error: string };

type CompletionMutation = {
  kind: "completion";
  task: TaskView;
  completed: boolean;
  key: string;
};

type CreateMutation = {
  kind: "create";
  fileName: string;
  displayName: string;
  draft: ValidTaskDraft;
  key: string;
  reservation: string;
};

type EditMutation = {
  kind: "edit";
  original: TaskView;
  nextFileName: string;
  nextDisplayName: string;
  content: string;
  key: string;
  reservation: string;
};

type DeleteMutation = {
  kind: "delete";
  task: TaskView;
  key: string;
};

type MutationRecord =
  | CompletionMutation
  | CreateMutation
  | EditMutation
  | DeleteMutation;

const listeners = new Set<() => void>();
const mutationQueue: MutationRecord[] = [];
const reservedNames = new Set<string>();

let state: TaskServiceState = {
  status: "idle",
  tasks: [],
  pendingKeys: new Set(),
  error: null,
  hasLoaded: false,
};

let workerPromise: Promise<void> | null = null;
let pushRequested = false;
let pushFailurePrefix = "Saved locally, but could not push: ";
let foregroundActive = false;
let errorSource: "push" | "other" | null = null;

function update(partial: Partial<TaskServiceState>): void {
  state = { ...state, ...partial };

  for (const listener of listeners) {
    listener();
  }
}

function addPending(key: string): void {
  const pendingKeys = new Set(state.pendingKeys);
  pendingKeys.add(key);
  update({ pendingKeys });
}

function removePending(key: string): void {
  if (!state.pendingKeys.has(key)) {
    return;
  }

  const pendingKeys = new Set(state.pendingKeys);
  pendingKeys.delete(key);
  update({ pendingKeys });
}

function sameTask(
  left: Pick<Task, "fileName" | "completed">,
  right: Pick<Task, "fileName" | "completed">,
): boolean {
  return (
    left.fileName === right.fileName && left.completed === right.completed
  );
}

function foregroundError(): string | null {
  if (state.status === "loading" || state.status === "refreshing") {
    return "The task list is busy. Try again in a moment.";
  }

  return null;
}

function takenTaskPaths(currentFileName?: string): string[] {
  const paths = state.tasks
    .filter(task => task.fileName !== currentFileName)
    .map(task =>
      task.completed ? `archived/${task.fileName}` : task.fileName,
    );

  for (const fileName of reservedNames) {
    if (fileName !== currentFileName) {
      paths.push(fileName);
    }
  }

  return paths;
}

async function buildView(files: readonly string[]): Promise<TaskView[]> {
  const tasks: TaskView[] = deriveTasks(files).map(task => ({
    ...task,
    createdAt: 0,
  }));
  const creationTimestamps = await getCreationTimestamps(
    tasks.map(task => task.fileName),
  );
  const datedTasks = tasks.map(task => ({
    ...task,
    createdAt: creationTimestamps.get(task.fileName) ?? 0,
  }));

  return orderTasks(datedTasks);
}

async function rollbackMutation(
  mutation: MutationRecord,
  error: unknown,
): Promise<void> {
  switch (mutation.kind) {
    case "completion": {
      const move = getTaskMove(mutation.task.fileName, mutation.completed);

      try {
        await restoreTaskFile(move);
      } catch {
        // Best-effort restore; try resetting the index anyway.
      }

      try {
        await resetTaskIndex([move.sourcePath, move.destinationPath]);
      } catch {
        // Best-effort index reset; report the original failure below.
      }

      const target = {
        fileName: mutation.task.fileName,
        completed: mutation.completed,
      };
      errorSource = "other";
      update({
        tasks: state.tasks.map(task =>
          sameTask(task, target) ? { ...mutation.task } : task,
        ),
        error: formatMessage(
          `Could not update "${mutation.task.displayName}"`,
          error,
        ),
      });
      return;
    }

    case "create": {
      errorSource = "other";
      update({
        tasks: state.tasks.filter(
          task => task.fileName !== mutation.fileName,
        ),
        error: formatMessage(
          `Could not create "${mutation.draft.baseName}"`,
          error,
        ),
      });
      return;
    }

    case "edit": {
      const target = {
        fileName: mutation.nextFileName,
        completed: mutation.original.completed,
      };
      errorSource = "other";
      update({
        tasks: state.tasks.map(task =>
          sameTask(task, target) ? { ...mutation.original } : task,
        ),
        error: formatMessage(
          `Could not save "${mutation.original.displayName}"`,
          error,
        ),
      });
      return;
    }

    case "delete": {
      const exists = state.tasks.some(task =>
        sameTask(task, mutation.task),
      );
      errorSource = "other";
      update({
        tasks: exists
          ? state.tasks
          : orderTasks([...state.tasks, mutation.task]),
        error: formatMessage(
          `Could not delete "${mutation.task.displayName}"`,
          error,
        ),
      });
      return;
    }
  }
}

async function processMutation(mutation: MutationRecord): Promise<void> {
  try {
    switch (mutation.kind) {
      case "completion": {
        const move = getTaskMove(mutation.task.fileName, mutation.completed);
        const action = mutation.completed ? "Complete" : "Reopen";

        await moveTaskFile(
          move,
          `${action} "${mutation.task.displayName}"`,
        );
        pushFailurePrefix = `Saved "${mutation.task.displayName}" locally, but could not push: `;
        break;
      }

      case "create": {
        await createTaskFile(
          mutation.fileName,
          mutation.draft.content,
          `Create "${mutation.displayName}"`,
        );
        pushFailurePrefix = `Created "${mutation.displayName}" locally, but could not push: `;
        break;
      }

      case "edit": {
        const location = {
          fileName: mutation.original.fileName,
          completed: mutation.original.completed,
        };
        const currentContent = await readTaskFile(location);

        if (
          mutation.nextFileName === mutation.original.fileName &&
          currentContent === mutation.content
        ) {
          return;
        }

        await saveTaskFile(
          location,
          mutation.nextFileName,
          mutation.content,
          `Edit "${mutation.nextDisplayName}"`,
        );
        pushFailurePrefix = `Saved "${mutation.nextDisplayName}" locally, but could not push: `;
        break;
      }

      case "delete": {
        await deleteTaskFile(
          {
            fileName: mutation.task.fileName,
            completed: mutation.task.completed,
          },
          `Delete "${mutation.task.displayName}"`,
        );
        pushFailurePrefix = `Deleted "${mutation.task.displayName}" locally, but could not push: `;
        break;
      }
    }

    pushRequested = true;
  } catch (error) {
    await rollbackMutation(mutation, error);
  } finally {
    removePending(mutation.key);

    if (mutation.kind === "create" || mutation.kind === "edit") {
      reservedNames.delete(mutation.reservation);
    }
  }
}

async function flushPush(): Promise<void> {
  const prefix = pushFailurePrefix;

  await pushRepository()
    .then(() => {
      if (errorSource === "push") {
        errorSource = null;
        update({ error: null });
      }
    })
    .catch(error => {
      errorSource = "push";
      update({ error: `${prefix}${messageOf(error)}` });
    });
}

async function workerLoop(): Promise<void> {
  while (true) {
    const mutation = mutationQueue.shift();

    if (mutation) {
      await processMutation(mutation);
      continue;
    }

    if (pushRequested) {
      pushRequested = false;
      await flushPush();
      continue;
    }

    return;
  }
}

function runWorker(): void {
  if (workerPromise) {
    return;
  }

  workerPromise = workerLoop().finally(() => {
    workerPromise = null;

    if (mutationQueue.length > 0 || pushRequested) {
      runWorker();
    }
  });
}

function enqueue(mutation: MutationRecord): void {
  mutationQueue.push(mutation);
  runWorker();
}

async function waitForBackground(): Promise<void> {
  while (true) {
    if (workerPromise) {
      await workerPromise;
      continue;
    }

    if (mutationQueue.length > 0) {
      runWorker();
      continue;
    }

    return;
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getState(): TaskServiceState {
  return state;
}

export async function load(): Promise<void> {
  if (foregroundActive) {
    return;
  }

  foregroundActive = true;
  errorSource = null;
  update({ status: "loading", error: null });
  let showedLocalTasks = false;

  try {
    if (await hasCheckout()) {
      try {
        const localFiles = await listTrackedFiles();
        const localTasks = await buildView(localFiles);
        showedLocalTasks = true;
        update({
          status: "refreshing",
          tasks: localTasks,
          pendingKeys: new Set(),
          error: null,
          hasLoaded: true,
        });
      } catch {
        // Fall through to the remote sync when the local checkout is unreadable.
      }
    }

    await waitForBackground();
    const { files } = await syncRepository();
    const tasks = await buildView(files);
    reservedNames.clear();
    errorSource = null;
    update({
      status: "idle",
      tasks,
      pendingKeys: new Set(),
      error: null,
      hasLoaded: true,
    });
  } catch (error) {
    errorSource = "other";
    update({
      status: "idle",
      error: formatMessage(
        showedLocalTasks ? "Could not refresh tasks" : "Could not load tasks",
        error,
      ),
    });
  } finally {
    foregroundActive = false;
  }
}

export async function refresh(): Promise<void> {
  if (foregroundActive) {
    return;
  }

  foregroundActive = true;
  errorSource = null;
  update({ status: "refreshing", error: null });

  try {
    await waitForBackground();
    const { files } = await syncRepository({ retryPendingPush: true });
    const tasks = await buildView(files);
    reservedNames.clear();
    errorSource = null;
    update({
      status: "idle",
      tasks,
      pendingKeys: new Set(),
      error: null,
      hasLoaded: true,
    });
  } catch (error) {
    errorSource = "other";
    update({
      status: "idle",
      error: formatMessage("Could not refresh tasks", error),
    });
  } finally {
    foregroundActive = false;
  }
}

export function setCompleted(
  fileName: string,
  completed: boolean,
): Promise<CompletionResult> {
  const blocked = foregroundError();

  if (blocked) {
    return Promise.resolve({ status: "rolled_back", error: blocked });
  }

  const task = state.tasks.find(
    candidate =>
      candidate.fileName === fileName && candidate.completed !== completed,
  );

  if (!task) {
    return Promise.resolve({ status: "success" });
  }

  const key = taskKey({ fileName, completed });
  errorSource = null;
  update({
    tasks: state.tasks.map(candidate =>
      sameTask(candidate, task) ? { ...candidate, completed } : candidate,
    ),
    error: null,
  });
  addPending(key);
  enqueue({ kind: "completion", task, completed, key });

  return Promise.resolve({ status: "success" });
}

export function createTask(
  name: string,
  description: string,
): Promise<CreateTaskResult> {
  const blocked = foregroundError();

  if (blocked) {
    return Promise.resolve({ status: "failed", error: blocked });
  }

  const draft = normalizeTaskDraft(name, description);

  if (!draft.ok) {
    return Promise.resolve({ status: "invalid", error: draft.error });
  }

  const fileName = pickAvailableTaskFileName(
    draft.baseName,
    draft.hasContent,
    takenTaskPaths(),
  );
  const displayName = stripExtension(fileName);
  const newestCreatedAt = state.tasks.reduce(
    (latest, candidate) => Math.max(latest, candidate.createdAt),
    0,
  );
  const task: TaskView = {
    fileName,
    displayName,
    completed: false,
    createdAt: Math.max(Date.now(), newestCreatedAt + 1),
  };
  const key = taskKey(task);

  reservedNames.add(fileName);
  errorSource = null;
  update({
    tasks: orderTasks([task, ...state.tasks]),
    error: null,
  });
  addPending(key);
  enqueue({
    kind: "create",
    fileName,
    displayName,
    draft,
    key,
    reservation: fileName,
  });

  return Promise.resolve({ status: "success" });
}

export async function loadTaskDraft(
  task: TaskView,
): Promise<LoadTaskDraftResult> {
  if (foregroundActive) {
    return {
      status: "failed",
      error: "The task list is busy. Try again in a moment.",
    };
  }

  errorSource = null;
  update({ status: "reading", error: null });

  try {
    const content = await readTaskFile({
      fileName: task.fileName,
      completed: task.completed,
    });
    errorSource = null;
    update({ status: "idle", error: null });

    return { status: "loaded", content };
  } catch (error) {
    const errorMessage = formatMessage(
      `Could not open "${task.displayName}"`,
      error,
    );
    errorSource = "other";
    update({ status: "idle", error: errorMessage });

    return { status: "failed", error: errorMessage };
  }
}

export function saveTask(
  task: TaskView,
  name: string,
  description: string,
): Promise<SaveTaskResult> {
  const blocked = foregroundError();

  if (blocked) {
    return Promise.resolve({ status: "failed", error: blocked });
  }

  const draft = normalizeTaskDraft(name, description);

  if (!draft.ok) {
    return Promise.resolve({ status: "invalid", error: draft.error });
  }

  const current = state.tasks.find(candidate =>
    sameTask(candidate, task),
  );

  if (!current) {
    return Promise.resolve({ status: "success" });
  }

  const nextFileName = pickAvailableTaskFileName(
    draft.baseName,
    draft.hasContent,
    takenTaskPaths(current.fileName),
    current.fileName,
  );
  const nextDisplayName = stripExtension(nextFileName);
  const nextTask: TaskView = {
    ...current,
    fileName: nextFileName,
    displayName: nextDisplayName,
  };
  const key = taskKey(nextTask);

  reservedNames.add(nextFileName);
  errorSource = null;
  update({
    tasks: state.tasks.map(candidate =>
      sameTask(candidate, current) ? nextTask : candidate,
    ),
    error: null,
  });
  addPending(key);
  enqueue({
    kind: "edit",
    original: current,
    nextFileName,
    nextDisplayName,
    content: draft.content,
    key,
    reservation: nextFileName,
  });

  return Promise.resolve({ status: "success" });
}

export function deleteTask(task: TaskView): Promise<DeleteTaskResult> {
  const blocked = foregroundError();

  if (blocked) {
    return Promise.resolve({ status: "failed", error: blocked });
  }

  const current = state.tasks.find(candidate =>
    sameTask(candidate, task),
  );

  if (!current) {
    return Promise.resolve({ status: "success" });
  }

  const key = taskKey(current);
  errorSource = null;
  update({
    tasks: state.tasks.filter(candidate => !sameTask(candidate, current)),
    error: null,
  });
  addPending(key);
  enqueue({ kind: "delete", task: current, key });

  return Promise.resolve({ status: "success" });
}
