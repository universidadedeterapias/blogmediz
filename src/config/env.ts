import "dotenv/config";

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
} as const;

export function assertEnv(): void {
  required("DATABASE_URL");
  required("API_BEARER_TOKEN");
}
