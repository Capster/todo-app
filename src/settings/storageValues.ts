import type { GitSettings } from "./validation";

export const SETTINGS_STORAGE_KEY = "todo-app.git-settings";
export const TOKEN_STORAGE_KEY = "todo-app.git-token";

export type StoredGitSettings = Omit<GitSettings, "token">;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function toStoredSettings(settings: GitSettings): StoredGitSettings {
  return {
    repositoryUrl: settings.repositoryUrl,
    branch: settings.branch,
    authorName: settings.authorName,
    authorEmail: settings.authorEmail,
  };
}

export function toGitSettings(
  stored: StoredGitSettings,
  token: string,
): GitSettings {
  return {
    repositoryUrl: stored.repositoryUrl,
    branch: stored.branch,
    token,
    authorName: stored.authorName,
    authorEmail: stored.authorEmail,
  };
}

export function parseStoredSettings(
  raw: string | null,
): StoredGitSettings | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== "object" || value === null) {
      return null;
    }

    const record = value as Record<string, unknown>;

    return {
      repositoryUrl: stringValue(record.repositoryUrl),
      branch: stringValue(record.branch),
      authorName: stringValue(record.authorName),
      authorEmail: stringValue(record.authorEmail),
    };
  } catch {
    return null;
  }
}
