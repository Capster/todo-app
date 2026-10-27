import {
  getCreationTimestamps,
  getTaskMove,
  moveTaskFile,
  pushRepository,
  resetTaskIndex,
  restoreTaskFile,
  syncRepository,
} from "../git/repository";
import {
  deriveTasks,
  orderTasks,
  stripExtension,
  type Task,
} from "./tasks";

export type TaskView = Task;

export type TaskServiceState = {
  status: "idle" | "loading" | "refreshing";
  tasks: TaskView[];
  pendingFileName: string | null;
  error: string | null;
  hasLoaded: boolean;
};

export type CompletionResult =
  | { status: "success" }
  | { status: "rolled_back"; error: string }
  | { status: "push_failed"; error: string };

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
