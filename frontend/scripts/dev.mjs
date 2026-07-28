import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptsDir, "..");
const backendDir = resolve(frontendDir, "..", "backend");
const backendHealthUrl = "http://127.0.0.1:3001/health";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let backendProcess = null;
let viteProcess = null;

const isBackendRunning = async () => {
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
  const backendAlreadyRunning = await isBackendRunning();

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
