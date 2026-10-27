import FS from "@isomorphic-git/lightning-fs";
import type { FsClient } from "isomorphic-git";

import type { GitFileSystem } from "./types";

const FS_NAME = "todo-app-git";
const REPOSITORY_ROOT = "/todo-repo";
const TEMPORARY_ROOT = "/todo-repo.tmp";

let fsInstance: FS | null = null;

function getFs(): FS {
  if (!fsInstance) {
    fsInstance = new FS(FS_NAME);
  }
  return fsInstance;
}

function codeOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

function isNotFound(error: unknown): boolean {
  const code = codeOf(error);
  return code === "ENOENT" || code === "ENOTDIR";
}

function isAlreadyExists(error: unknown): boolean {
  return codeOf(error) === "EEXIST";
}

function joinPath(parent: string, child: string): string {
  return `${parent.replace(/\/+$/, "")}/${child}`;
}

function dirname(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return "/";
  }
  return normalized.slice(0, index);
}

const gitFs: FsClient = {
  promises: {
    readFile: (path: string, options?: { encoding?: "utf8" }) =>
      getFs().promises.readFile(path, options),
    writeFile: (
      path: string,
      data: Uint8Array | string,
      options?: { mode?: number; encoding?: "utf8" },
    ) =>
      getFs().promises.writeFile(path, data, {
        mode: options?.mode ?? 0o666,
        ...(options?.encoding ? { encoding: options.encoding } : {}),
      }),
    unlink: (path: string) => getFs().promises.unlink(path),
    readdir: (path: string) => getFs().promises.readdir(path),
    mkdir: (path: string, options?: { mode?: number }) =>
      getFs().promises.mkdir(path, { mode: options?.mode ?? 0o777 }),
    rmdir: (path: string) => getFs().promises.rmdir(path),
    stat: (path: string) => getFs().promises.stat(path),
    lstat: (path: string) => getFs().promises.lstat(path),
    readlink: (path: string) => getFs().promises.readlink(path),
    symlink: (target: string, path: string) =>
      getFs().promises.symlink(target, path),
  },
};

async function exists(path: string): Promise<boolean> {
  try {
    await getFs().promises.lstat(path);
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

async function readFile(path: string): Promise<Uint8Array> {
  const data = await getFs().promises.readFile(path);

  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  return data;
}

async function writeFile(path: string, data: Uint8Array): Promise<void> {
  await mkdirp(dirname(path));
  await getFs().promises.writeFile(path, data, { mode: 0o666 });
}

async function unlink(path: string): Promise<void> {
  await getFs().promises.unlink(path);
}

async function mkdirp(path: string): Promise<void> {
  const normalized = path.replace(/\/+$/, "") || "/";

  if (normalized === "/") {
    return;
  }

  const segments = normalized.split("/").filter(segment => segment.length > 0);
  let current = "";

  for (const segment of segments) {
    current += `/${segment}`;

    try {
      await getFs().promises.mkdir(current, { mode: 0o777 });
    } catch (error) {
      if (!isAlreadyExists(error)) {
        throw error;
      }
    }
  }
}

async function removeDirectoryInternal(path: string): Promise<void> {
  const fs = getFs().promises;
  let entries: string[];

  try {
    entries = await fs.readdir(path);
  } catch (error) {
    if (isNotFound(error)) {
      try {
        await fs.unlink(path);
      } catch {
        // The path is already gone.
      }
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const child = joinPath(path, entry);
    let isDirectory = false;

    try {
      isDirectory = (await fs.lstat(child)).isDirectory();
    } catch {
      continue;
    }

    if (isDirectory) {
      await removeDirectoryInternal(child);
    } else {
      try {
        await fs.unlink(child);
      } catch {
        // Best-effort file removal.
      }
    }
  }

  try {
    await fs.rmdir(path);
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

async function removeDirectory(path: string): Promise<void> {
  try {
    await removeDirectoryInternal(path);
  } catch {
    // Best-effort cleanup; a failed cleanup surfaces on the next operation.
  }
}

async function rename(from: string, to: string): Promise<void> {
  await mkdirp(dirname(to));
  await getFs().promises.rename(from, to);
}

export const gitFileSystem: GitFileSystem = {
  gitFs,
  repositoryDirectory: REPOSITORY_ROOT,
  temporaryDirectory: TEMPORARY_ROOT,
  exists,
  readFile,
  writeFile,
  unlink,
  mkdirp,
  removeDirectory,
  rename,
};
