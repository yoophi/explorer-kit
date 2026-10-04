import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";
function Theme({ dark, children }: PropsWithChildren<{ dark: boolean }>) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);
  return <div className="min-h-screen bg-background p-6 text-foreground">{children}</div>;
}
const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: { theme: { description: "색상 테마", toolbar: { icon: "circlehollow", items: [{ value: "light", title: "Light" }, { value: "dark", title: "Dark" }] } } },
  initialGlobals: { theme: "light" },
  decorators: [(Story, context) => <Theme dark={context.globals.theme === "dark"}><Story /></Theme>],
  parameters: { layout: "fullscreen", controls: { expanded: true }, options: { storySort: { order: ["Settings", "Explorer", "Rating", "Base UI", "Radix UI"] } } },
};
export default preview;
