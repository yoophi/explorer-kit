import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({ entryPoints: ["examples/consumer/src/index.tsx"], bundle: true, platform: "browser", format: "esm", outfile: "dist/consumer.js", jsx: "automatic" });
const result = spawnSync("pnpm", ["exec", "tailwindcss", "-i", "examples/consumer/src/styles.css", "-o", "dist/consumer.css"], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
