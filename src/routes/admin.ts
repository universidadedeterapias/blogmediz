import type { NextFunction, Request, Response } from "express";
import { getRequestId } from "../lib/webhook-session.js";
import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";
import { normalizeAuthor, normalizeCategoryTag } from "../lib/article-defaults.js";
import { adminAuth } from "../middleware/auth.js";
import { isLocale } from "../types/article.js";
import { env } from "../config/env.js";
import {
  bufferToMainHtml,
  buildArticleContentFromImport,
  slugifyInput,
} from "../lib/import-document.js";
import { applyVideoPodcastPatchToContent } from "../lib/media-defaults.js";
import { mergeContentPreservingManualMedia } from "../lib/article-content-merge.js";

export const adminRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype));
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const m = (file.mimetype || "").toLowerCase().split(";")[0]?.trim() ?? "";
    const name = (file.originalname || "").toLowerCase();
    const ok =
      m === "application/pdf" ||
      m === "application/x-pdf" ||
      m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      m === "text/html" ||
      m === "application/xhtml+xml" ||
      m === "multipart/related" ||
      m === "application/x-mhtml" ||
      m === "message/rfc822" ||
      m === "application/octet-stream" ||
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".html") ||
      name.endsWith(".htm") ||
      name.endsWith(".mhtml") ||
      name.endsWith(".mht");
    cb(null, ok);
  },
});

/** Evita 500 genérico quando Multer rejeita arquivo (tamanho, etc.). */
function importDocumentUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  documentUpload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Arquivo muito grande (máx. 15MB)." });
        return;
      }
      const msg = err instanceof Error ? err.message : "Falha no upload do arquivo.";
      res.status(400).json({ error: msg });
      return;
    }
    next();
  });
}

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

/** POST /api/admin/upload — upload de imagem para mapa mental. Retorna { url }. */
adminRouter.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    res.status(503).json({ error: "Upload não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env" });
    return;
  }
  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "Envie um arquivo de imagem (JPEG, PNG, GIF ou WebP, máx. 5MB)" });
    return;
  }
  const ext = (file.originalname.split(".").pop() || "jpg").toLowerCase();
  const name = `mindmap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);
    const { data, error } = await supabase.storage
      .from("mindmaps")
      .upload(name, file.buffer, { contentType: file.mimetype, cacheControl: "31536000", upsert: false });
    if (error) {
      if (error.message?.includes("Bucket not found") || error.message?.includes("does not exist")) {
        res.status(503).json({
          error: "Bucket 'mindmaps' não existe. Crie em Supabase → Storage → New bucket → nome 'mindmaps', público.",
        });
        return;
      }
      console.error("Supabase upload error:", error);
      res.status(500).json({ error: "Falha ao fazer upload: " + (error.message || "erro desconhecido") });
      return;
    }
    const { data: urlData } = supabase.storage.from("mindmaps").getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

/** GET /api/admin/articles — lista todos os artigos (locale, slug, title) para o painel. */
adminRouter.get("/articles", async (_req: Request, res: Response): Promise<void> => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [{ locale: "asc" }, { slug: "asc" }],
      select: { locale: true, slug: true, title: true, publishedAt: true, scheduledAt: true, isPublished: true },
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

/** POST /api/admin/publish — encaminha JSON para o webhook n8n (subject, locale, slug, title, scheduledAt?). */
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

  const payload = { ...body, sessionId: getRequestId() };

  try {
    const forward = await fetch(env.articlePublishWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    const video = body.video;
    const mindmap = body.mindmap as Record<string, string> | undefined;
    const podcast = body.podcast;

    const hasVideo = video !== null && typeof video === "object" && !Array.isArray(video);
    const hasMindmap = mindmap && typeof mindmap === "object" && (mindmap.imageUrl !== undefined || mindmap.caption !== undefined);
    const hasPodcast = podcast !== null && typeof podcast === "object" && !Array.isArray(podcast);
    const hasVisibility = typeof body.isPublished === "boolean";

    if (!hasVideo && !hasMindmap && !hasPodcast && !hasVisibility) {
      res.status(400).json({
        error:
          "Envie ao menos: video, mindmap, podcast ou isPublished (true|false).",
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

      let nextContent = { ...((article.content as Record<string, unknown>) || {}) };

      if (hasVideo || hasPodcast) {
        nextContent = applyVideoPodcastPatchToContent(nextContent, hasVideo ? video : undefined, hasPodcast ? podcast : undefined);
      }
      if (hasMindmap && mindmap) {
        nextContent.mindmap = {
          ...(typeof nextContent.mindmap === "object" && nextContent.mindmap !== null
            ? (nextContent.mindmap as Record<string, unknown>)
            : {}),
          ...(mindmap.imageUrl !== undefined && { imageUrl: String(mindmap.imageUrl) }),
          ...(mindmap.caption !== undefined && { caption: String(mindmap.caption) }),
        };
      }

      const patchData: { content?: object; isPublished?: boolean } = {};
      if (hasVideo || hasMindmap || hasPodcast) patchData.content = nextContent as object;
      if (hasVisibility) patchData.isPublished = body.isPublished as boolean;

      const updated = await prisma.article.update({
        where: { locale_slug: { locale, slug } },
        data: patchData,
      });
      res.json(updated);
    } catch (e) {
      console.error("Admin patch article error:", e);
      res.status(500).json({ error: "Failed to update article" });
    }
  }
);

/** PUT /api/admin/articles/:locale/:slug — atualiza o artigo completo (incluindo content). */
adminRouter.put(
  "/articles/:locale/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!locale || !slug || !isLocale(locale)) {
      res.status(400).json({ error: "Invalid locale or slug" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const content = body.content as Record<string, unknown> | undefined;

    if (!content || typeof content !== "object") {
      res.status(400).json({ error: "content (object) is required" });
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

      const currentContent = (article.content as Record<string, unknown>) || {};
      const nextContent = { ...currentContent, ...content };

      const updateData: Record<string, unknown> = { content: nextContent };
      if (body.title !== undefined) updateData.title = String(body.title);
      if (body.categoryTag !== undefined) updateData.categoryTag = body.categoryTag ? String(body.categoryTag) : null;
      if (body.author !== undefined) updateData.author = body.author ? String(body.author) : null;
      if (body.publishedAt !== undefined) updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt as string) : null;
      if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt as string) : null;
      if (typeof body.isPublished === "boolean") updateData.isPublished = body.isPublished;

      const updated = await prisma.article.update({
        where: { locale_slug: { locale, slug } },
        data: updateData as object,
      });
      res.json(updated);
    } catch (e) {
      console.error("Admin put article error:", e);
      res.status(500).json({ error: "Failed to update article" });
    }
  }
);

/** DELETE /api/admin/articles/:locale/:slug — remove o artigo permanentemente. */
adminRouter.delete(
  "/articles/:locale/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const locale = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!locale || !slug || !isLocale(locale)) {
      res.status(400).json({ error: "Invalid locale or slug" });
      return;
    }
    try {
      await prisma.article.delete({
        where: { locale_slug: { locale, slug } },
      });
      res.status(204).send();
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2025") {
        res.status(404).json({ error: "Article not found" });
        return;
      }
      console.error("Admin delete article error:", e);
      res.status(500).json({ error: "Failed to delete article" });
    }
  }
);

/** POST /api/admin/publish-text — publica artigo com texto pronto (imediato ou agendado). */
adminRouter.post("/publish-text", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const locale = typeof body.locale === "string" ? body.locale.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : slug.replace(/-/g, " ");
  const content = body.content as Record<string, unknown> | undefined;
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt as string) : null;
  const isPublished =
    typeof body.isPublished === "boolean" ? body.isPublished : undefined;

  if (!locale || !isLocale(locale) || !slug) {
    res.status(400).json({ error: "locale (pt|es|en) and slug are required" });
    return;
  }

  if (!content || typeof content !== "object") {
    res.status(400).json({ error: "content (object) is required. Use mainContent or full structure." });
    return;
  }

  const hasMainContent = typeof content.mainContent === "string" || typeof content.body === "string";
  if (!hasMainContent) {
    res.status(400).json({ error: "content.mainContent or content.body is required" });
    return;
  }

  const publishedAt = scheduledAt ? null : new Date();
  const rawAuthor = typeof body.author === "string" ? body.author : undefined;
  const rawCategory = typeof body.categoryTag === "string" ? body.categoryTag : undefined;
  const authorPub = normalizeAuthor(rawAuthor);
  const categoryPub = normalizeCategoryTag(rawCategory);

  try {
    const existingPub = await prisma.article.findUnique({
      where: { locale_slug: { locale, slug } },
    });
    const contentMerged = mergeContentPreservingManualMedia(existingPub?.content, content as Record<string, unknown>);

    const article = await prisma.article.upsert({
      where: { locale_slug: { locale, slug } },
      create: {
        locale,
        slug,
        title,
        author: authorPub,
        categoryTag: categoryPub,
        content: contentMerged as object,
        publishedAt,
        scheduledAt,
        isPublished: isPublished ?? true,
      },
      update: {
        title,
        content: contentMerged as object,
        publishedAt,
        scheduledAt,
        ...(isPublished !== undefined && { isPublished }),
        ...(typeof body.author === "string" && { author: authorPub }),
        ...(typeof body.categoryTag === "string" && { categoryTag: categoryPub }),
      },
    });
    res.status(200).json(article);
  } catch (e) {
    console.error("Admin publish-text error:", e);
    res.status(500).json({ error: "Failed to publish article" });
  }
});

/** POST /api/admin/import-document — PDF, DOCX, HTML ou MHTML (página salva) → content + publish-text equivalente. */
adminRouter.post(
  "/import-document",
  documentUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({
        error: "Envie um arquivo PDF ou DOCX (máx. 15MB) no campo file.",
      });
      return;
    }

    const body = req.body as Record<string, string | undefined>;
    const localeRaw = typeof body.locale === "string" ? body.locale.trim() : "";
    let title = typeof body.title === "string" ? body.title.trim() : "";
    let slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!localeRaw || !isLocale(localeRaw)) {
      res.status(400).json({ error: "locale (pt|es|en) é obrigatório" });
      return;
    }

    const locale = localeRaw;

    let mainHtml: string;
    try {
      mainHtml = await bufferToMainHtml(file.buffer, file.mimetype, file.originalname);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ler o documento";
      res.status(400).json({ error: msg });
      return;
    }

    if (!title) {
      const baseName = (file.originalname || "artigo").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      title = baseName.trim() || "Artigo importado";
    }
    title = title.replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim();

    if (!slug) {
      slug = slugifyInput(title);
    } else {
      slug = slugifyInput(slug);
    }

    const importBase = buildArticleContentFromImport(mainHtml);

    const isPublishedRaw = body.isPublished;
    let isPublished: boolean | undefined;
    if (isPublishedRaw === "false" || isPublishedRaw === "0") isPublished = false;
    else if (isPublishedRaw === "true" || isPublishedRaw === "1") isPublished = true;

    const rawAuthor = typeof body.author === "string" ? body.author : undefined;
    let rawCategory = typeof body.categoryTag === "string" ? body.categoryTag : undefined;
    if (!rawCategory?.trim() && typeof body.categoryPreset === "string") {
      rawCategory = body.categoryPreset;
    }
    const authorPub = normalizeAuthor(rawAuthor);
    const categoryPub = normalizeCategoryTag(rawCategory);

    let scheduledAt: Date | null = null;
    if (body.scheduledAt && String(body.scheduledAt).trim()) {
      const d = new Date(String(body.scheduledAt));
      if (!Number.isNaN(d.getTime())) scheduledAt = d;
    }

    const publishedAt = scheduledAt ? null : new Date();

    try {
      const existingImp = await prisma.article.findUnique({
        where: { locale_slug: { locale, slug } },
      });
      const contentMerged = existingImp
        ? mergeContentPreservingManualMedia(existingImp.content, importBase)
        : importBase;

      let contentForDb: object;
      try {
        contentForDb = JSON.parse(JSON.stringify(contentMerged)) as object;
      } catch {
        res.status(400).json({
          error: "O conteúdo gerado não pôde ser convertido para salvar (dados inválidos).",
        });
        return;
      }

      const article = await prisma.article.upsert({
        where: { locale_slug: { locale, slug } },
        create: {
          locale,
          slug,
          title,
          author: authorPub,
          categoryTag: categoryPub,
          content: contentForDb,
          publishedAt,
          scheduledAt,
          isPublished: isPublished !== undefined ? isPublished : true,
        },
        update: {
          title,
          author: authorPub,
          categoryTag: categoryPub,
          content: contentForDb,
          publishedAt,
          scheduledAt,
          ...(isPublished !== undefined && { isPublished }),
        },
      });
      res.status(200).json(article);
    } catch (e) {
      console.error("Admin import-document error:", e);
      const details = e instanceof Error ? e.message : String(e);
      const prismaCode =
        e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined;
      res.status(500).json({
        error: "Falha ao salvar o artigo após importar. Verifique o banco e tente de novo.",
        details,
        ...(prismaCode && { prismaCode }),
      });
    }
  }
);

/** POST /api/admin/correct — dispara webhook de correção com locale e slug. */
adminRouter.post("/correct", async (req: Request, res: Response): Promise<void> => {
  if (!env.articleCorrectWebhookUrl) {
    res.status(503).json({ error: "ARTICLE_CORRECT_WEBHOOK_URL not configured" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const locale = typeof body.locale === "string" ? body.locale.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!locale || !isLocale(locale) || !slug) {
    res.status(400).json({ error: "locale (pt|es|en) and slug are required" });
    return;
  }

  const payload = { locale, slug, sessionId: getRequestId() };

  try {
    const forward = await fetch(env.articleCorrectWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const text = await forward.text();
      console.error("Admin correct webhook error:", forward.status, text);
      res.status(502).json({ error: "Webhook request failed", status: forward.status });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Admin correct webhook fetch error:", e);
    res.status(502).json({ error: "Failed to call webhook" });
  }
});

/** POST /api/admin/aline-reset — reseta todas as sessões da Aline (zerando contadores). Apenas admin. */
adminRouter.post("/aline-reset", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.alineSession.deleteMany({});
    res.status(200).json({
      ok: true,
      message: `${result.count} sessão(ões) resetada(s). Todos podem fazer 3 buscas novamente.`,
    });
  } catch (e) {
    console.error("Admin aline-reset error:", e);
    res.status(500).json({ error: "Erro ao resetar sessões da Aline" });
  }
});
