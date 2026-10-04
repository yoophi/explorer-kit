import type { Meta, StoryObj } from "@storybook/react-vite";
import { compatibleButtonVariants } from "@yoophi/ui-radix/components/compatible-button";
import { cn } from "@yoophi/ui-radix/lib/utils";
import themeCss from "./compatible-theme.css?inline";

const meta = { title: "Radix UI/호환 테마" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const buttons = (["default", "outline", "secondary", "ghost"] as const)
  .map((variant) => `<button class="${cn(compatibleButtonVariants({ variant }))}">${variant}</button>`)
  .join(" ");
const documentHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${themeCss}</style></head><body style="padding:24px"><h1 style="margin-bottom:16px">Movie · Repo 호환 테마</h1><div>${buttons}</div><p style="margin-top:16px">기존 밝은 색상과 0.5rem radius를 유지합니다.</p></body></html>`;

/** Isolate global tokens so the Base UI theme used by other stories stays intact. */
export const MovieAndRepo: Story = {
  render: () => <iframe title="Movie와 Repo 호환 테마" srcDoc={documentHtml} className="h-64 w-full rounded border" />,
};
