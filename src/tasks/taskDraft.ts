import { deriveTasks } from "./tasks";

const MARKDOWN_EXTENSION = ".md";

export type ValidTaskDraft = {
  ok: true;
  baseName: string;
  hasContent: boolean;
  content: string;
};

export type InvalidTaskDraft = {
  ok: false;
  error: string;
};

export type TaskDraft = ValidTaskDraft | InvalidTaskDraft;

export function normalizeTaskDraft(
  name: string,
  description: string,
): TaskDraft {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { ok: false, error: "Task name cannot be empty." };
  }

  if (trimmedName.includes("/") || trimmedName.includes("\\")) {
    return { ok: false, error: "Task name cannot contain / or \\." };
  }

  if (trimmedName === "." || trimmedName === "..") {
    return { ok: false, error: 'Task name cannot be "." or "..".' };
  }

  const baseName = trimmedName
    .toLowerCase()
    .endsWith(MARKDOWN_EXTENSION)
    ? trimmedName.slice(0, -MARKDOWN_EXTENSION.length)
    : trimmedName;

  if (baseName.length === 0) {
    return { ok: false, error: "Task name cannot be empty." };
  }

  const hasContent = description.trim().length > 0;

  return {
    ok: true,
    baseName,
    hasContent,
    content: hasContent ? description : "",
  };
}

function trackedTaskDisplayNames(paths: readonly string[]): string[] {
  return deriveTasks(paths).map(task => task.displayName);
}

export function pickAvailableTaskFileName(
  baseName: string,
  hasContent: boolean,
  trackedFiles: readonly string[],
): string {
  const takenNames = new Set(
    trackedTaskDisplayNames(trackedFiles).map(name => name.toLowerCase()),
  );

  let candidate = baseName;
  let suffix = 2;

  while (takenNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }

  return hasContent ? `${candidate}${MARKDOWN_EXTENSION}` : candidate;
}
