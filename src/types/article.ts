/**
 * Estrutura do payload que o n8n envia em POST /api/articles.
 * O campo content pode incluir: mainContent/body, surprises[], video, mindmap, podcast, highlights[], faq[], relatedSlugs[], etc.
 */
export interface CreateArticlePayload {
  locale: "pt" | "es" | "en";
  slug: string;
  title: string;
  categoryTag?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  content: ArticleContentPayload;
}

export interface ArticleContentPayload {
  /** Texto principal do artigo (formato a definir: HTML ou Markdown). */
  mainContent?: string;
  /** Alternativa: body. */
  body?: string;
  /** Blocos "Isso vai te surpreender". */
  surprises?: Array<{ text: string }>;
  /** Vídeo: URL do embed (ex.: YouTube). */
  video?: { embedUrl?: string; title?: string } | null;
  /** Mapa mental: URL da imagem e legenda. */
  mindmap?: { imageUrl?: string; caption?: string } | null;
  /** Podcast: URL do áudio, título, eyebrow. */
  podcast?: { audioUrl?: string; title?: string; eyebrow?: string } | null;
  /** Citações em destaque. */
  highlights?: Array<{ text: string }>;
  /** FAQ: pergunta e resposta. */
  faq?: Array<{ question: string; answer: string }>;
  /** Slugs de artigos relacionados ("Quem leu isso também explorou"). */
  relatedSlugs?: string[];
  [key: string]: unknown;
}

const LOCALES = ["pt", "es", "en"] as const;

function isLocale(s: string): s is "pt" | "es" | "en" {
  return LOCALES.includes(s as (typeof LOCALES)[number]);
}

function isValidPayload(body: unknown): body is CreateArticlePayload {
  if (body === null || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.locale === "string" &&
    isLocale(b.locale) &&
    typeof b.slug === "string" &&
    b.slug.length > 0 &&
    typeof b.title === "string" &&
    b.title.length > 0 &&
    typeof b.content === "object" &&
    b.content !== null
  );
}

export { isLocale, isValidPayload, LOCALES };
