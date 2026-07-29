import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptsDir, "..");
const backendDir = resolve(frontendDir, "..", "backend");
const backendBaseUrl =
  String(process.env.VITE_API_URL || "").trim().replace(/\/+$/, "") ||
  `http://127.0.0.1:${Number(process.env.PORT || 3001)}`;
const backendHealthUrl = backendBaseUrl ? new URL("/health", `${backendBaseUrl}/`).toString() : "";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let backendProcess = null;
let viteProcess = null;

const isBackendRunning = async () => {
  if (!backendHealthUrl) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(backendHealthUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

const isPortOpen = (hostname, port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });

    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(1200);
    socket.on("connect", () => finish(true));
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
  });

const isBackendListening = async () => {
  if (!backendBaseUrl) {
    return false;
  }

  try {
    const backendUrl = new URL(backendBaseUrl.startsWith("http") ? backendBaseUrl : `http://${backendBaseUrl}`);
    const port = backendUrl.port ? Number(backendUrl.port) : backendUrl.protocol === "https:" ? 443 : 80;

    if (!backendUrl.hostname || Number.isNaN(port)) {
      return false;
    }

    return await isPortOpen(backendUrl.hostname, port);
  } catch {
    return false;
  }
};

const startProcess = (command, args, cwd) =>
  spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

const shutdown = () => {
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill("SIGTERM");
  }
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill("SIGTERM");
  }
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

const run = async () => {
  const backendAlreadyRunning = (await isBackendRunning()) || (await isBackendListening());

  if (!backendAlreadyRunning) {
    backendProcess = startProcess(npmCommand, ["run", "dev"], backendDir);
    backendProcess.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`Backend exited with code ${code}`);
      }
      if (viteProcess && !viteProcess.killed) {
        viteProcess.kill("SIGTERM");
      }
      process.exit(code ?? 0);
    });
  } else {
    console.log(`Backend already running at ${backendBaseUrl}; starting Vite only.`);
  }

  viteProcess = startProcess(npmCommand, ["run", "dev:vite"], frontendDir);
  viteProcess.on("exit", (code) => {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill("SIGTERM");
    }
    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error(error);
  shutdown();
  process.exit(1);
});
