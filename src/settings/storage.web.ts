import type { GitSettings } from "./validation";
import {
  parseStoredSettings,
  SETTINGS_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  toGitSettings,
  toStoredSettings,
} from "./storageValues";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export async function loadSavedSettings(): Promise<GitSettings | null> {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const stored = parseStoredSettings(readItem(storage, SETTINGS_STORAGE_KEY));

  if (!stored) {
    return null;
  }

  return toGitSettings(
    stored,
    readItem(storage, TOKEN_STORAGE_KEY) ?? "",
  );
}

export async function saveSettings(settings: GitSettings): Promise<void> {
  const storage = getStorage();

  if (!storage) {
    throw new Error("Browser storage is unavailable.");
  }

  storage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(toStoredSettings(settings)),
  );
  storage.setItem(TOKEN_STORAGE_KEY, settings.token);
}
