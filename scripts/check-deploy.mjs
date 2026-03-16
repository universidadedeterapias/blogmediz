import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const REQUIRED_ENV_VARS = ["DATABASE_URL", "API_BEARER_TOKEN"];

function loadDotenv() {
  const candidates = [".env.local", ".env"];
  const loaded = [];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const result = dotenv.config({ path: file });
    if (result.error) {
      console.error(`[ERRO] Falha ao ler ${file}:`, result.error.message);
      process.exit(1);
    }
    loaded.push(file);
  }

  return loaded;
}

function assertRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    console.error(
      `[ERRO] Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`
    );
    console.error(
      "Dica: defina no seu ambiente (deploy) ou em `.env.local` (dev)."
    );
    process.exit(1);
  }
}

function run(command, args, okMessage) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (typeof result.status !== "number" || result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  if (okMessage) console.log(okMessage);
}

const loadedEnvFiles = loadDotenv();
assertRequiredEnvVars();

console.log("");
console.log("[check:deploy] Verificando pré-requisitos para deploy...");
console.log(
  `[OK] Env vars (${REQUIRED_ENV_VARS.length})` +
    (loadedEnvFiles.length ? ` via ${loadedEnvFiles.join(", ")}` : "")
);

run("npx", ["tsc", "--noEmit"], "[OK] TypeScript");
run("npm", ["run", "build"], "[OK] Build");

console.log("Pronto para deploy.");
