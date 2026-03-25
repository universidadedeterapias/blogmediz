import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

/** Slug seguro para URL a partir do título ou texto livre. */
export function slugifyInput(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base || "artigo-importado";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converte texto extraído do PDF em HTML simples (títulos ## e parágrafos). */
export function plainTextToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = (): void => {
    if (para.length) {
      out.push("<p>" + escapeHtml(para.join(" ")) + "</p>");
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      flushPara();
      continue;
    }
    if (t.startsWith("## ")) {
      flushPara();
      out.push("<h2>" + escapeHtml(t.slice(3)) + "</h2>");
    } else if (t.startsWith("# ")) {
      flushPara();
      out.push("<h2>" + escapeHtml(t.slice(2)) + "</h2>");
    } else {
      para.push(t);
    }
  }
  flushPara();
  return out.length ? out.join("") : "<p></p>";
}

/** Extrai HTML útil de página salva (corpo ou documento sem &lt;head&gt;). */
function extractHtmlFragment(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let fragment = bodyMatch?.[1]?.trim() ?? "";
  if (!fragment) {
    fragment = html.replace(/<head\b[\s\S]*?<\/head>/gi, "").trim();
  }
  fragment = fragment.replace(/<![\s\S]*?>/g, "");
  const cleaned = sanitizeAdminHtml(fragment);
  return cleaned || "<p></p>";
}

/** Arquivo .html / .htm (ex.: “Salvar como” no Opera/Chrome). */
export function extractHtmlFileMainHtml(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  if (!raw.trim()) return "<p></p>";
  return extractHtmlFragment(raw);
}

/** Arquivo .mhtml (MIME multiparte — “Página única”). */
export function extractMhtmlMainHtml(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  if (!/Content-Type:\s*text\/html/i.test(raw)) {
    return extractHtmlFileMainHtml(buffer);
  }
  const blocks = raw.split(/\r?\n--[A-Za-z0-9_+/=-]+/);
  let longest = "";
  for (const block of blocks) {
    if (!/Content-Type:\s*text\/html/i.test(block)) continue;
    const idx = block.search(/\r?\n\r?\n/);
    if (idx === -1) continue;
    const chunk = block.slice(idx).trim();
    if (chunk.length > longest.length) longest = chunk;
  }
  if (longest) return extractHtmlFragment(longest);
  return extractHtmlFileMainHtml(buffer);
}

/**
 * Impede import “vazio” quando o utilizador guardou a aba do visualizador de PDF (Opera/Chrome):
 * o corpo HTML só traz rótulos de página; o texto real está em canvas e não é extraível.
 */
function assertImportMainHtmlIsSubstantive(html: string): void {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .trim();

  const markerPattern = /--\s*\d+\s+of\s+\d+\s*--|\bpage\s+\d+\s+of\s+\d+\b/gi;
  const markerMatches = stripped.match(markerPattern);
  const markerCount = markerMatches?.length ?? 0;
  const remainder = stripped.replace(markerPattern, " ").replace(/\s+/g, " ").trim();
  const otherAlnum = remainder.replace(/[^\p{L}\p{N}]/gu, "").length;

  if (markerCount >= 2 && otherAlnum < 100) {
    throw new Error(
      "Parece que você salvou a página do leitor de PDF no navegador, e não o arquivo PDF. Só aparecem marcadores de página (ex.: “-- 1 of 13 --”); o texto real não pode ser extraído assim. Envie o ficheiro .pdf original (o download do documento), use “Guardar como PDF” no próprio leitor, ou copie o texto para um .docx.",
    );
  }
}

function finishMainHtml(html: string): string {
  assertImportMainHtmlIsSubstantive(html);
  return html;
}

/** Remove trechos obviamente perigosos do HTML (admin-only, Camada extra após DOCX). */
export function sanitizeAdminHtml(html: string): string {
  let s = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s>]+)/gi, "");
  s = s.replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"');
  return s.trim();
}

export async function extractPdfMainHtml(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const raw = (result.text || "").trim();
    if (!raw) return "<p></p>";
    return plainTextToHtml(raw);
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxMainHtml(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.convertToHtml({ buffer });
  const html = (value || "").trim();
  if (!html) return "<p></p>";
  return sanitizeAdminHtml(html);
}

/** Mesmo formato usado em publish-text (blocos extras vazios até edição manual). */
export function buildArticleContentFromImport(mainHtml: string): Record<string, unknown> {
  const main = mainHtml.trim() || "<p></p>";
  return {
    mainContent: main,
    surprises: [],
    highlights: [],
    patterns: [],
    faq: [],
  };
}

export function isPdfMime(m: string): boolean {
  return m === "application/pdf" || m === "application/x-pdf";
}

export function isDocxMime(m: string): boolean {
  return m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isHtmlMime(m: string): boolean {
  return m === "text/html" || m === "application/xhtml+xml" || m === "text/xml";
}

export async function bufferToMainHtml(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const lower = originalname.toLowerCase();
  const mime = ((mimetype || "").split(";")[0] ?? "").trim().toLowerCase();

  if (lower.endsWith(".mhtml") || lower.endsWith(".mht") || mime === "multipart/related" || mime === "application/x-mhtml") {
    return finishMainHtml(extractMhtmlMainHtml(buffer));
  }
  if (isHtmlMime(mime) || lower.endsWith(".html") || lower.endsWith(".htm")) {
    return finishMainHtml(extractHtmlFileMainHtml(buffer));
  }
  if (isPdfMime(mime) || lower.endsWith(".pdf")) {
    return finishMainHtml(await extractPdfMainHtml(buffer));
  }
  if (isDocxMime(mime) || lower.endsWith(".docx")) {
    return finishMainHtml(await extractDocxMainHtml(buffer));
  }

  const head = buffer.slice(0, Math.min(2048, buffer.length)).toString("utf8").trimStart();
  if (/^MIME-Version:/im.test(head) || head.startsWith("From:")) {
    return finishMainHtml(extractMhtmlMainHtml(buffer));
  }
  if (head.startsWith("<") || /^<!DOCTYPE\s+html/i.test(head)) {
    return finishMainHtml(extractHtmlFileMainHtml(buffer));
  }

  throw new Error(
    "Formato não suportado. Use PDF, DOCX, HTML (.html/.htm) ou MHTML (.mhtml) — página salva do navegador.",
  );
}
