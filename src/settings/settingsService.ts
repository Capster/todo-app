import { AUTHOR, type GitConnection } from "../git/config";
import { messageOf } from "../utils/errors";
import { loadSavedSettings, saveSettings } from "./storage";
import {
  type GitSettings,
  validateGitSettings,
} from "./validation";

export type SettingsStatus = "idle" | "loading" | "ready";

export type SettingsSnapshot = {
  status: SettingsStatus;
  settings: GitSettings | null;
  error: string | null;
};

const listeners = new Set<() => void>();

let snapshot: SettingsSnapshot = {
  status: "idle",
  settings: null,
  error: null,
};

let loadPromise: Promise<GitSettings | null> | null = null;

function update(partial: Partial<SettingsSnapshot>): void {
  snapshot = { ...snapshot, ...partial };

  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SettingsSnapshot {
  return snapshot;
}

export function loadSettings(): Promise<GitSettings | null> {
  if (loadPromise) {
    return loadPromise;
  }

  update({ status: "loading", error: null });

  loadPromise = loadSavedSettings()
    .then(settings => {
      update({ status: "ready", settings, error: null });
      return settings;
    })
    .catch(error => {
      update({
        status: "ready",
        settings: null,
        error: messageOf(error),
      });
      return null;
    });

  return loadPromise;
}

export async function saveGitSettings(settings: GitSettings): Promise<void> {
  await saveSettings(settings);
  loadPromise = Promise.resolve(settings);
  update({ status: "ready", settings, error: null });
}

function invalidSettingsMessage(settings: GitSettings): string {
  const validation = validateGitSettings(settings);

  if (validation.ok) {
    return "";
  }

  return Object.values(validation.errors).join(" ");
}

export async function getActiveConnection(): Promise<GitConnection> {
  const loaded = await loadSettings();

  if (!loaded) {
    throw new Error(
      "Git settings are missing. Open Settings and save a repository URL, branch, and token.",
    );
  }

  const validation = validateGitSettings(loaded);

  if (!validation.ok) {
    throw new Error(
      `Git settings are invalid. ${invalidSettingsMessage(loaded)} Open Settings to fix them.`,
    );
  }

  const settings = validation.settings;

  return {
    repositoryUrl: settings.repositoryUrl,
    branch: settings.branch,
    token: settings.token,
    author: {
      name: settings.authorName || AUTHOR.name,
      email: settings.authorEmail || AUTHOR.email,
    },
  };
}
