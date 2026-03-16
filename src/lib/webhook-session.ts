import crypto from "node:crypto";
import type { Request, Response } from "express";

const SESSION_COOKIE = "aline_sid";

/**
 * Obtém ou cria sessionId para incluir nos webhooks.
 * - Se houver cookie aline_sid: usa e mantém
 * - Se não houver: gera novo e define cookie (para Aline/newsletter)
 * - Para requisições sem cookie (ex.: admin): gera requestId único
 */
export function getWebhookSessionId(req: Request, res: Response): string {
  const cookies = req.cookies as Record<string, string> | undefined;
  let sid = cookies?.[SESSION_COOKIE];

  if (sid && sid.length >= 16) {
    return sid;
  }

  sid = crypto.randomBytes(24).toString("hex");
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return sid;
}

/**
 * Gera um ID único para requisições que não têm sessão de usuário (ex.: admin).
 */
export function getRequestId(): string {
  return `req-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}
