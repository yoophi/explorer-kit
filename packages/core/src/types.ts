export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedMs?: number;
}
