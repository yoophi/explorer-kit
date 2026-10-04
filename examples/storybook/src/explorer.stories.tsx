import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileList } from "@yoophi/file-list";
import { FolderTree } from "@yoophi/file-tree";
const entries = [
  { name: "Movies", path: "/demo/Movies", isDir: true, size: 0, modifiedMs: 1735689600000 },
  { name: "README.md", path: "/demo/README.md", isDir: false, size: 2048, modifiedMs: 1735689600000 },
];
function ExplorerDemo() {
  const [path, setPath] = useState<string | null>("/demo");
  return <div className="space-y-3"><button className="rounded border px-3 py-1" onClick={() => setPath("/demo")}>루트로 이동</button><div className="flex h-80 rounded border"><div className="w-64 border-r"><FolderTree root="/demo" initialDirs={["/demo/Movies", "/demo/Documents"]} selectedPath={path} childDirs={path === "/demo/Movies" ? ["/demo/Movies/Archive"] : []} onSelectFolder={setPath} /></div><FileList className="min-w-0 flex-1" selectedPath={path} entries={path === "/demo" ? entries : []} loading={false} error={null} onOpenFolder={setPath} /></div></div>;
}
const meta = { title: "Explorer/File List", component: FileList, args: { selectedPath: "/demo", entries, loading: false, error: null, onOpenFolder: () => {} }, decorators: [(Story) => <div className="h-80 rounded border"><Story /></div>] } satisfies Meta<typeof FileList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Populated: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { entries: [] } };
export const ReadError: Story = { args: { error: "Permission denied: /demo" } };
export const TreeAndList: Story = { decorators: [], render: () => <ExplorerDemo /> };
