const required = (key: string): string => {
  const v = process.env[key];
  if (v === undefined || v === "") throw new Error(`Missing env: ${key}`);
  return v;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "3000")),
  databaseUrl: required("DATABASE_URL"),
  apiBearerToken: required("API_BEARER_TOKEN"),
  /** URL do webhook n8n para onde encaminhar emails cadastrados (newsletter). */
  newsletterWebhookUrl: optional("NEWSLETTER_WEBHOOK_URL", ""),
  /** Webhook n8n para publicação manual de artigos via painel admin. */
  articlePublishWebhookUrl: optional("ARTICLE_PUBLISH_WEBHOOK_URL", ""),
  /** Webhook n8n para o chat da Aline (recebe mensagem e retorna resposta). */
  alineWebhookUrl: optional("ALINE_WEBHOOK_URL", ""),
  /** Segredo único para acesso ao painel admin (Bearer token retornado no login). */
  adminSecret: optional("ADMIN_SECRET", ""),
  /** Email fixo para login no painel admin. */
  adminEmail: optional("ADMIN_EMAIL", ""),
  /** Senha fixa para login no painel admin. */
  adminPassword: optional("ADMIN_PASSWORD", ""),
  /** URL do projeto Supabase (ex.: https://xxx.supabase.co) — para upload de imagens no Storage. */
  supabaseUrl: optional("SUPABASE_URL", ""),
  /** Chave service_role do Supabase — para upload no Storage. Obtenha em Settings → API. */
  supabaseServiceKey: optional("SUPABASE_SERVICE_KEY", ""),
} as const;

export function assertEnv(): void {
  required("DATABASE_URL");
  required("API_BEARER_TOKEN");
}
