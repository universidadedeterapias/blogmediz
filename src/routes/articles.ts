import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { normalizeAuthor, normalizeCategoryTag } from "../lib/article-defaults.js";
import { bearerAuth } from "../middleware/auth.js";
import { isLocale, isValidPayload } from "../types/article.js";
import { mergeArticleContentWithMediaDefaults } from "../lib/media-defaults.js";
import { mergeContentPreservingManualMedia } from "../lib/article-content-merge.js";

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
  const bodyPub = req.body as { isPublished?: unknown };
  const isPublishedOpt =
    typeof bodyPub.isPublished === "boolean" ? bodyPub.isPublished : undefined;
  const publishedAtDate = publishedAt ? new Date(publishedAt) : null;

  try {
    const existing = await prisma.article.findUnique({
      where: { locale_slug: { locale, slug } },
    });
    const contentMerged = mergeContentPreservingManualMedia(existing?.content, content as Record<string, unknown>);

    const article = await prisma.article.upsert({
      where: { locale_slug: { locale, slug } },
      create: {
        locale,
        slug,
        title,
        categoryTag: normalizeCategoryTag(categoryTag ?? undefined),
        author: normalizeAuthor(author ?? undefined),
        publishedAt: publishedAtDate,
        isPublished: isPublishedOpt ?? true,
        content: contentMerged as object,
      },
      update: {
        title,
        ...(categoryTag !== undefined && { categoryTag: normalizeCategoryTag(categoryTag as string | null | undefined) }),
        ...(author !== undefined && { author: normalizeAuthor(author as string | null | undefined) }),
        ...(publishedAtDate !== undefined && { publishedAt: publishedAtDate ?? null }),
        ...(isPublishedOpt !== undefined && { isPublished: isPublishedOpt }),
        content: contentMerged as object,
      },
    });

    res.status(article.createdAt.getTime() === article.updatedAt.getTime() ? 201 : 200).json(article);
  } catch (e) {
    console.error("Article upsert error:", e);
    res.status(500).json({ error: "Failed to save article" });
  }
});

/**
 * GET /api/articles/:locale/search?q= — lista artigos publicados cujo título, categoria ou slug contém a query.
 * Deve ficar antes de /:locale/:slug para não confundir "search" com slug.
 */
articlesRouter.get("/:locale/search", async (req: Request, res: Response): Promise<void> => {
  const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
  if (!locale || !isLocale(locale)) {
    res.status(400).json({ error: "Invalid locale" });
    return;
  }

  const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (raw.length < 2) {
    res.status(400).json({ error: "Use pelo menos 2 caracteres na busca (parâmetro q)." });
    return;
  }

  const q = raw;

  try {
    const articles = await prisma.article.findMany({
      where: {
        locale,
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { categoryTag: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 50,
      select: {
        slug: true,
        title: true,
        categoryTag: true,
        publishedAt: true,
      },
    });
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json(articles);
  } catch (e) {
    console.error("Article search error:", e);
    res.status(500).json({ error: "Failed to search articles" });
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
    const article = await prisma.article.findFirst({
      where: { locale, slug, isPublished: true },
    });
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const withMedia = {
      ...article,
      content: mergeArticleContentWithMediaDefaults(article.content),
    };
    res.json(withMedia);
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
      where: { locale, isPublished: true },
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(articles);
  } catch (e) {
    console.error("Article list error:", e);
    res.status(500).json({ error: "Failed to list articles" });
  }
});
