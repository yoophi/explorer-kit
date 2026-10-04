import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal: (config) => mergeConfig(config, { plugins: [tailwindcss()], resolve: { dedupe: ["react", "react-dom"] } }),
};
export default config;
