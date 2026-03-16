import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const alineLeadRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/aline-lead — salva cliente/lead da Aline no banco (após limite de 3 buscas). */
alineLeadRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name =
    typeof req.body?.name === "string" ? req.body.name.trim() || null : null;
  const messageCount =
    typeof req.body?.messageCount === "number" && req.body.messageCount >= 0
      ? req.body.messageCount
      : 3;
  const summary =
    typeof req.body?.summary === "string" ? req.body.summary.trim() || null : null;

  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Invalid or missing email" });
    return;
  }

  try {
    await prisma.alineLead.create({
      data: {
        email,
        name,
        messageCount,
        summary,
      },
    });
    res.status(201).json({ ok: true, message: "Lead saved" });
  } catch (e) {
    console.error("[AlineLead] Erro ao salvar:", e);
    res.status(500).json({ error: "Failed to save lead" });
  }
});
