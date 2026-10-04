import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FacetChips, TagCloud } from "@yoophi/ui-base/components/facet-chips";
import { ThumbnailField } from "@yoophi/ui-base/components/thumbnail-field";
import { AsyncFormDialog } from "@yoophi/ui-base/components/async-form-dialog";
import { GroupCreateRow, GroupRowActions, GroupSelector } from "@yoophi/ui-base/components/group-controls";
import { ScanStatusPanel } from "@yoophi/ui-base/components/scan-status-panel";

const meta = { title: "Composite UI/공통 화면 요소" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const folderTags = [
  { key: "artist-a", label: "Artist A", count: 12 },
  { key: "artist-b", label: "Artist B", count: 4 },
  { key: "missing", label: "미입력", count: 2 },
];

function FolderFacetsExample() {
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="grid gap-3"><p>Folder: artist filter and context action slot</p><TagCloud label="아티스트" items={folderTags} selectedKey={selected} onSelect={(key) => setSelected(selected === key ? null : key)} sizeClassName={(count) => count > 10 ? "text-base" : "text-xs"} action={<button type="button" className="text-xs underline">별칭 관리</button>} /></div>;
}

function BookmarkFacetsExample() {
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="grid gap-3"><p>Bookmark: group key counts, including a disabled key</p><FacetChips label="그룹 키" items={[{ key: "docs", label: "docs", count: 8 }, { key: "work", label: "work", count: 3 }, { key: "archived", label: "archived", count: 0, disabled: true }]} selectedKey={selected} onSelect={(key) => setSelected(selected === key ? null : key)} /></div>;
}

export const FacetsForFolderAndBookmark: Story = { render: () => <div className="grid gap-8"><FolderFacetsExample /><BookmarkFacetsExample /><FacetChips label="빈 필터" items={[]} selectedKey={null} onSelect={() => {}} empty={<span className="text-sm text-muted-foreground">표시할 태그가 없습니다.</span>} /></div> };

export const ThumbnailStates: Story = { render: () => <div className="grid max-w-2xl gap-4 sm:grid-cols-2"><ThumbnailField src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect width='200' height='100' fill='%2385a'/%3E%3Ctext x='30' y='55' fill='white'%3Epreview%3C/text%3E%3C/svg%3E" alt="미리보기 예시" actions={<button type="button" className="rounded border px-2">이미지 교체</button>} /><ThumbnailField alt="선택된 이미지 없음" placeholder="path를 입력한 뒤 이미지를 붙여넣으세요" busy error="이미지를 저장할 수 없습니다." actions={<button type="button" disabled className="rounded border px-2">처리 중</button>} /></div> };

function AsyncDialogExample({ failing = false }: { failing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return <><button type="button" className="rounded border px-3 py-2" onClick={() => setOpen(true)}>{failing ? "오류 예제 열기" : "그룹 편집 열기"}</button><AsyncFormDialog open={open} onOpenChange={setOpen} title="그룹 편집" description="Folder와 Bookmark가 각자의 필드를 이 영역에 넣습니다." submitLabel="저장" closeOnSuccess onSubmit={async () => { await new Promise((resolve) => setTimeout(resolve, 600)); if (failing) throw new Error("저장에 실패했습니다."); }}><label className="grid gap-1">그룹 이름<input className="rounded border p-2" value={name} onChange={(event) => setName(event.target.value)} /></label></AsyncFormDialog></>;
}

export const AsyncDialogNormalAndError: Story = { render: () => <div className="flex gap-3"><AsyncDialogExample /><AsyncDialogExample failing /></div> };
export const AsyncDialogPending: Story = { render: () => <AsyncFormDialog open onOpenChange={() => {}} title="외부 저장 중" onSubmit={() => {}} pending><input aria-label="잠긴 필드 예시" disabled placeholder="저장 중" /></AsyncFormDialog> };
export const AsyncDialogComposedSubmit: Story = { render: () => <AsyncFormDialog open onOpenChange={() => {}} title="링크 가져오기" onSubmit={() => true} submitLabel={<><span aria-hidden="true">📋</span> 3개 추가</>} formClassName="block" submitClassName="gap-2"><textarea aria-label="마크다운 링크" className="w-full rounded border p-2" defaultValue="[제목](https://example.com)" /></AsyncFormDialog> };

function GroupControlsExample() {
  const [group, setGroup] = useState("movies");
  const [draft, setDraft] = useState("");
  return <div className="grid max-w-lg gap-5"><p>Folder: 이름과 폴더 수를 선택</p><GroupSelector label="폴더 그룹" options={[{ key: "movies", label: "영화", count: 12 }, { key: "drama", label: "드라마", count: 5 }]} selectedKey={group} onSelect={setGroup} /><p>Bookmark: 생성 행에 앱별 base URL 필드를 추가</p><GroupCreateRow label="새 사이트 그룹" value={draft} onChange={setDraft} onCreate={() => setDraft("")} fields={<input aria-label="base URL" placeholder="https://example.com" className="h-8 rounded border px-2" />} /><GroupRowActions active={group === "movies"} onActivate={() => setGroup("movies")} onDelete={() => {}} deleteDisabled extra={<button type="button" className="text-xs underline">편집</button>} /><GroupSelector label="빈 그룹" options={[]} selectedKey="" onSelect={() => {}} disabled /></div>;
}

export const GroupControlsForFolderAndBookmark: Story = { render: () => <GroupControlsExample /> };

export const ScanStatusStates: Story = { render: () => <div className="grid max-w-lg gap-4"><ScanStatusPanel phase="폴더 탐색 중" status="running" counts={[{ key: "folders", label: "폴더", value: 12 }]} path="/home/user/Movies" onCancel={() => {}} summary={<p className="text-xs">부분 목록 12개를 표시 중입니다.</p>} /><ScanStatusPanel phase="저장소 검사 중" counts={[{ key: "visited", label: "방문", value: 44 }, { key: "found", label: "저장소", value: 3 }]} path="/projects/repo" onCancel={() => {}} cancelDisabled /><ScanStatusPanel phase="스캔 실패" status="failed" error="권한이 없습니다." onRetry={() => {}} /><ScanStatusPanel phase="대기 중" message="경로를 선택하세요." /></div> };
