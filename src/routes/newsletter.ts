import type { Request, Response } from "express";
import { Router } from "express";
import { env } from "../config/env.js";

export const newsletterRouter = Router();

/** POST /api/newsletter — cadastro de email; encaminha para o webhook n8n. */
newsletterRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Invalid or missing email" });
    return;
  }

  const webhookUrl = env.newsletterWebhookUrl?.trim();
  if (!webhookUrl) {
    res.status(503).json({
      error: "Newsletter webhook not configured (NEWSLETTER_WEBHOOK_URL)",
    });
    return;
  }

  try {
    const forward = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!forward.ok) {
      console.error("Newsletter webhook error:", forward.status, await forward.text());
      res.status(502).json({
        error: "Webhook request failed",
        status: forward.status,
      });
      return;
    }
  } catch (e) {
    console.error("Newsletter webhook fetch error:", e);
    res.status(502).json({ error: "Failed to forward to webhook" });
    return;
  }

  res.status(200).json({ ok: true, message: "Email registered" });
});
