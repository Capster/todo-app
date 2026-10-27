import {
  createTaskFile,
  deleteTaskFile,
  getCreationTimestamps,
  getTaskMove,
  listTrackedFiles,
  moveTaskFile,
  pushRepository,
  readTaskFile,
  resetTaskIndex,
  restoreTaskFile,
  saveTaskFile,
  syncRepository,
} from "../git/repository";
import {
  normalizeTaskDraft,
  pickAvailableTaskFileName,
  type ValidTaskDraft,
} from "./taskDraft";
import {
  deriveTasks,
  orderTasks,
  stripExtension,
  type Task,
} from "./tasks";

export type TaskView = Task;

export type TaskServiceState = {
  status:
    | "idle"
    | "loading"
    | "refreshing"
    | "creating"
    | "reading"
    | "saving"
    | "deleting";
  tasks: TaskView[];
  pendingFileName: string | null;
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

export class TaskOperationBusyError extends Error {
  constructor() {
    super("Another task operation is already running.");
    this.name = "TaskOperationBusyError";
  }
}

const listeners = new Set<() => void>();

let state: TaskServiceState = {
  status: "idle",
  tasks: [],
  pendingFileName: null,
  error: null,
  hasLoaded: false,
};
let operationInFlight = false;

function update(partial: Partial<TaskServiceState>): void {
  state = { ...state, ...partial };

  for (const listener of listeners) {
    listener();
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  if (operationInFlight) {
    return Promise.reject(new TaskOperationBusyError());
  }

  operationInFlight = true;

  return operation().finally(() => {
    operationInFlight = false;
  });
}

function updateCompletion(
  tasks: readonly TaskView[],
  fileName: string,
  completed: boolean,
): TaskView[] {
  return tasks.map(task =>
    task.fileName === fileName ? { ...task, completed } : task,
  );
}

async function buildView(files: readonly string[]): Promise<TaskView[]> {
  const tasks = deriveTasks(files);
  const creationTimestamps = await getCreationTimestamps(
    tasks.map(task => task.fileName),
  );
  const datedTasks = tasks.map(task => ({
    ...task,
    createdAt: creationTimestamps.get(task.fileName) ?? 0,
  }));

  return orderTasks(datedTasks).map(({ fileName, displayName, completed }) => ({
    fileName,
    displayName,
    completed,
  }));
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

export function load(): Promise<void> {
  return runExclusive(async () => {
    update({ status: "loading", error: null });

    try {
      const { files } = await syncRepository();
      const tasks = await buildView(files);
      update({
        status: "idle",
        tasks,
        pendingFileName: null,
        error: null,
        hasLoaded: true,
      });
    } catch (error) {
      update({
        status: "idle",
        error: `Could not load tasks: ${messageOf(error)}`,
      });
    }
  });
}

export function refresh(): Promise<void> {
  return runExclusive(async () => {
    update({ status: "refreshing", error: null });

    try {
      const { files } = await syncRepository({ retryPendingPush: true });
      const tasks = await buildView(files);
      update({
        status: "idle",
        tasks,
        pendingFileName: null,
        error: null,
        hasLoaded: true,
      });
    } catch (error) {
      update({
        status: "idle",
        error: `Could not refresh tasks: ${messageOf(error)}`,
      });
    }
  });
}

export function setCompleted(
  fileName: string,
  completed: boolean,
): Promise<CompletionResult> {
  return runExclusive(async () => {
    const displayName =
      state.tasks.find(task => task.fileName === fileName)?.displayName ??
      stripExtension(fileName);
    const move = getTaskMove(fileName, completed);
    const commitMessage = completed
      ? `Complete "${displayName}"`
      : `Reopen "${displayName}"`;

    update({ pendingFileName: fileName, error: null });

    try {
      await moveTaskFile(move, commitMessage);
    } catch (error) {
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

      const errorMessage = `Could not update "${displayName}": ${messageOf(
        error,
      )}`;
      update({ pendingFileName: null, error: errorMessage });

      return { status: "rolled_back", error: errorMessage };
    }

    const tasks = updateCompletion(state.tasks, fileName, completed);

    try {
      await pushRepository();
      update({ tasks, pendingFileName: null, error: null });
      return { status: "success" };
    } catch (error) {
      const errorMessage = `Saved "${displayName}" locally, but could not push: ${messageOf(
        error,
      )}`;
      update({ tasks, pendingFileName: null, error: errorMessage });

      return { status: "push_failed", error: errorMessage };
    }
  });
}

type CommitTaskOutcome =
  | { ok: true; fileName: string; displayName: string }
  | { ok: false; error: string };

async function commitNewTask(
  draft: ValidTaskDraft,
): Promise<CommitTaskOutcome> {
  try {
    const trackedFiles = await listTrackedFiles();
    const fileName = pickAvailableTaskFileName(
      draft.baseName,
      draft.hasContent,
      trackedFiles,
    );
    const displayName = stripExtension(fileName);

    await createTaskFile(fileName, draft.content, `Create "${displayName}"`);

    return { ok: true, fileName, displayName };
  } catch (error) {
    return {
      ok: false,
      error: `Could not create "${draft.baseName}": ${messageOf(error)}`,
    };
  }
}

async function rebuildAfterCreate(
  fileName: string,
  displayName: string,
): Promise<TaskView[]> {
  try {
    const trackedFiles = await listTrackedFiles();
    return await buildView(trackedFiles);
  } catch {
    return [
      { fileName, displayName, completed: false },
      ...state.tasks.filter(task => task.fileName !== fileName),
    ];
  }
}

async function createTaskInternal(
  name: string,
  description: string,
): Promise<CreateTaskResult> {
  const draft = normalizeTaskDraft(name, description);

  if (!draft.ok) {
    return { status: "invalid", error: draft.error };
  }

  update({ status: "creating", error: null });

  const committed = await commitNewTask(draft);

  if (!committed.ok) {
    update({ status: "idle", error: null });
    return { status: "failed", error: committed.error };
  }

  const tasks = await rebuildAfterCreate(
    committed.fileName,
    committed.displayName,
  );

  try {
    await pushRepository();
    update({ status: "idle", tasks, pendingFileName: null, error: null });
    return { status: "success" };
  } catch (error) {
    const errorMessage = `Created "${committed.displayName}" locally, but could not push: ${messageOf(
      error,
    )}`;
    update({ status: "idle", tasks, pendingFileName: null, error: errorMessage });

    return { status: "saved_locally", error: errorMessage };
  }
}

export function createTask(
  name: string,
  description: string,
): Promise<CreateTaskResult> {
  return runExclusive(() => createTaskInternal(name, description)).catch(
    error => {
      if (error instanceof TaskOperationBusyError) {
        return { status: "failed", error: error.message };
      }

      update({ status: "idle" });
      return { status: "failed", error: messageOf(error) };
    },
  );
}

export function loadTaskDraft(
  task: TaskView,
): Promise<LoadTaskDraftResult> {
  return runExclusive(async (): Promise<LoadTaskDraftResult> => {
    update({ status: "reading", error: null });

    try {
      const content = await readTaskFile({
        fileName: task.fileName,
        completed: task.completed,
      });
      update({ status: "idle", error: null });

      return { status: "loaded", content };
    } catch (error) {
      const errorMessage = `Could not open "${task.displayName}": ${messageOf(
        error,
      )}`;
      update({ status: "idle", error: errorMessage });

      return { status: "failed", error: errorMessage };
    }
  }).catch(error => {
    if (error instanceof TaskOperationBusyError) {
      return { status: "failed", error: error.message };
    }

    update({ status: "idle" });
    return { status: "failed", error: messageOf(error) };
  });
}

async function rebuildAfterSave(
  original: TaskView,
  fileName: string,
  displayName: string,
): Promise<TaskView[]> {
  try {
    const trackedFiles = await listTrackedFiles();
    return await buildView(trackedFiles);
  } catch {
    return state.tasks.map(task =>
      task.fileName === original.fileName &&
      task.completed === original.completed
        ? { ...task, fileName, displayName }
        : task,
    );
  }
}

async function saveTaskInternal(
  task: TaskView,
  name: string,
  description: string,
): Promise<SaveTaskResult> {
  const draft = normalizeTaskDraft(name, description);

  if (!draft.ok) {
    return { status: "invalid", error: draft.error };
  }

  update({ status: "saving", error: null });

  const location = {
    fileName: task.fileName,
    completed: task.completed,
  };

  let nextFileName: string;
  let displayName: string;

  try {
    const trackedFiles = await listTrackedFiles();
    nextFileName = pickAvailableTaskFileName(
      draft.baseName,
      draft.hasContent,
      trackedFiles,
      task.fileName,
    );
    displayName = stripExtension(nextFileName);

    const currentContent = await readTaskFile(location);

    if (
      nextFileName === task.fileName &&
      currentContent === draft.content
    ) {
      update({ status: "idle", error: null });
      return { status: "success" };
    }

    await saveTaskFile(
      location,
      nextFileName,
      draft.content,
      `Edit "${displayName}"`,
    );
  } catch (error) {
    update({ status: "idle", error: null });
    return {
      status: "failed",
      error: `Could not save "${task.displayName}": ${messageOf(error)}`,
    };
  }

  const tasks = await rebuildAfterSave(task, nextFileName, displayName);

  try {
    await pushRepository();
    update({ status: "idle", tasks, pendingFileName: null, error: null });
    return { status: "success" };
  } catch (error) {
    const errorMessage = `Saved "${displayName}" locally, but could not push: ${messageOf(
      error,
    )}`;
    update({ status: "idle", tasks, pendingFileName: null, error: errorMessage });

    return { status: "saved_locally", error: errorMessage };
  }
}

export function saveTask(
  task: TaskView,
  name: string,
  description: string,
): Promise<SaveTaskResult> {
  return runExclusive(() => saveTaskInternal(task, name, description)).catch(
    error => {
      if (error instanceof TaskOperationBusyError) {
        return { status: "failed", error: error.message };
      }

      update({ status: "idle" });
      return { status: "failed", error: messageOf(error) };
    },
  );
}

async function rebuildAfterDelete(
  original: TaskView,
): Promise<TaskView[]> {
  try {
    const trackedFiles = await listTrackedFiles();
    return await buildView(trackedFiles);
  } catch {
    return state.tasks.filter(
      task =>
        !(
          task.fileName === original.fileName &&
          task.completed === original.completed
        ),
    );
  }
}

async function deleteTaskInternal(
  task: TaskView,
): Promise<DeleteTaskResult> {
  update({ status: "deleting", error: null });

  try {
    await deleteTaskFile(
      {
        fileName: task.fileName,
        completed: task.completed,
      },
      `Delete "${task.displayName}"`,
    );
  } catch (error) {
    update({ status: "idle", error: null });
    return {
      status: "failed",
      error: `Could not delete "${task.displayName}": ${messageOf(error)}`,
    };
  }

  const tasks = await rebuildAfterDelete(task);

  try {
    await pushRepository();
    update({ status: "idle", tasks, pendingFileName: null, error: null });
    return { status: "success" };
  } catch (error) {
    const errorMessage = `Deleted "${task.displayName}" locally, but could not push: ${messageOf(
      error,
    )}`;
    update({ status: "idle", tasks, pendingFileName: null, error: errorMessage });

    return { status: "deleted_locally", error: errorMessage };
  }
}

export function deleteTask(task: TaskView): Promise<DeleteTaskResult> {
  return runExclusive(() => deleteTaskInternal(task)).catch(error => {
    if (error instanceof TaskOperationBusyError) {
      return { status: "failed", error: error.message };
    }

    update({ status: "idle" });
    return { status: "failed", error: messageOf(error) };
  });
}
