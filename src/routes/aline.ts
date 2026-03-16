import type { Request, Response } from "express";
import { Router } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getWebhookSessionId } from "../lib/webhook-session.js";

export const alineRouter = Router();

const ALINE_MAX_SEARCHES = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getOrCreateSessionId(req: Request, res: Response): string {
  return getWebhookSessionId(req, res);
}

/** GET /api/aline-chat/status — verifica se o webhook está configurado (para debug local). */
alineRouter.get("/status", (_req: Request, res: Response): void => {
  const ok = !!env.alineWebhookUrl?.trim();
  res.json({ configured: ok });
});

/** POST /api/aline-chat — encaminha a mensagem do usuário para o webhook n8n e retorna a resposta. */
alineRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "Missing or empty message" });
    return;
  }

  const sessionId = getOrCreateSessionId(req, res);

  try {
    let session = await prisma.alineSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      session = await prisma.alineSession.create({
        data: { sessionId, messageCount: 0 },
      });
    }

    const isEmail = EMAIL_REGEX.test(message);

    // Se já atingiu o limite e enviou um email válido: salva lead e reseta sessão
    if (session.messageCount >= ALINE_MAX_SEARCHES && isEmail) {
      await prisma.alineLead.create({
        data: {
          email: message.trim().toLowerCase(),
          messageCount: ALINE_MAX_SEARCHES,
        },
      });
      await prisma.alineSession.update({
        where: { sessionId },
        data: { messageCount: 0 },
      });
      res.status(200).json({
        reply:
          "Obrigado! Seu email foi registrado. Em breve entraremos em contato para o mapeamento completo.",
        limitReached: false,
        emailSaved: true,
      });
      return;
    }

    // Se já atingiu o limite: não chama n8n, pede email
    if (session.messageCount >= ALINE_MAX_SEARCHES) {
      res.status(200).json({
        reply:
          "Você atingiu o limite de 3 buscas. Para continuar o mapeamento completo da sua história, deixe seu email no campo abaixo e envie.",
        limitReached: true,
      });
      return;
    }

    // Incrementa contador antes de chamar o webhook
    await prisma.alineSession.update({
      where: { sessionId },
      data: { messageCount: session.messageCount + 1 },
    });

    const webhookUrl = env.alineWebhookUrl?.trim();
    if (!webhookUrl) {
      console.warn("[Aline] ALINE_WEBHOOK_URL não configurada");
      res.status(503).json({
        error: "Aline webhook not configured (ALINE_WEBHOOK_URL)",
      });
      return;
    }

    const payload = {
      message,
      text: message,
      input: message,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    console.log(
      "[Aline] Enviando para webhook:",
      message.substring(0, 50) + "...",
      `(busca ${session.messageCount + 1}/${ALINE_MAX_SEARCHES})`
    );
    const forward = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = forward.headers.get("content-type") || "";
    const raw = await forward.text();

    if (!forward.ok) {
      console.error(
        "[Aline] Webhook erro:",
        forward.status,
        raw?.substring(0, 200)
      );
      // Reverte o incremento em caso de erro
      await prisma.alineSession.update({
        where: { sessionId },
        data: { messageCount: session.messageCount },
      });
      res.status(502).json({
        error: "Webhook request failed",
        status: forward.status,
        reply:
          "Desculpe, o serviço está temporariamente indisponível. Tente de novo.",
      });
      return;
    }

    let reply = "";
    if (contentType.includes("application/json")) {
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
      // Texto puro (text/plain ou outro) — usa o corpo inteiro como resposta
      reply = raw;
    }

    const remaining = ALINE_MAX_SEARCHES - (session.messageCount + 1);
    res.status(200).json({
      reply: reply || "Desculpe, não consegui processar. Tente de novo.",
      remainingSearches: Math.max(0, remaining),
      limitReached: remaining <= 0,
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const detail =
      err.code === "ENOTFOUND"
        ? "Host não encontrado (DNS)"
        : err.code === "ECONNREFUSED"
          ? "Conexão recusada (n8n offline ou porta errada?)"
          : err.code === "ETIMEDOUT"
            ? "Timeout (n8n demorou demais)"
            : err.code === "ECONNRESET"
              ? "Conexão fechada pelo servidor"
              : err.message || String(e);
    console.error("[Aline] Erro ao chamar webhook:", err.code || err.message, detail);
    const body: Record<string, string> = {
      error: "Failed to call webhook",
      reply:
        "Erro de conexão. Verifique se ALINE_WEBHOOK_URL está correto e se o n8n está acessível.",
    };
    if (process.env.NODE_ENV !== "production") {
      body.debug = `${err.code || "unknown"}: ${detail}`;
    }
    res.status(502).json(body);
  }
});
