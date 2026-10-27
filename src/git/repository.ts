import { Directory, File } from "expo-file-system";
import git, { type PushResult } from "isomorphic-git";
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
  promises as fileSystem,
  toFileUri,
} from "./expoFileSystem";

export const WEB_UNSUPPORTED_MESSAGE =
  "The todo list is not supported on the web. Use the Android or iOS app.";

export type CloneProgressCallback = (message: string) => void;

export type SyncOptions = {
  retryPendingPush?: boolean;
  onProgress?: CloneProgressCallback;
};

export type RepositorySnapshot = {
  files: string[];
};

export type TaskMove = {
  fileName: string;
  sourcePath: string;
  destinationPath: string;
};

type PushResultWithErrors = PushResult & {
  errors?: unknown;
};

let syncInFlight: Promise<RepositorySnapshot> | null = null;
let creationCache: { headOid: string; dates: Map<string, number> } | null =
  null;

function repositoryPaths() {
  const documentDirectory = getDocumentDirectory();
  return {
    repositoryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}`,
    temporaryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}.tmp`,
  };
}

function repositoryPath(path: string): string {
  return `${repositoryPaths().repositoryDirectory}/${path}`;
}

function checkoutExists(repositoryDirectory: string): boolean {
  try {
    return new File(toFileUri(`${repositoryDirectory}/.git/HEAD`)).exists;
  } catch {
    return false;
  }
}

function fileExists(path: string): boolean {
  try {
    return new File(toFileUri(path)).exists;
  } catch {
    return false;
  }
}

function requireCheckout(): string {
  const { repositoryDirectory } = repositoryPaths();

  if (!checkoutExists(repositoryDirectory)) {
    throw new Error("The repository has not been checked out yet.");
  }

  return repositoryDirectory;
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

function ensureDirectory(path: string): void {
  try {
    new Directory(toFileUri(path)).create({
      intermediates: true,
      idempotent: true,
    });
  } catch (error) {
    if (!new Directory(toFileUri(path)).exists) {
      throw error;
    }
  }
}

function sanitizeError(error: unknown, token: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = token ? message.split(token).join("[redacted]") : message;
  return new Error(sanitized);
}

function invalidateCreationCache(): void {
  creationCache = null;
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
    fastForwardOnly: true,
    author: AUTHOR,
    onAuth: () => ({ username: "x-access-token", password: token }),
  });
}

async function ensureCheckout(
  token: string,
  onProgress?: CloneProgressCallback,
): Promise<string> {
  const { temporaryDirectory, repositoryDirectory } = repositoryPaths();

  if (checkoutExists(repositoryDirectory)) {
    onProgress?.("Pulling latest changes...");
    await pullRepository(token, repositoryDirectory);
  } else {
    deleteDirectory(repositoryDirectory);
    onProgress?.("Cloning repository...");
    await cloneRepository(token, temporaryDirectory);
  }

  return repositoryDirectory;
}

async function hasPendingPush(repositoryDirectory: string): Promise<boolean> {
  const local = await git.resolveRef({
    fs: expoFileSystem,
    dir: repositoryDirectory,
    ref: `refs/heads/${BRANCH}`,
  });

  try {
    const remote = await git.resolveRef({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      ref: `refs/remotes/origin/${BRANCH}`,
    });
    return local !== remote;
  } catch {
    return true;
  }
}

function collectPushErrors(result: PushResult): string[] {
  const errors: string[] = [];
  const legacyErrors = (result as PushResultWithErrors).errors;

  if (Array.isArray(legacyErrors)) {
    for (const error of legacyErrors) {
      errors.push(String(error));
    }
  }

  if (result.error) {
    errors.push(result.error);
  } else if (!result.ok) {
    errors.push("Push failed.");
  }

  for (const [ref, status] of Object.entries(result.refs ?? {})) {
    if (!status.ok) {
      errors.push(`${ref}: ${status.error || "push rejected"}`);
    }
  }

  return errors;
}

async function pushRepositoryInternal(
  token: string,
  repositoryDirectory: string,
): Promise<void> {
  const result = await git.push({
    fs: expoFileSystem,
    http,
    dir: repositoryDirectory,
    ref: BRANCH,
    remote: "origin",
    onAuth: () => ({ username: "x-access-token", password: token }),
  });

  const errors = collectPushErrors(result);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

async function pushPendingIfNeeded(
  token: string,
  repositoryDirectory: string,
): Promise<void> {
  if (await hasPendingPush(repositoryDirectory)) {
    await pushRepositoryInternal(token, repositoryDirectory);
  }
}

async function runSync(
  options: SyncOptions,
): Promise<RepositorySnapshot> {
  let token = "";

  try {
    token = getGitToken();
    const { repositoryDirectory } = repositoryPaths();

    if (options.retryPendingPush && checkoutExists(repositoryDirectory)) {
      options.onProgress?.("Pushing pending changes...");
      await pushPendingIfNeeded(token, repositoryDirectory);
    }

    const directory = await ensureCheckout(token, options.onProgress);

    options.onProgress?.("Reading tracked files...");
    const files = await git.listFiles({
      fs: expoFileSystem,
      dir: directory,
      ref: BRANCH,
    });

    return { files };
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

async function findCreationTimestamp(
  repositoryDirectory: string,
  fileName: string,
): Promise<number | null> {
  const timestamps: number[] = [];

  for (const filepath of [fileName, `archived/${fileName}`]) {
    const commits = await git.log({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      ref: BRANCH,
      filepath,
      force: true,
    });

    for (const commit of commits) {
      timestamps.push(commit.commit.author.timestamp);
    }
  }

  if (timestamps.length === 0) {
    return null;
  }

  return Math.min(...timestamps);
}

async function getHeadTimestamp(
  repositoryDirectory: string,
): Promise<number> {
  const [head] = await git.log({
    fs: expoFileSystem,
    dir: repositoryDirectory,
    ref: BRANCH,
    depth: 1,
  });

  return head?.commit.author.timestamp ?? 0;
}

async function getCreationTimestampsInternal(
  fileNames: readonly string[],
): Promise<Map<string, number>> {
  const repositoryDirectory = requireCheckout();
  const headOid = await git.resolveRef({
    fs: expoFileSystem,
    dir: repositoryDirectory,
    ref: `refs/heads/${BRANCH}`,
  });

  let cache = creationCache;

  if (!cache || cache.headOid !== headOid) {
    cache = { headOid, dates: new Map() };
    creationCache = cache;
  }

  const dates = new Map<string, number>();
  let headTimestamp: number | null = null;

  for (const fileName of fileNames) {
    const cached = cache.dates.get(fileName);

    if (cached !== undefined) {
      dates.set(fileName, cached);
      continue;
    }

    let createdAt = await findCreationTimestamp(repositoryDirectory, fileName);

    if (createdAt === null) {
      headTimestamp ??= await getHeadTimestamp(repositoryDirectory);
      createdAt = headTimestamp;
    }

    cache.dates.set(fileName, createdAt);
    dates.set(fileName, createdAt);
  }

  return dates;
}

export function getTaskMove(fileName: string, completed: boolean): TaskMove {
  if (fileName.length === 0 || fileName.includes("/")) {
    throw new Error("Invalid task file name.");
  }

  return completed
    ? {
        fileName,
        sourcePath: fileName,
        destinationPath: `archived/${fileName}`,
      }
    : {
        fileName,
        sourcePath: `archived/${fileName}`,
        destinationPath: fileName,
      };
}

export function syncRepository(
  options: SyncOptions = {},
): Promise<RepositorySnapshot> {
  if (Platform.OS === "web") {
    return Promise.reject(new Error(WEB_UNSUPPORTED_MESSAGE));
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = runSync(options).finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export async function getCreationTimestamps(
  fileNames: readonly string[],
): Promise<Map<string, number>> {
  if (Platform.OS === "web") {
    throw new Error(WEB_UNSUPPORTED_MESSAGE);
  }

  let token = "";

  try {
    token = getGitToken();
    return await getCreationTimestampsInternal(fileNames);
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function moveTaskFile(
  move: TaskMove,
  message: string,
): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error(WEB_UNSUPPORTED_MESSAGE);
  }

  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = requireCheckout();
    const source = repositoryPath(move.sourcePath);
    const destination = repositoryPath(move.destinationPath);

    if (!fileExists(source)) {
      throw new Error(`Task file "${move.sourcePath}" does not exist.`);
    }

    if (fileExists(destination)) {
      throw new Error(
        `A file already exists at "${move.destinationPath}".`,
      );
    }

    ensureDirectory(repositoryPath("archived"));

    const bytes = await fileSystem.readFile(source);
    await fileSystem.writeFile(destination, bytes);
    await fileSystem.unlink(source);

    await git.add({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      filepath: move.destinationPath,
    });
    await git.remove({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      filepath: move.sourcePath,
    });
    await git.commit({
      fs: expoFileSystem,
      dir: repositoryDirectory,
      ref: BRANCH,
      message,
      author: AUTHOR,
      committer: AUTHOR,
    });

    invalidateCreationCache();
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function restoreTaskFile(move: TaskMove): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error(WEB_UNSUPPORTED_MESSAGE);
  }

  let token = "";

  try {
    token = getGitToken();
    requireCheckout();

    const source = repositoryPath(move.sourcePath);
    const destination = repositoryPath(move.destinationPath);

    if (!fileExists(destination)) {
      return;
    }

    if (!fileExists(source)) {
      const bytes = await fileSystem.readFile(destination);
      await fileSystem.writeFile(source, bytes);
    }

    await fileSystem.unlink(destination);
    invalidateCreationCache();
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function resetTaskIndex(
  paths: readonly string[],
): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error(WEB_UNSUPPORTED_MESSAGE);
  }

  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = requireCheckout();

    for (const filepath of new Set(paths)) {
      await git.resetIndex({
        fs: expoFileSystem,
        dir: repositoryDirectory,
        ref: BRANCH,
        filepath,
      });
    }

    invalidateCreationCache();
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function pushRepository(): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error(WEB_UNSUPPORTED_MESSAGE);
  }

  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = requireCheckout();
    await pushRepositoryInternal(token, repositoryDirectory);
  } catch (error) {
    throw sanitizeError(error, token);
  }
}
