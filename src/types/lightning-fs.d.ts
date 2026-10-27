declare module "@isomorphic-git/lightning-fs" {
  type LightningStats = {
    type: "file" | "dir";
    mode: number;
    size: number;
    ino: number;
    mtimeMs: number;
    atimeMs: number;
    ctimeMs: number;
    uid: number;
    gid: number;
    dev: number;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  };

  type LightningPromises = {
    readFile(
      path: string,
      options?: { encoding?: "utf8" },
    ): Promise<Uint8Array | string>;
    writeFile(
      path: string,
      data: Uint8Array | string,
      options?: { mode?: number; encoding?: "utf8" },
    ): Promise<void>;
    unlink(path: string, options?: undefined): Promise<void>;
    readdir(path: string, options?: undefined): Promise<string[]>;
    mkdir(path: string, options?: { mode?: number }): Promise<void>;
    rmdir(path: string, options?: undefined): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    stat(path: string, options?: undefined): Promise<LightningStats>;
    lstat(path: string, options?: undefined): Promise<LightningStats>;
    readlink(path: string, options?: undefined): Promise<string>;
    symlink(target: string, path: string): Promise<void>;
  };

  class FS {
    constructor(name?: string);
    readonly promises: LightningPromises;
  }

  export = FS;
}
