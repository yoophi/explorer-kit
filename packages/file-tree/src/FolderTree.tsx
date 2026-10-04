import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { toAbsolutePath, toTreeId } from "./lib/paths";

export interface FolderTreeProps {
  /**
   * Absolute path of the tree root (e.g. the home directory). All other
   * paths are absolute and must be descendants of this.
   */
  root: string;
  /**
   * Absolute paths of the root's immediate subdirectories. The tree model is
   * created once from these — mount the component only after they are known.
   */
  initialDirs: string[];
  /** Currently selected absolute folder path, or null. Controlled. */
  selectedPath: string | null;
  /**
   * Absolute paths of the known subdirectories of `selectedPath`, lazily
   * grafted into the tree as they become available. Pass [] while unknown.
   */
  childDirs: string[];
  /** Fired when the user picks a folder in the tree. Always absolute. */
  onSelectFolder: (absolutePath: string) => void;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * Controlled folder tree on top of `@pierre/trees`. Owns the tree<->selection
 * sync rules; data loading and selection state live with the caller.
 */
export function FolderTree({
  root,
  initialDirs,
  selectedPath,
  childDirs,
  onSelectFolder,
  className,
  style,
  "aria-label": ariaLabel,
}: FolderTreeProps) {
  // Tree -> caller must be event-driven, not render-driven. Deriving it from
  // useFileTreeSelection loops: the hook returns a fresh array identity on
  // every render, so an effect keyed on it re-fires after each selectedPath
  // change and pushes the then-stale tree selection back to the caller,
  // ping-ponging with the selectedPath -> tree effect below. onSelectionChange
  // fires only when the selection actually changes; the ref keeps its logic
  // current without recreating the model.
  const selectedPathRef = useRef(selectedPath);
  const handleSelectionChangeRef = useRef<(paths: readonly string[]) => void>(
    () => {},
  );
  const { model } = useFileTree({
    paths: initialDirs
      .map((dir) => toTreeId(dir, root))
      .filter((id): id is string => id !== null),
    initialExpansion: "closed",
    // Flattening collapses single-child chains ("a / b") into one row whose id
    // is the terminal path, which silently drops the selection highlight from
    // the intermediate folder the user actually clicked. Every folder gets its
    // own selectable row instead.
    flattenEmptyDirectories: false,
    onSelectionChange: (paths) => handleSelectionChangeRef.current(paths),
  });

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    handleSelectionChangeRef.current = (paths) => {
      // Programmatic select() is additive, so the most recent entry (last)
      // is the folder the user actually picked. Public ids are root-relative;
      // the caller speaks absolute paths.
      const treeId = paths[paths.length - 1];
      if (treeId === undefined) return;
      const absolute = toAbsolutePath(treeId, root);
      if (absolute !== selectedPathRef.current) onSelectFolder(absolute);
    };
  }, [root, onSelectFolder]);

  // Lazily grow the tree with the selected folder's known subdirectories.
  useEffect(() => {
    for (const dir of childDirs) {
      const treeId = toTreeId(dir, root);
      if (treeId !== null && model.getItem(treeId) === null) {
        model.add(treeId);
      }
    }
  }, [childDirs, model, root]);

  // selectedPath -> tree: keep exactly one row — the selected folder —
  // highlighted. select() does not clear previous selections, so stale ones
  // (e.g. the parent folder after navigating into a child) are deselected
  // explicitly.
  useEffect(() => {
    if (selectedPath === null) return;
    const treeId = selectedPath === root ? null : toTreeId(selectedPath, root);
    if (treeId !== null && model.getItem(treeId) === null) {
      // Folder reached from outside the tree before its row exists (e.g. a
      // deep link): graft it in, ancestors are created implicitly.
      model.add(treeId);
    }
    const item = treeId !== null ? model.getItem(treeId) : null;
    if (treeId !== null && item !== null && !item.isSelected()) {
      // Expand ancestors so the newly highlighted row is actually visible
      // (e.g. navigating from a file list while the branch is folded).
      const segments = treeId.split("/").filter(Boolean);
      for (let depth = 1; depth < segments.length; depth++) {
        const ancestor = model.getItem(`${segments.slice(0, depth).join("/")}/`);
        if (ancestor !== null && "expand" in ancestor && !ancestor.isExpanded()) {
          ancestor.expand();
        }
      }
      item.select();
      model.scrollToPath(treeId, { focus: false });
    }
    for (const path of model.getSelectedPaths()) {
      if (path !== treeId) model.getItem(path)?.deselect();
    }
  }, [selectedPath, model, root]);

  return (
    <FileTree
      model={model}
      aria-label={ariaLabel ?? "Folder tree"}
      className={className}
      style={{ height: "100%", ...style }}
    />
  );
}
