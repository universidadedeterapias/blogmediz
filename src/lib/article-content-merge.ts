/**
 * Ao atualizar artigo via IA ou publish-text, o payload costuma trazer só texto (mainContent, faq…)
 * e omitir blocos preenchidos manualmente no admin. Sem merge, o replace completo do `content` apaga
 * mapa mental, vídeo e podcast.
 */
const MANUAL_MEDIA_KEYS = ["mindmap", "video", "podcast"] as const;

const MEDIA_STRING_KEYS: Record<(typeof MANUAL_MEDIA_KEYS)[number], readonly string[]> = {
  video: ["embedUrl", "thumbnailUrl", "title"],
  mindmap: ["imageUrl", "embedUrl", "caption"],
  podcast: ["audioUrl", "title", "eyebrow", "subtitle"],
};

function mediaBlockHasValue(block: unknown, keys: readonly string[]): boolean {
  if (block == null || typeof block !== "object" || Array.isArray(block)) return false;
  const o = block as Record<string, unknown>;
  return keys.some((k) => typeof o[k] === "string" && o[k].trim() !== "");
}

function isIncomingMediaEmpty(key: (typeof MANUAL_MEDIA_KEYS)[number], val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val !== "object" || Array.isArray(val)) return false;
  return !mediaBlockHasValue(val, MEDIA_STRING_KEYS[key]);
}

/** Garante que `content` do Prisma é um objeto plano (evita spread em string JSON corromper o patch). */
export function normalizeArticleContent(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function mergeContentPreservingManualMedia(
  previous: unknown,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const prev = normalizeArticleContent(previous);
  const out: Record<string, unknown> = { ...prev, ...incoming };

  for (const key of MANUAL_MEDIA_KEYS) {
    const inc = incoming[key];
    const prevVal = prev[key];
    if (isIncomingMediaEmpty(key, inc) && mediaBlockHasValue(prevVal, MEDIA_STRING_KEYS[key])) {
      out[key] = prevVal;
      continue;
    }
    if (!(key in incoming) && prevVal !== undefined) {
      out[key] = prevVal;
    }
  }

  return out;
}
