import * as SecureStore from "expo-secure-store";

import type { GitSettings } from "./validation";
import {
  parseStoredSettings,
  SETTINGS_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  toGitSettings,
  toStoredSettings,
} from "./storageValues";

export async function loadSavedSettings(): Promise<GitSettings | null> {
  const [rawSettings, token] = await Promise.all([
    SecureStore.getItemAsync(SETTINGS_STORAGE_KEY),
    SecureStore.getItemAsync(TOKEN_STORAGE_KEY),
  ]);
  const stored = parseStoredSettings(rawSettings);

  if (!stored) {
    return null;
  }

  return toGitSettings(stored, token ?? "");
}

export async function saveSettings(settings: GitSettings): Promise<void> {
  await SecureStore.setItemAsync(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(toStoredSettings(settings)),
  );
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, settings.token);
}
