import { env } from "../config/env.js";
import {
  SITE_DEFAULT_PODCAST_AUDIO_URL,
  SITE_DEFAULT_PODCAST_EYEBROW,
  SITE_DEFAULT_PODCAST_SUBTITLE,
  SITE_DEFAULT_PODCAST_TITLE,
  SITE_DEFAULT_VIDEO_EMBED_URL,
  SITE_DEFAULT_VIDEO_THUMBNAIL_URL,
  SITE_DEFAULT_VIDEO_TITLE,
} from "./article-defaults.js";

function trimOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Artigo → .env → constantes do site (mesma ideia do autor/categoria padrão). */
function coalesceMedia(articleVal: string, envVal: string, siteVal: string): string {
  if (articleVal) return articleVal;
  const e = envVal.trim();
  if (e) return e;
  return siteVal.trim();
}

/** Conteúdo público: preenche video/podcast com defaults onde o artigo não definiu. */
export function mergeArticleContentWithMediaDefaults(content: unknown): Record<string, unknown> {
  const c =
    content && typeof content === "object" && !Array.isArray(content)
      ? ({ ...(content as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const vIn =
    c.video && typeof c.video === "object" && c.video !== null
      ? (c.video as Record<string, unknown>)
      : {};
  const pIn =
    c.podcast && typeof c.podcast === "object" && c.podcast !== null
      ? (c.podcast as Record<string, unknown>)
      : {};

  const embedUrl = coalesceMedia(trimOrEmpty(vIn.embedUrl), env.defaultVideoEmbedUrl, SITE_DEFAULT_VIDEO_EMBED_URL);
  const thumbnailUrl = coalesceMedia(
    trimOrEmpty(vIn.thumbnailUrl),
    env.defaultVideoThumbnailUrl,
    SITE_DEFAULT_VIDEO_THUMBNAIL_URL,
  );
  const videoTitle = coalesceMedia(trimOrEmpty(vIn.title), env.defaultVideoTitle, SITE_DEFAULT_VIDEO_TITLE);

  const audioUrl = coalesceMedia(trimOrEmpty(pIn.audioUrl), env.defaultPodcastAudioUrl, SITE_DEFAULT_PODCAST_AUDIO_URL);
  const podcastTitle = coalesceMedia(trimOrEmpty(pIn.title), env.defaultPodcastTitle, SITE_DEFAULT_PODCAST_TITLE);
  const eyebrow = coalesceMedia(trimOrEmpty(pIn.eyebrow), env.defaultPodcastEyebrow, SITE_DEFAULT_PODCAST_EYEBROW);
  const subtitle = coalesceMedia(trimOrEmpty(pIn.subtitle), env.defaultPodcastSubtitle, SITE_DEFAULT_PODCAST_SUBTITLE);

  const out = { ...c };

  if (embedUrl || thumbnailUrl || videoTitle) {
    const video: Record<string, string> = {};
    if (embedUrl) video.embedUrl = embedUrl;
    if (thumbnailUrl) video.thumbnailUrl = thumbnailUrl;
    if (videoTitle) video.title = videoTitle;
    out.video = video;
  } else {
    delete out.video;
  }

  if (audioUrl || podcastTitle || eyebrow || subtitle) {
    const podcast: Record<string, string> = {};
    if (audioUrl) podcast.audioUrl = audioUrl;
    if (podcastTitle) podcast.title = podcastTitle;
    if (eyebrow) podcast.eyebrow = eyebrow;
    if (subtitle) podcast.subtitle = subtitle;
    out.podcast = podcast;
  } else {
    delete out.podcast;
  }

  return out;
}

/** PATCH admin: strings vazias removem o campo gravado (volta ao padrão público). */
export function applyVideoPodcastPatchToContent(
  currentContent: Record<string, unknown>,
  videoIn: unknown,
  podcastIn: unknown,
): Record<string, unknown> {
  const next = { ...currentContent };

  if (videoIn !== null && typeof videoIn === "object" && !Array.isArray(videoIn)) {
    const incoming = videoIn as Record<string, unknown>;
    const cur =
      next.video && typeof next.video === "object" && next.video !== null
        ? { ...(next.video as Record<string, unknown>) }
        : {};
    for (const k of ["embedUrl", "thumbnailUrl", "title"] as const) {
      if (Object.prototype.hasOwnProperty.call(incoming, k)) {
        const s = String(incoming[k] ?? "").trim();
        if (s === "") delete cur[k];
        else cur[k] = s;
      }
    }
    if (Object.keys(cur).length > 0) next.video = cur;
    else delete next.video;
  }

  if (podcastIn !== null && typeof podcastIn === "object" && !Array.isArray(podcastIn)) {
    const incoming = podcastIn as Record<string, unknown>;
    const cur =
      next.podcast && typeof next.podcast === "object" && next.podcast !== null
        ? { ...(next.podcast as Record<string, unknown>) }
        : {};
    for (const k of ["audioUrl", "title", "eyebrow", "subtitle"] as const) {
      if (Object.prototype.hasOwnProperty.call(incoming, k)) {
        const s = String(incoming[k] ?? "").trim();
        if (s === "") delete cur[k];
        else cur[k] = s;
      }
    }
    if (Object.keys(cur).length > 0) next.podcast = cur;
    else delete next.podcast;
  }

  return next;
}
