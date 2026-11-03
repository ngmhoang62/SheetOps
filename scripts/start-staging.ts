import { spawn } from "node:child_process";
import { loadStagingEnv } from "./staging-env";
try {
  loadStagingEnv();
  const command = process.argv[2] ?? "start";
  if (!["build", "start", "dev"].includes(command))
    throw new Error("Unsupported staging command");
  // Next loads .env.local too, but explicit process.env staging values win.
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      command,
      ...(command === "start" || command === "dev"
        ? ["--hostname", "127.0.0.1", "--port", "3001"]
        : []),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, VERCEL_ENV: "preview" },
    },
  );
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  child.on("error", () => {
    console.error("Staging server failed to start.");
    process.exitCode = 1;
  });
} catch {
  console.error(
    "Independent staging configuration is missing or invalid; no server started.",
  );
  process.exitCode = 1;
}
