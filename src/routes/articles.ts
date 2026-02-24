import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { bearerAuth } from "../middleware/auth.js";
import { isLocale, isValidPayload } from "../types/article.js";

export const articlesRouter = Router();

/** POST /api/articles — cria ou atualiza artigo (Bearer). */
articlesRouter.post("/", bearerAuth, async (req: Request, res: Response): Promise<void> => {
  if (!isValidPayload(req.body)) {
    res.status(400).json({
      error: "Invalid payload",
      expected: {
        locale: "pt | es | en",
        slug: "string",
        title: "string",
        content: "object (mainContent, surprises, video, mindmap, podcast, highlights, faq, relatedSlugs, ...)",
      },
    });
    return;
  }

  const { locale, slug, title, categoryTag, author, publishedAt, content } = req.body;
  const publishedAtDate = publishedAt ? new Date(publishedAt) : null;

  try {
    const article = await prisma.article.upsert({
      where: { locale_slug: { locale, slug } },
      create: {
        locale,
        slug,
        title,
        categoryTag: categoryTag ?? null,
        author: author ?? null,
        publishedAt: publishedAtDate,
        content: content as object,
      },
      update: {
        title,
        ...(categoryTag !== undefined && { categoryTag: categoryTag ?? null }),
        ...(author !== undefined && { author: author ?? null }),
        ...(publishedAtDate !== undefined && { publishedAt: publishedAtDate ?? null }),
        content: content as object,
      },
    });

    res.status(article.createdAt.getTime() === article.updatedAt.getTime() ? 201 : 200).json(article);
  } catch (e) {
    console.error("Article upsert error:", e);
    res.status(500).json({ error: "Failed to save article" });
  }
});

/** GET /api/articles/:locale/:slug — retorna um artigo (público). */
articlesRouter.get("/:locale/:slug", async (req: Request, res: Response): Promise<void> => {
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
    console.error("Article find error:", e);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

/** GET /api/articles/:locale — lista artigos do locale (público). */
articlesRouter.get("/:locale", async (req: Request, res: Response): Promise<void> => {
  const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
  if (!locale || !isLocale(locale)) {
    res.status(400).json({ error: "Invalid locale" });
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  try {
    const articles = await prisma.article.findMany({
      where: { locale },
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        locale: true,
        slug: true,
        title: true,
        categoryTag: true,
        publishedAt: true,
      },
    });
    res.json(articles);
  } catch (e) {
    console.error("Article list error:", e);
    res.status(500).json({ error: "Failed to list articles" });
  }
});
