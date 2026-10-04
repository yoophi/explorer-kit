import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RatingInput, RatingStars } from "@yoophi/rating";
function RatingDemo({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState(2.5);
  return <div className="space-y-6"><RatingInput value={value} onChange={setValue} disabled={disabled} /><RatingStars value={value} /></div>;
}
const meta = { title: "Rating/평점", component: RatingDemo } satisfies Meta<typeof RatingDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Values: Story = { render: () => <div className="space-y-3">{[0, 0.5, 2.5, 5].map((value) => <div key={value}><RatingStars value={value} /></div>)}</div> };
