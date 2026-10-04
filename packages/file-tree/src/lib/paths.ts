/**
 * `@pierre/trees` keys rows by paths relative to the tree root; directories
 * carry a trailing slash. These helpers convert between those relative ids
 * and the absolute paths the rest of the app (and the backend) speaks.
 */

function withoutTrailingSeparators(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function toTreeId(absolutePath: string, root: string): string | null {
  const normalizedRoot = withoutTrailingSeparators(root);
  const normalizedPath = withoutTrailingSeparators(absolutePath);
  if (normalizedPath === normalizedRoot) return null;
  const prefix = normalizedRoot === "/" ? "/" : `${normalizedRoot}/`;
  if (!normalizedPath.startsWith(prefix)) return null;
  return `${normalizedPath.slice(prefix.length)}/`;
}

export function toAbsolutePath(treeId: string, root: string): string {
  const normalizedRoot = withoutTrailingSeparators(root);
  const relativePath = treeId.replace(/\/+$/, "");
  if (relativePath === "") return normalizedRoot;
  return normalizedRoot === "/"
    ? `/${relativePath}`
    : `${normalizedRoot}/${relativePath}`;
}
