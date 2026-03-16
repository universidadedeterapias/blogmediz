import type { Request, Response } from "express";
import { Router } from "express";
import { env } from "../config/env.js";

export const alineRouter = Router();

/** POST /api/aline-chat — encaminha a mensagem do usuário para o webhook n8n e retorna a resposta. */
alineRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "Missing or empty message" });
    return;
  }

  const webhookUrl = env.alineWebhookUrl?.trim();
  if (!webhookUrl) {
    res.status(503).json({
      error: "Aline webhook not configured (ALINE_WEBHOOK_URL)",
    });
    return;
  }

  try {
    const forward = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const contentType = forward.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const raw = await forward.text();

    if (!forward.ok) {
      console.error("Aline webhook error:", forward.status, raw);
      res.status(502).json({
        error: "Webhook request failed",
        status: forward.status,
      });
      return;
    }

    let reply = "";
    if (isJson) {
      try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        reply =
          (data.reply as string) ??
          (data.text as string) ??
          (data.message as string) ??
          (data.response as string) ??
          (data.output as string) ??
          (typeof data === "string" ? data : "");
      } catch {
        reply = raw;
      }
    } else {
      reply = raw;
    }

    res.status(200).json({ reply: reply || "Desculpe, não consegui processar. Tente de novo." });
  } catch (e) {
    console.error("Aline webhook fetch error:", e);
    res.status(502).json({ error: "Failed to call webhook" });
  }
});
