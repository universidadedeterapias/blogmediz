import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { adminAuth } from "../middleware/auth.js";
import { isLocale } from "../types/article.js";
import { env } from "../config/env.js";

export const adminRouter = Router();

/** POST /api/admin/login — login com email e senha fixos; retorna token Bearer. */
adminRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  if (!env.adminEmail || !env.adminPassword || !env.adminSecret) {
    res.status(503).json({ error: "Admin login not configured (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET)" });
    return;
  }
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }
  const emailNorm = email.trim().toLowerCase();
  const expectedEmail = env.adminEmail.trim().toLowerCase();
  if (emailNorm !== expectedEmail || password !== env.adminPassword) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }
  res.json({ token: env.adminSecret });
});

adminRouter.use(adminAuth);

/** GET /api/admin/articles — lista todos os artigos (locale, slug, title) para o painel. */
adminRouter.get("/articles", async (_req: Request, res: Response): Promise<void> => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [{ locale: "asc" }, { slug: "asc" }],
      select: { locale: true, slug: true, title: true },
    });
    res.json(articles);
  } catch (e) {
    console.error("Admin list articles error:", e);
    res.status(500).json({ error: "Failed to list articles" });
  }
});

/** GET /api/admin/articles/:locale/:slug — retorna o artigo (incluindo content) para edição. */
adminRouter.get(
  "/articles/:locale/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!locale || !slug || !isLocale(locale)) {
      res.status(400).json({ error: "Invalid locale or slug" });
      return;
    }
    try {
      const article = await prisma.article.findUnique({
        where: { locale_slug: { locale, slug } },
      });
      if (!article) {
        res.status(404).json({ error: "Article not found" });
        return;
      }
      res.json(article);
    } catch (e) {
      console.error("Admin get article error:", e);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  }
);

/** POST /api/admin/publish — encaminha JSON de artigo para o webhook do n8n. */
adminRouter.post("/publish", async (req: Request, res: Response): Promise<void> => {
  if (!env.articlePublishWebhookUrl) {
    res.status(503).json({ error: "ARTICLE_PUBLISH_WEBHOOK_URL not configured" });
    return;
  }

  const body = req.body;
  if (body === null || typeof body !== "object") {
    res.status(400).json({ error: "Body must be a JSON object" });
    return;
  }

  try {
    const forward = await fetch(env.articlePublishWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await forward.text();

    if (!forward.ok) {
      console.error("Admin publish webhook error:", forward.status, text);
      res.status(502).json({ error: "Webhook request failed", status: forward.status, body: text });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Admin publish webhook fetch error:", e);
    res.status(502).json({ error: "Failed to call webhook" });
  }
});

/** PATCH /api/admin/articles/:locale/:slug — atualiza só video, mindmap e podcast do content. */
adminRouter.patch(
  "/articles/:locale/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!locale || !slug || !isLocale(locale)) {
      res.status(400).json({ error: "Invalid locale or slug" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const video = body.video as Record<string, string> | undefined;
    const mindmap = body.mindmap as Record<string, string> | undefined;
    const podcast = body.podcast as Record<string, string> | undefined;

    const hasVideo = video && typeof video === "object" && (video.embedUrl !== undefined || video.thumbnailUrl !== undefined || video.title !== undefined);
    const hasMindmap = mindmap && typeof mindmap === "object" && (mindmap.imageUrl !== undefined || mindmap.caption !== undefined);
    const hasPodcast = podcast && typeof podcast === "object" && (podcast.audioUrl !== undefined || podcast.title !== undefined || podcast.eyebrow !== undefined);

    if (!hasVideo && !hasMindmap && !hasPodcast) {
      res.status(400).json({
        error: "Send at least one of: video (embedUrl/thumbnailUrl/title), mindmap (imageUrl/caption), podcast (audioUrl/title/eyebrow)",
      });
      return;
    }

    try {
      const article = await prisma.article.findUnique({
        where: { locale_slug: { locale, slug } },
      });
      if (!article) {
        res.status(404).json({ error: "Article not found" });
        return;
      }

      const current = (article.content as Record<string, unknown>) || {};
      const nextContent = { ...current };

      if (hasVideo && video) {
        nextContent.video = {
          ...(typeof current.video === "object" && current.video !== null
            ? (current.video as Record<string, unknown>)
            : {}),
          ...(video.embedUrl !== undefined && { embedUrl: String(video.embedUrl) }),
          ...(video.thumbnailUrl !== undefined && { thumbnailUrl: String(video.thumbnailUrl) }),
          ...(video.title !== undefined && { title: String(video.title) }),
        };
      }
      if (hasMindmap && mindmap) {
        nextContent.mindmap = {
          ...(typeof current.mindmap === "object" && current.mindmap !== null
            ? (current.mindmap as Record<string, unknown>)
            : {}),
          ...(mindmap.imageUrl !== undefined && { imageUrl: String(mindmap.imageUrl) }),
          ...(mindmap.caption !== undefined && { caption: String(mindmap.caption) }),
        };
      }
      if (hasPodcast && podcast) {
        nextContent.podcast = {
          ...(typeof current.podcast === "object" && current.podcast !== null
            ? (current.podcast as Record<string, unknown>)
            : {}),
          ...(podcast.audioUrl !== undefined && { audioUrl: String(podcast.audioUrl) }),
          ...(podcast.title !== undefined && { title: String(podcast.title) }),
          ...(podcast.eyebrow !== undefined && { eyebrow: String(podcast.eyebrow) }),
        };
      }

      const updated = await prisma.article.update({
        where: { locale_slug: { locale, slug } },
        data: { content: nextContent as object },
      });
      res.json(updated);
    } catch (e) {
      console.error("Admin patch article error:", e);
      res.status(500).json({ error: "Failed to update article" });
    }
  }
);
