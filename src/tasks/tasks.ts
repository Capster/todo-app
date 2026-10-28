export type Task = {
  fileName: string;
  displayName: string;
  completed: boolean;
};

export type DatedTask = Task & {
  createdAt: number;
};

export function taskKey(
  task: Pick<Task, "fileName" | "completed">,
): string {
  return `${task.completed ? "archived" : "open"}:${task.fileName}`;
}

export function stripExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

export function deriveTasks(paths: readonly string[]): Task[] {
  const tasks: Task[] = [];

  for (const path of paths) {
    const parts = path.split("/").filter(part => part.length > 0);

    if (parts.length === 1) {
      const fileName = parts[0];
      tasks.push({
        fileName,
        displayName: stripExtension(fileName),
        completed: false,
      });
      continue;
    }

    if (parts.length === 2 && parts[0] === "archived") {
      const fileName = parts[1];
      tasks.push({
        fileName,
        displayName: stripExtension(fileName),
        completed: true,
      });
    }
  }

  return tasks;
}

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

export function orderTasks(tasks: readonly DatedTask[]): DatedTask[] {
  return [...tasks].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt;
    }

    return compareNames(left.displayName, right.displayName);
  });
}
