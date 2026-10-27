import type { FsClient } from "isomorphic-git";

export type GitFileSystem = {
  gitFs: FsClient;
  repositoryDirectory: string;
  temporaryDirectory: string;
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  unlink(path: string): Promise<void>;
  mkdirp(path: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
};
