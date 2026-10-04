import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSettingsStore } from "@yoophi/settings-core";
import { useSettings } from "@yoophi/settings-core/react";
import { SettingsSection, SettingsField, SettingsToggle, SettingsStatus } from "@yoophi/settings-ui";
import { Button } from "@yoophi/ui-base/components/button";
import { Input } from "@yoophi/ui-base/components/input";
function SettingsDemo({ fail = false, invalid = false }: { fail?: boolean; invalid?: boolean }) {
  const [store] = useState(() => {
    let document: string | null = invalid ? JSON.stringify({ version: 99, value: {} }) : null;
    return createSettingsStore({ key: "storybook-only", defaults: { folder: "/demo", showHidden: false },
      storage: () => ({ getItem: () => document, setItem: (_key, value) => { if (fail) throw new Error("저장 공간에 쓸 수 없습니다."); document = value; } }),
      parse: (value: unknown) => {
        if (!value || typeof value !== "object" || !("folder" in value) || typeof value.folder !== "string" || !("showHidden" in value) || typeof value.showHidden !== "boolean") throw new Error("잘못된 설정");
        return { folder: value.folder, showHidden: value.showHidden };
      },
    });
  });
  const { value, error } = useSettings(store);
  return <div className="max-w-xl space-y-4"><SettingsSection title="탐색 설정" description="이 예제는 메모리에만 저장합니다." actions={<Button variant="outline" onClick={() => store.reset()}>설정 초기화</Button>}>
    <SettingsField label="시작 폴더" description="탐색을 시작할 경로입니다.">{(props) => <Input {...props} value={value.folder} onChange={(event) => store.update((current) => ({ ...current, folder: event.target.value }))} />}</SettingsField>
    <SettingsToggle label="숨김 파일 표시" description="숨김 파일과 폴더를 목록에 표시합니다." checked={value.showHidden} onChange={(showHidden) => store.update((current) => ({ ...current, showHidden }))} />
    <SettingsStatus error={error} />
  </SettingsSection><pre className="rounded border p-3 text-xs" aria-label="저장된 설정">{JSON.stringify(value, null, 2)}</pre></div>;
}
const meta = { title: "Settings/설정 UI와 저장", component: SettingsDemo, render: (args) => <SettingsDemo key={`${args.fail}-${args.invalid}`} {...args} />, parameters: { docs: { description: { component: "공통 설정 UI와 settings-core를 연결합니다. 각 스토리는 독립된 메모리 저장소를 사용합니다." } } } } satisfies Meta<typeof SettingsDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editable: Story = {};
export const WriteFailure: Story = { args: { fail: true } };
export const UnsupportedVersion: Story = { args: { invalid: true } };
export const Saving: Story = { render: () => <SettingsStatus saving /> };
export const Disabled: Story = { render: () => <SettingsToggle label="관리자가 잠근 설정" checked disabled onChange={() => {}} /> };
