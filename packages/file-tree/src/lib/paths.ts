/**
 * `@pierre/trees` keys rows by paths relative to the tree root; directories
 * carry a trailing slash. These helpers convert between those relative ids
 * and the absolute paths the rest of the app (and the backend) speaks.
 */

export function toTreeId(absolutePath: string, root: string): string | null {
  if (!absolutePath.startsWith(`${root}/`)) return null;
  return `${absolutePath.slice(root.length + 1)}/`;
}

export function toAbsolutePath(treeId: string, root: string): string {
  return `${root}/${treeId.replace(/\/+$/, "")}`;
}
