import type { ReactNode } from "react";
import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { formatBytes, formatModified } from "@yoophi/explorer-core";
import type { FileEntry } from "@yoophi/explorer-core";
import { cn } from "@yoophi/ui-radix/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@yoophi/ui-radix/components/empty";
import { ScrollArea } from "@yoophi/ui-radix/components/scroll-area";
import { Skeleton } from "@yoophi/ui-radix/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yoophi/ui-radix/components/table";

export interface FileListProps {
  /** Absolute path shown in the header label, or null while unknown. */
  selectedPath: string | null;
  /** Directory entries to render. Ignored while loading or on error. */
  entries: FileEntry[] | undefined;
  /** True while the listing is being fetched — renders skeletons. */
  loading: boolean;
  /** Error to surface in the error state; null when none. */
  error: unknown;
  /** Fired when a directory row is clicked. Absolute path. */
  onOpenFolder: (absolutePath: string) => void;
  /** Right-aligned header slot for caller-provided controls. */
  headerActions?: ReactNode;
  className?: string;
}

/**
 * Controlled file listing for one folder. Data loading and navigation state
 * live with the caller.
 */
export function FileList({
  selectedPath,
  entries,
  loading,
  error,
  onOpenFolder,
  headerActions,
  className,
}: FileListProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {selectedPath ?? "…"}
        </h1>
        {headerActions}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : error != null ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Cannot read folder</EmptyTitle>
              <EmptyDescription>{String(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : entries === undefined || entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Empty folder</EmptyTitle>
              <EmptyDescription>
                This folder does not contain any visible items.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-28 text-right">Size</TableHead>
                <TableHead className="w-44">Modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.path}
                  className={entry.isDir ? "cursor-pointer" : undefined}
                  onClick={
                    entry.isDir ? () => onOpenFolder(entry.path) : undefined
                  }
                >
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {entry.isDir ? (
                        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{entry.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {entry.isDir ? "—" : formatBytes(entry.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatModified(entry.modifiedMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
