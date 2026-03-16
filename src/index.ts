import "./load-env.js";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { app } from "./app.js";

env; // force load to validate DATABASE_URL and API_BEARER_TOKEN

const server = createServer(app);

server.listen(env.port, () => {
  console.log(`Server running at http://localhost:${env.port}`);
  if (!env.alineWebhookUrl?.trim()) {
    console.warn("[Aline] ALINE_WEBHOOK_URL não configurada — chat da Aline não funcionará");
  } else {
    console.log("[Aline] Webhook configurado");
  }
});
