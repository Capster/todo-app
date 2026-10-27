import { Directory, File } from "expo-file-system";
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { Platform } from "react-native";

import {
  AUTHOR,
  BRANCH,
  getGitToken,
  REPOSITORY_DIRECTORY,
  REPOSITORY_URL,
} from "./config";
import {
  expoFileSystem,
  getDocumentDirectory,
  toFileUri,
} from "./expoFileSystem";

export const WEB_UNSUPPORTED_MESSAGE =
  "Repository checkout is not supported on the web. Use the Android or iOS app.";

export type CloneProgressCallback = (message: string) => void;

export type CloneResult = {
  files: string[];
};

let inFlight: Promise<CloneResult> | null = null;

function repositoryPaths() {
  const documentDirectory = getDocumentDirectory();
  return {
    repositoryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}`,
    temporaryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}.tmp`,
  };
}

function checkoutExists(repositoryDirectory: string): boolean {
  try {
    return new File(toFileUri(`${repositoryDirectory}/.git/HEAD`)).exists;
  } catch {
    return false;
  }
}

function deleteDirectory(path: string): void {
  try {
    const directory = new Directory(toFileUri(path));
    if (directory.exists) {
      directory.delete();
    }
  } catch {
    // Best-effort cleanup; a failed cleanup surfaces on the next operation.
  }
}

function sanitizeError(error: unknown, token: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = token ? message.split(token).join("[redacted]") : message;
  return new Error(sanitized);
}

async function cloneRepository(
  token: string,
  temporaryDirectory: string,
): Promise<void> {
  deleteDirectory(temporaryDirectory);

  try {
    await git.clone({
      fs: expoFileSystem,
      http,
      dir: temporaryDirectory,
      url: REPOSITORY_URL,
      ref: BRANCH,
      singleBranch: true,
      onAuth: () => ({ username: "x-access-token", password: token }),
    });

    new Directory(toFileUri(temporaryDirectory)).rename(REPOSITORY_DIRECTORY);
  } catch (error) {
    deleteDirectory(temporaryDirectory);
    throw error;
  }
}

async function pullRepository(
  token: string,
  repositoryDirectory: string,
): Promise<void> {
  await git.pull({
    fs: expoFileSystem,
    http,
    dir: repositoryDirectory,
    ref: BRANCH,
    singleBranch: true,
    author: AUTHOR,
    onAuth: () => ({ username: "x-access-token", password: token }),
  });
}

async function runCloneOrUpdate(
  onProgress?: CloneProgressCallback,
): Promise<CloneResult> {
  let token = "";

  try {
    token = getGitToken();
    const { temporaryDirectory, repositoryDirectory } = repositoryPaths();
    const hasCheckout = checkoutExists(repositoryDirectory);

    if (hasCheckout) {
      onProgress?.("Pulling latest changes...");
      await pullRepository(token, repositoryDirectory);
    } else {
      deleteDirectory(repositoryDirectory);
      onProgress?.("Cloning repository...");
      await cloneRepository(token, temporaryDirectory);
    }

    onProgress?.("Reading tracked files...");
    const files = await git.listFiles({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      ref: BRANCH,
    });

    return { files };
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export function cloneOrUpdateRepository(
  onProgress?: CloneProgressCallback,
): Promise<CloneResult> {
  if (Platform.OS === "web") {
    return Promise.reject(new Error(WEB_UNSUPPORTED_MESSAGE));
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = runCloneOrUpdate(onProgress).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export { buildTree } from "./tree";
