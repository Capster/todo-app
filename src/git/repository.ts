import { Buffer } from "buffer";
import git, { type PushResult } from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { Platform } from "react-native";

import {
  AUTHOR,
  BRANCH,
  getGitToken,
  REPOSITORY_URL,
  requireGitCorsProxy,
} from "./config";
import { messageOf, redactToken } from "../utils/errors";
import { gitFileSystem } from "./fileSystem";

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

export type TaskLocation = {
  fileName: string;
  completed: boolean;
};

type PushResultWithErrors = PushResult & {
  errors?: unknown;
};

let syncInFlight: Promise<RepositorySnapshot> | null = null;
let creationCache: { headOid: string; dates: Map<string, number> } | null =
  null;

function repositoryPath(path: string): string {
  return `${gitFileSystem.repositoryDirectory}/${path}`;
}

function taskPath(location: TaskLocation): string {
  if (location.fileName.length === 0 || location.fileName.includes("/")) {
    throw new Error("Invalid task file name.");
  }

  return location.completed
    ? `archived/${location.fileName}`
    : location.fileName;
}

function taskDestinationPath(
  location: TaskLocation,
  fileName: string,
): string {
  if (fileName.length === 0 || fileName.includes("/")) {
    throw new Error("Invalid task file name.");
  }

  return location.completed ? `archived/${fileName}` : fileName;
}

function networkOptions(): { http: typeof http; corsProxy?: string } {
  if (Platform.OS === "web") {
    return { http, corsProxy: requireGitCorsProxy() };
  }

  return { http };
}

async function checkoutExists(): Promise<boolean> {
  return gitFileSystem.exists(
    `${gitFileSystem.repositoryDirectory}/.git/HEAD`,
  );
}

export function hasCheckout(): Promise<boolean> {
  return checkoutExists();
}

async function requireCheckout(): Promise<string> {
  if (!(await checkoutExists())) {
    throw new Error("The repository has not been checked out yet.");
  }

  return gitFileSystem.repositoryDirectory;
}

async function assertTaskFilePathAvailable(fileName: string): Promise<void> {
  if (fileName.length === 0 || fileName.includes("/")) {
    throw new Error("Invalid task file name.");
  }

  for (const path of [fileName, `archived/${fileName}`]) {
    if (await gitFileSystem.exists(repositoryPath(path))) {
      throw new Error(`A file already exists at "${path}".`);
    }
  }
}

function sanitizeError(error: unknown, token: string): Error {
  return new Error(redactToken(messageOf(error), token));
}

function invalidateCreationCache(): void {
  creationCache = null;
}

async function cloneRepository(
  token: string,
  temporaryDirectory: string,
): Promise<void> {
  await gitFileSystem.removeDirectory(temporaryDirectory);

  try {
    await git.clone({
      ...networkOptions(),
      fs: gitFileSystem.gitFs,
      dir: temporaryDirectory,
      url: REPOSITORY_URL,
      ref: BRANCH,
      singleBranch: true,
      onAuth: () => ({ username: "x-access-token", password: token }),
    });

    await gitFileSystem.rename(
      temporaryDirectory,
      gitFileSystem.repositoryDirectory,
    );
  } catch (error) {
    await gitFileSystem.removeDirectory(temporaryDirectory);
    throw error;
  }
}

async function pullRepository(
  token: string,
  repositoryDirectory: string,
): Promise<void> {
  await git.pull({
    ...networkOptions(),
    fs: gitFileSystem.gitFs,
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
  const { temporaryDirectory, repositoryDirectory } = gitFileSystem;

  if (await checkoutExists()) {
    onProgress?.("Pulling latest changes...");
    await pullRepository(token, repositoryDirectory);
  } else {
    await gitFileSystem.removeDirectory(repositoryDirectory);
    onProgress?.("Cloning repository...");
    await cloneRepository(token, temporaryDirectory);
  }

  return repositoryDirectory;
}

async function hasPendingPush(repositoryDirectory: string): Promise<boolean> {
  const local = await git.resolveRef({
    fs: gitFileSystem.gitFs,
    dir: repositoryDirectory,
    ref: `refs/heads/${BRANCH}`,
  });

  try {
    const remote = await git.resolveRef({
      fs: gitFileSystem.gitFs,
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
    ...networkOptions(),
    fs: gitFileSystem.gitFs,
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

async function runSync(options: SyncOptions): Promise<RepositorySnapshot> {
  let token = "";

  try {
    if (Platform.OS === "web") {
      requireGitCorsProxy();
    }

    token = getGitToken();

    if (options.retryPendingPush && (await checkoutExists())) {
      options.onProgress?.("Pushing pending changes...");
      await pushPendingIfNeeded(token, gitFileSystem.repositoryDirectory);
    }

    const directory = await ensureCheckout(token, options.onProgress);

    options.onProgress?.("Reading tracked files...");
    const files = await git.listFiles({
      fs: gitFileSystem.gitFs,
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
      fs: gitFileSystem.gitFs,
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
    fs: gitFileSystem.gitFs,
    dir: repositoryDirectory,
    ref: BRANCH,
    depth: 1,
  });

  return head?.commit.author.timestamp ?? 0;
}

async function getCreationTimestampsInternal(
  fileNames: readonly string[],
): Promise<Map<string, number>> {
  const repositoryDirectory = await requireCheckout();
  const headOid = await git.resolveRef({
    fs: gitFileSystem.gitFs,
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
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = runSync(options).finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export async function listTrackedFiles(): Promise<string[]> {
  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = await requireCheckout();

    return await git.listFiles({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      ref: BRANCH,
    });
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function readTaskFile(
  location: TaskLocation,
): Promise<string> {
  let token = "";

  try {
    token = getGitToken();
    await requireCheckout();

    const path = taskPath(location);
    const target = repositoryPath(path);

    if (!(await gitFileSystem.exists(target))) {
      throw new Error(`Task file "${path}" does not exist.`);
    }

    const bytes = await gitFileSystem.readFile(target);
    return Buffer.from(bytes).toString("utf8");
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function createTaskFile(
  fileName: string,
  content: string,
  message: string,
): Promise<void> {
  let token = "";
  let repositoryDirectory: string | null = null;
  let shouldCleanUp = false;

  try {
    token = getGitToken();
    repositoryDirectory = await requireCheckout();
    await assertTaskFilePathAvailable(fileName);
    shouldCleanUp = true;

    const target = repositoryPath(fileName);
    await gitFileSystem.writeFile(target, Buffer.from(content, "utf8"));
    await git.add({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      filepath: fileName,
    });
    await git.commit({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      ref: BRANCH,
      message,
      author: AUTHOR,
      committer: AUTHOR,
    });

    invalidateCreationCache();
  } catch (error) {
    if (repositoryDirectory && shouldCleanUp) {
      try {
        await gitFileSystem.unlink(repositoryPath(fileName));
      } catch {
        // The partial file may not exist.
      }

      try {
        await git.resetIndex({
          fs: gitFileSystem.gitFs,
          dir: repositoryDirectory,
          ref: BRANCH,
          filepath: fileName,
        });
      } catch {
        // Best-effort index reset; report the original failure below.
      }
    }

    invalidateCreationCache();
    throw sanitizeError(error, token);
  }
}

export async function saveTaskFile(
  current: TaskLocation,
  nextFileName: string,
  content: string,
  message: string,
): Promise<void> {
  let token = "";
  let repositoryDirectory: string | null = null;
  let sourcePath: string | null = null;
  let destinationPath: string | null = null;
  let originalBytes: Uint8Array | null = null;

  try {
    token = getGitToken();
    repositoryDirectory = await requireCheckout();
    sourcePath = taskPath(current);
    destinationPath = taskDestinationPath(current, nextFileName);

    const source = repositoryPath(sourcePath);
    const destination = repositoryPath(destinationPath);

    if (!(await gitFileSystem.exists(source))) {
      throw new Error(`Task file "${sourcePath}" does not exist.`);
    }

    if (
      destinationPath !== sourcePath &&
      (await gitFileSystem.exists(destination))
    ) {
      throw new Error(`A file already exists at "${destinationPath}".`);
    }

    originalBytes = await gitFileSystem.readFile(source);

    if (current.completed) {
      await gitFileSystem.mkdirp(repositoryPath("archived"));
    }

    await gitFileSystem.writeFile(destination, Buffer.from(content, "utf8"));

    if (destinationPath !== sourcePath) {
      await gitFileSystem.unlink(source);
    }

    await git.add({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      filepath: destinationPath,
    });

    if (destinationPath !== sourcePath) {
      await git.remove({
        fs: gitFileSystem.gitFs,
        dir: repositoryDirectory,
        filepath: sourcePath,
      });
    }

    await git.commit({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      ref: BRANCH,
      message,
      author: AUTHOR,
      committer: AUTHOR,
    });

    invalidateCreationCache();
  } catch (error) {
    if (repositoryDirectory && sourcePath && destinationPath) {
      const source = repositoryPath(sourcePath);
      const destination = repositoryPath(destinationPath);

      if (originalBytes && destinationPath !== sourcePath) {
        try {
          await gitFileSystem.unlink(destination);
        } catch {
          // The partial destination may not exist.
        }
      }

      if (originalBytes) {
        try {
          await gitFileSystem.writeFile(source, originalBytes);
        } catch {
          // Best-effort restore; report the original failure below.
        }
      }

      for (const filepath of new Set([sourcePath, destinationPath])) {
        try {
          await git.resetIndex({
            fs: gitFileSystem.gitFs,
            dir: repositoryDirectory,
            ref: BRANCH,
            filepath,
          });
        } catch {
          // Best-effort index reset; report the original failure below.
        }
      }
    }

    invalidateCreationCache();
    throw sanitizeError(error, token);
  }
}

export async function deleteTaskFile(
  location: TaskLocation,
  message: string,
): Promise<void> {
  let token = "";
  let repositoryDirectory: string | null = null;
  let sourcePath: string | null = null;
  let originalBytes: Uint8Array | null = null;

  try {
    token = getGitToken();
    repositoryDirectory = await requireCheckout();
    sourcePath = taskPath(location);

    const source = repositoryPath(sourcePath);

    if (!(await gitFileSystem.exists(source))) {
      throw new Error(`Task file "${sourcePath}" does not exist.`);
    }

    originalBytes = await gitFileSystem.readFile(source);
    await gitFileSystem.unlink(source);

    await git.remove({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      filepath: sourcePath,
    });
    await git.commit({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      ref: BRANCH,
      message,
      author: AUTHOR,
      committer: AUTHOR,
    });

    invalidateCreationCache();
  } catch (error) {
    if (repositoryDirectory && sourcePath && originalBytes) {
      try {
        await gitFileSystem.writeFile(
          repositoryPath(sourcePath),
          originalBytes,
        );
      } catch {
        // Best-effort restore; report the original failure below.
      }

      try {
        await git.resetIndex({
          fs: gitFileSystem.gitFs,
          dir: repositoryDirectory,
          ref: BRANCH,
          filepath: sourcePath,
        });
      } catch {
        // Best-effort index reset; report the original failure below.
      }
    }

    invalidateCreationCache();
    throw sanitizeError(error, token);
  }
}

export async function getCreationTimestamps(
  fileNames: readonly string[],
): Promise<Map<string, number>> {
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
  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = await requireCheckout();
    const source = repositoryPath(move.sourcePath);
    const destination = repositoryPath(move.destinationPath);

    if (!(await gitFileSystem.exists(source))) {
      throw new Error(`Task file "${move.sourcePath}" does not exist.`);
    }

    if (await gitFileSystem.exists(destination)) {
      throw new Error(`A file already exists at "${move.destinationPath}".`);
    }

    await gitFileSystem.mkdirp(repositoryPath("archived"));

    const bytes = await gitFileSystem.readFile(source);
    await gitFileSystem.writeFile(destination, bytes);
    await gitFileSystem.unlink(source);

    await git.add({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      filepath: move.destinationPath,
    });
    await git.remove({
      fs: gitFileSystem.gitFs,
      dir: repositoryDirectory,
      filepath: move.sourcePath,
    });
    await git.commit({
      fs: gitFileSystem.gitFs,
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
  let token = "";

  try {
    token = getGitToken();
    await requireCheckout();

    const source = repositoryPath(move.sourcePath);
    const destination = repositoryPath(move.destinationPath);

    if (!(await gitFileSystem.exists(destination))) {
      return;
    }

    if (!(await gitFileSystem.exists(source))) {
      const bytes = await gitFileSystem.readFile(destination);
      await gitFileSystem.writeFile(source, bytes);
    }

    await gitFileSystem.unlink(destination);
    invalidateCreationCache();
  } catch (error) {
    throw sanitizeError(error, token);
  }
}

export async function resetTaskIndex(
  paths: readonly string[],
): Promise<void> {
  let token = "";

  try {
    token = getGitToken();
    const repositoryDirectory = await requireCheckout();

    for (const filepath of new Set(paths)) {
      await git.resetIndex({
        fs: gitFileSystem.gitFs,
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
  let token = "";

  try {
    if (Platform.OS === "web") {
      requireGitCorsProxy();
    }

    token = getGitToken();
    const repositoryDirectory = await requireCheckout();
    await pushRepositoryInternal(token, repositoryDirectory);
  } catch (error) {
    throw sanitizeError(error, token);
  }
}
