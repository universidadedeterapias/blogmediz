/** Igual ao artigo estático de referência (diabetes) no blog. */
export const DEFAULT_ARTICLE_AUTHOR = "Prof. Paulo Barbosa";
export const DEFAULT_ARTICLE_CATEGORY_TAG = "Sistema Imune e Geral";

/**
 * Vídeo / podcast padrão quando o artigo não define e o .env não tem DEFAULT_*.
 * Sobrescreva com DEFAULT_VIDEO_* / DEFAULT_PODCAST_* no .env se precisar por ambiente.
 *
 * Playlists de referência (o player do blog usa um vídeo por vez, não a playlist inteira):
 * - Resumos: https://youtube.com/playlist?list=PLA8mkYH-ySlldWMApR7OKIoo10WXmsF0H
 * - Podcast: https://youtube.com/playlist?list=PLA8mkYH-ySlnlyjMeFzUhqgoE45jBL-Vn
 */
/** Vídeo resumo (mesmo id que youtu.be/9eq88NqYlJ4). */
export const SITE_DEFAULT_VIDEO_EMBED_URL = "https://youtu.be/9eq88NqYlJ4";
export const SITE_DEFAULT_VIDEO_TITLE = "Vídeo resumo meDIZ";
export const SITE_DEFAULT_VIDEO_THUMBNAIL_URL = "";

/** Episódio (YouTube ou .m4a/.mp3 — player nativo só para arquivo de áudio). */
export const SITE_DEFAULT_PODCAST_AUDIO_URL = "https://youtu.be/tyr6xVQqP7E";
export const SITE_DEFAULT_PODCAST_TITLE = "A guerra interna do Diabetes Tipo 1";
/** Rótulo do cartão (como no layout do player — texto pequeno em caixa alta). */
export const SITE_DEFAULT_PODCAST_EYEBROW = "PODCAST";
export const SITE_DEFAULT_PODCAST_SUBTITLE =
  "O que ninguém te contou sobre a origem emocional dessa condição";

export function normalizeAuthor(author: string | null | undefined): string {
  const t = typeof author === "string" ? author.trim() : "";
  return t || DEFAULT_ARTICLE_AUTHOR;
}

export function normalizeCategoryTag(tag: string | null | undefined): string {
  const t = typeof tag === "string" ? tag.trim() : "";
  if (!t) return DEFAULT_ARTICLE_CATEGORY_TAG;
  if (t.toLowerCase() === "artigo") return DEFAULT_ARTICLE_CATEGORY_TAG;
  return t;
}
