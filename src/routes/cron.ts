import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export const cronRouter = Router();

/** GET /api/cron/publish-scheduled — Vercel Cron: publica artigos com scheduledAt <= now. */
cronRouter.get("/publish-scheduled", async (_req: Request, res: Response): Promise<void> => {
  const secret = env.cronSecret?.trim();
  if (secret) {
    const auth = _req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : _req.query.secret;
    if (token !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const now = new Date();

  try {
    const toPublish = await prisma.article.findMany({
      where: {
        scheduledAt: { lte: now },
        publishedAt: null,
      },
    });

    let published = 0;
    for (const article of toPublish) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          publishedAt: article.scheduledAt ?? now,
          scheduledAt: null,
        },
      });
      published++;
    }

    res.json({ ok: true, published });
  } catch (e) {
    console.error("[Cron] publish-scheduled error:", e);
    res.status(500).json({ error: "Failed to publish scheduled articles" });
  }
});
