import type { Meta, StoryObj } from "@storybook/react-vite";
import { CompatibleButton } from "@yoophi/ui-radix/components/compatible-button";

const meta = { title: "Radix UI/호환 버튼", component: CompatibleButton, args: { children: "버튼" } } satisfies Meta<typeof CompatibleButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const MovieAndRepoVariants: Story = { render: () => <div className="flex flex-wrap items-center gap-3">{(["default", "outline", "secondary", "ghost"] as const).map((variant) => <CompatibleButton key={variant} variant={variant}>{variant}</CompatibleButton>)}<CompatibleButton size="sm">Small</CompatibleButton><CompatibleButton size="lg">Large</CompatibleButton><CompatibleButton size="icon" aria-label="아이콘 버튼">★</CompatibleButton><CompatibleButton disabled>Disabled</CompatibleButton></div> };
export const KeyboardAndAsChild: Story = { render: () => <div className="flex gap-3"><CompatibleButton onClick={() => {}}>Tab 후 Enter/Space</CompatibleButton><CompatibleButton asChild variant="outline"><a href="#storybook-preview-wrapper">키보드 링크</a></CompatibleButton></div> };
