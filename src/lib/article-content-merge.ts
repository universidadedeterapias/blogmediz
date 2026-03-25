/**
 * Ao atualizar artigo via IA ou publish-text, o payload costuma trazer só texto (mainContent, faq…)
 * e omitir blocos preenchidos manualmente no admin. Sem merge, o replace completo do `content` apaga
 * mapa mental, vídeo e podcast.
 */
const MANUAL_MEDIA_KEYS = ["mindmap", "video", "podcast"] as const;

export function mergeContentPreservingManualMedia(
  previous: unknown,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const prev =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? (previous as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = { ...prev, ...incoming };

  for (const key of MANUAL_MEDIA_KEYS) {
    if (!(key in incoming) && prev[key] !== undefined) {
      out[key] = prev[key];
    }
  }

  return out;
}
