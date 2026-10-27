import { Buffer } from "buffer";
import { Directory, File, Paths } from "expo-file-system";
import type { FsClient } from "isomorphic-git";

import { REPOSITORY_DIRECTORY } from "../config";
import type { GitFileSystem } from "./types";

type ExpoFileStats = {
  mode: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  mtime: Date;
  ctime: Date;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
};

type FsError = Error & {
  code: string;
  path: string;
  syscall: string;
};

type ReadFileOptions = { encoding?: string | null } | string | null | undefined;
type WriteFileOptions = { encoding?: string | null } | string | null | undefined;
type Data = string | Uint8Array | ArrayBuffer;

const FILE_MODE = 0o100644;
const DIRECTORY_MODE = 0o040000;

function getDocumentDirectory(): string {
  const uri = Paths.document.uri;
  const withoutScheme = uri.startsWith("file://")
    ? uri.slice("file://".length)
    : uri;
  return withoutScheme.replace(/\/+$/, "") || "/";
}

function toFileUri(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }
  return `file://${path.startsWith("/") ? "" : "/"}${path}`;
}

function dirname(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return "/";
  }
  return normalized.slice(0, index);
}

function fsError(code: string, path: string, syscall: string): FsError {
  const error = new Error(`${code}: ${syscall} '${path}'`) as FsError;
  error.code = code;
  error.path = path;
  error.syscall = syscall;
  return error;
}

function mapError(error: unknown, path: string, syscall: string): FsError {
  if (typeof error === "object" && error !== null && "code" in error) {
    const withCode = error as FsError;
    if (typeof withCode.code === "string") {
      return withCode;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("already exists")) {
    return fsError("EEXIST", path, syscall);
  }
  if (lower.includes("not a directory")) {
    return fsError("ENOTDIR", path, syscall);
  }
  if (lower.includes("not empty")) {
    return fsError("ENOTEMPTY", path, syscall);
  }
  if (lower.includes("not found") || lower.includes("does not exist")) {
    return fsError("ENOENT", path, syscall);
  }

  const mapped = new Error(message) as FsError;
  mapped.code = "EIO";
  mapped.path = path;
  mapped.syscall = syscall;
  return mapped;
}

function directoryExists(path: string): boolean {
  try {
    return new Directory(toFileUri(path)).exists;
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

function makeStats(
  kind: "file" | "directory",
  info: { size?: number; modificationTime?: number; creationTime?: number },
): ExpoFileStats {
  const mtimeMs = info.modificationTime ?? 0;
  const ctimeMs = info.creationTime ?? mtimeMs;

  return {
    mode: kind === "directory" ? DIRECTORY_MODE : FILE_MODE,
    size: info.size ?? 0,
    mtimeMs,
    ctimeMs,
    mtime: new Date(mtimeMs),
    ctime: new Date(ctimeMs),
    isFile: () => kind === "file",
    isDirectory: () => kind === "directory",
    isSymbolicLink: () => false,
  };
}

function statPath(path: string, syscall: string): ExpoFileStats {
  const directory = new Directory(toFileUri(path));
  try {
    const info = directory.info();
    if (info.exists) {
      return makeStats("directory", info);
    }
  } catch {
    // Not a directory; probe the file constructor instead.
  }

  const file = new File(toFileUri(path));
  try {
    const info = file.info();
    if (info.exists) {
      return makeStats("file", info);
    }
  } catch {
    // Not a file either; report the path as missing below.
  }

  throw fsError("ENOENT", path, syscall);
}

function ensureParentDirectory(path: string): void {
  const parent = dirname(path);
  if (!parent || parent === "/") {
    return;
  }

  try {
    new Directory(toFileUri(parent)).create({
      intermediates: true,
      idempotent: true,
    });
  } catch (error) {
    if (!directoryExists(parent)) {
      throw mapError(error, parent, "mkdir");
    }
  }
}

function normalizeEncoding(
  options: ReadFileOptions | WriteFileOptions,
): string | undefined {
  if (typeof options === "string") {
    return options;
  }
  if (
    options &&
    typeof options === "object" &&
    typeof options.encoding === "string"
  ) {
    return options.encoding;
  }
  return undefined;
}

async function readFile(
  path: string,
  options?: ReadFileOptions,
): Promise<Buffer | string> {
  if (!fileExists(path)) {
    throw fsError("ENOENT", path, "readFile");
  }

  const file = new File(toFileUri(path));
  const encoding = normalizeEncoding(options);

  try {
    if (encoding) {
      return await file.text();
    }
    return Buffer.from(await file.bytes());
  } catch (error) {
    throw mapError(error, path, "readFile");
  }
}

async function writeFile(
  path: string,
  data: Data,
  options?: WriteFileOptions,
): Promise<void> {
  ensureParentDirectory(path);

  const file = new File(toFileUri(path));
  const encoding = normalizeEncoding(options);

  try {
    if (!file.exists) {
      file.create({ intermediates: false, overwrite: false });
    }
    await file.write(
      data,
      encoding === "base64" ? { encoding: "base64" } : undefined,
    );
  } catch (error) {
    throw mapError(error, path, "writeFile");
  }
}

async function unlink(path: string): Promise<void> {
  if (!fileExists(path)) {
    throw fsError("ENOENT", path, "unlink");
  }

  try {
    new File(toFileUri(path)).delete();
  } catch (error) {
    throw mapError(error, path, "unlink");
  }
}

async function readdir(path: string): Promise<string[]> {
  if (!directoryExists(path)) {
    if (fileExists(path)) {
      throw fsError("ENOTDIR", path, "readdir");
    }
    throw fsError("ENOENT", path, "readdir");
  }

  try {
    return new Directory(toFileUri(path)).list().map(entry => entry.name);
  } catch (error) {
    throw mapError(error, path, "readdir");
  }
}

async function mkdir(path: string): Promise<void> {
  const directory = new Directory(toFileUri(path));
  if (directory.exists || fileExists(path)) {
    throw fsError("EEXIST", path, "mkdir");
  }

  const parent = dirname(path);
  if (parent && parent !== path && !directoryExists(parent)) {
    throw fsError("ENOENT", path, "mkdir");
  }

  try {
    directory.create({ intermediates: false, idempotent: false });
  } catch (error) {
    throw mapError(error, path, "mkdir");
  }
}

type RmdirOptions = {
  recursive?: boolean;
  force?: boolean;
};

async function rmdir(path: string, options?: RmdirOptions): Promise<void> {
  try {
    if (!directoryExists(path)) {
      if (fileExists(path)) {
        if (options?.recursive || options?.force) {
          new File(toFileUri(path)).delete();
          return;
        }
        throw fsError("ENOTDIR", path, "rmdir");
      }
      if (!options?.force) {
        throw fsError("ENOENT", path, "rmdir");
      }
      return;
    }

    const directory = new Directory(toFileUri(path));
    if (!options?.recursive && directory.list().length > 0) {
      throw fsError("ENOTEMPTY", path, "rmdir");
    }
    directory.delete();
  } catch (error) {
    throw mapError(error, path, "rmdir");
  }
}

async function stat(path: string): Promise<ExpoFileStats> {
  return statPath(path, "stat");
}

async function lstat(path: string): Promise<ExpoFileStats> {
  return statPath(path, "lstat");
}

async function chmod(): Promise<void> {
  // expo-file-system does not expose Unix modes; permissions are ignored.
}

async function readlink(path: string): Promise<string> {
  throw fsError("ENOSYS", path, "readlink");
}

async function symlink(target: string, path: string): Promise<void> {
  throw fsError("ENOSYS", path, "symlink");
}

const promises = {
  readFile,
  writeFile,
  unlink,
  readdir,
  mkdir,
  rmdir,
  stat,
  lstat,
  chmod,
  readlink,
  symlink,
};

const gitFs: FsClient = { promises };

async function exists(path: string): Promise<boolean> {
  return fileExists(path) || directoryExists(path);
}

async function readFileBytes(path: string): Promise<Uint8Array> {
  const data = await readFile(path);

  if (typeof data === "string") {
    return new Uint8Array(Buffer.from(data, "utf8"));
  }

  return new Uint8Array(data);
}

async function mkdirp(path: string): Promise<void> {
  new Directory(toFileUri(path)).create({
    intermediates: true,
    idempotent: true,
  });
}

async function removeDirectory(path: string): Promise<void> {
  try {
    const directory = new Directory(toFileUri(path));
    if (directory.exists) {
      directory.delete();
    }
  } catch {
    // Best-effort cleanup; a failed cleanup surfaces on the next operation.
  }
}

async function rename(from: string, to: string): Promise<void> {
  const targetName = to.replace(/\/+$/, "").split("/").pop() ?? to;
  new Directory(toFileUri(from)).rename(targetName);
}

const documentDirectory = getDocumentDirectory();

export const gitFileSystem: GitFileSystem = {
  gitFs,
  repositoryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}`,
  temporaryDirectory: `${documentDirectory}/${REPOSITORY_DIRECTORY}.tmp`,
  exists,
  readFile: readFileBytes,
  writeFile: async (path, data) => writeFile(path, data),
  unlink,
  mkdirp,
  removeDirectory,
  rename,
};
