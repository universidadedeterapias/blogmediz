#!/usr/bin/env node
/**
 * Publica o artigo Diabetes via POST /api/articles.
 * Uso: node scripts/publish-diabetes.mjs [baseUrl]
 * baseUrl padrão: http://localhost:3000
 * Requer API_BEARER_TOKEN no .env
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
dotenv.config({ path: join(root, ".env") });
dotenv.config({ path: join(root, ".env.local"), override: true });
const baseUrl = process.argv[2] || "http://localhost:3000";
const token = process.env.API_BEARER_TOKEN;

if (!token) {
  console.error("Erro: API_BEARER_TOKEN não definido no .env");
  process.exit(1);
}

const jsonPath = join(__dirname, "seed-diabetes-article.json");
const body = JSON.parse(readFileSync(jsonPath, "utf-8"));

const res = await fetch(baseUrl + "/api/articles", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify(body),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Erro:", res.status, data);
  process.exit(1);
}
console.log("Artigo publicado:", data.slug, "—", data.title);
