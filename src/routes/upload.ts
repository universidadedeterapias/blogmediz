import type { Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const uploadRouter = Router();
uploadRouter.use(adminAuth);

const BUCKET = "mindmaps";

/** POST /api/admin/upload — upload de imagem para mapa mental. Retorna { url }. */
uploadRouter.post("/", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    res.status(503).json({ error: "Upload não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env" });
    return;
  }
  const file = req.file;
  if (!file || !file.buffer) {
    res.status(400).json({ error: "Envie um arquivo de imagem (JPEG, PNG, GIF ou WebP, máx. 5MB)" });
    return;
  }
  const ext = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
  const name = `mindmap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(name, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      if (error.message?.includes("Bucket not found") || error.message?.includes("does not exist")) {
        res.status(503).json({
          error: "Bucket 'mindmaps' não existe no Supabase. Crie em Storage → New bucket → nome 'mindmaps', público.",
        });
        return;
      }
      console.error("Supabase upload error:", error);
      res.status(500).json({ error: "Falha ao fazer upload: " + (error.message || "erro desconhecido") });
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});
