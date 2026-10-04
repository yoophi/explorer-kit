#!/usr/bin/env node
import net from "node:net";
import { spawn } from "node:child_process";


const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 1420;
const MAX_PORT = 65535;

const rootDir = process.cwd();

function parseStartPort(value, fallback) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

function normalizeHost(value) {
  const host = value || DEFAULT_HOST;
  if (!/^[\w.:-]+$/.test(host)) {
    throw new Error(`Invalid host: ${host}`);
  }

  return host;
}

function canListen(host, port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(host, startPort) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await canListen(host, port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${MAX_PORT}.`);
}

const host = normalizeHost(process.env.TAURI_DEV_HOST ?? process.env.DEV_HOST);
const startPort = parseStartPort(process.env.DEV_PORT ?? process.env.PORT, DEFAULT_PORT);
const port = await findAvailablePort(host, startPort);
const devUrlHost = host === "0.0.0.0" ? "127.0.0.1" : host;
const devUrl = `http://${devUrlHost}:${port}`;

const viteCommand = `pnpm exec vite --host ${host} --port ${port} --strictPort`;
const tauriConfig = {
  build: {
    devUrl,
    beforeDevCommand: viteCommand,
  },
};

console.log(`Starting Tauri dev server on ${devUrl}`);

const child = spawn(
  "pnpm",
  [...(process.env.TAURI_PACKAGE ? ["--filter", process.env.TAURI_PACKAGE] : []), "exec", "tauri", "dev", "--config", JSON.stringify(tauriConfig)],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      DEV_HOST: host,
      DEV_PORT: String(port),
      DEV_STRICT_PORT: "true",
    },
    stdio: "inherit",
  },
);

let isShuttingDown = false;

function shutdown(code = 0, signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (!child.killed) {
    child.kill(signal ?? "SIGTERM");
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code);
}

process.once("SIGINT", () => {
  shutdown(0, "SIGINT");
});

process.once("SIGTERM", () => {
  shutdown(0, "SIGTERM");
});

child.on("exit", (code, signal) => {
  if (signal) {
    shutdown(0, signal);
    return;
  }

  shutdown(code ?? 0);
});
