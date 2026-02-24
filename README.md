# Blog meDIZ

Backend e página única do blog (pt/es/en), com API para o n8n publicar artigos via HTTP (Bearer token).

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (PostgreSQL)
- Conta na [Vercel](https://vercel.com) (deploy)

## Configuração local

1. Clone o repositório e instale dependências:
   ```bash
   npm install
   ```

2. Copie o arquivo de ambiente e preencha:
   ```bash
   cp .env.example .env
   ```
   - **DATABASE_URL**: no Supabase, em *Settings → Database*, use a connection string (Session mode para desenvolvimento).
   - **API_BEARER_TOKEN**: token secreto que você define (não é gerado pela app). Veja [Como gerar o token](#como-gerar-o-token) abaixo.

3. Crie as tabelas no banco:
   ```bash
   npx prisma migrate dev
   ```
   (Na primeira vez, isso cria a migration e aplica.)

4. Inicie o servidor:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`. Páginas: `/pt`, `/es`, `/en` ou `/pt/slug-do-artigo`.

## API (para n8n)

**Documentação completa:** [docs/API.md](docs/API.md) — endpoints, como gerar o token e exemplos.

### Como gerar o token

O token é um segredo que **você cria** e coloca no `.env` e no n8n. Para gerar um valor forte no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a string gerada como `API_BEARER_TOKEN` no `.env` e no header do n8n: `Authorization: Bearer <valor>`.

### Criar ou atualizar artigo (Bearer obrigatório)

- **POST** `/api/articles`
- **Header:** `Authorization: Bearer <seu-token>`
- **Body (JSON):** um único payload, por exemplo:

```json
{
  "locale": "pt",
  "slug": "diabetes-tipo-1-origem-emocional",
  "title": "Diabetes Tipo 1 tem origem emocional?",
  "categoryTag": "Sistema Imune e Geral",
  "author": "Prof. Paulo Barbosa",
  "publishedAt": "2025-02-23T12:00:00.000Z",
  "content": {
    "mainContent": "<p>Texto principal do artigo...</p>",
    "surprises": [{ "text": "O Diabetes Tipo 1 não é uma doença do açúcar..." }],
    "video": { "embedUrl": "https://www.youtube.com/embed/xxx", "title": "Vídeo" },
    "mindmap": { "imageUrl": "https://...", "caption": "Legenda" },
    "podcast": { "audioUrl": "https://...", "title": "Episódio", "eyebrow": "Podcast" },
    "highlights": [{ "text": "Citação em destaque" }],
    "faq": [{ "question": "Pergunta?", "answer": "Resposta." }],
    "relatedSlugs": ["outro-artigo"]
  }
}
```

- **Resposta:** 201 (criado) ou 200 (atualizado) com o artigo salvo.

### Ler artigo (público)

- **GET** `/api/articles/:locale/:slug`  
  Ex.: `GET /api/articles/pt/diabetes-tipo-1-origem-emocional`

### Listar artigos por idioma (público)

- **GET** `/api/articles/:locale?limit=20&offset=0`

## Deploy na Vercel

1. Conecte o repositório à Vercel (Import Git Repository).
2. **Antes de fazer o primeiro deploy**, em **Settings → Environment Variables** adicione:
   - **`DATABASE_URL`**: URL do Supabase em **Transaction mode (pooler)**, porta **6543** (a mesma do seu `.env` para o app).
   - **`API_BEARER_TOKEN`**: o mesmo valor do seu `.env` (token que o n8n usa no header).
   Marque **Production** (e Preview se quiser).
3. Faça o deploy (Deploy ou Redeploy). O build roda `prisma generate`; a função usa Node 20.

Se aparecer "No Deployment" ou erro 500, confira os **Build Logs** e **Function Logs** no deploy e verifique se as duas variáveis estão preenchidas.

## Scripts

- `npm run dev` — servidor local com watch (tsx).
- `npm run start` — servidor local (tsx).
- `npm run build` — gera o cliente Prisma (`prisma generate`).
- `npm run postinstall` — roda após `npm install` (gera o cliente Prisma).

## Estrutura

- `src/` — app Express, rotas, middleware, config, Prisma client (gerado em `src/generated/prisma`).
- `api/` — entrada serverless para a Vercel.
- `public/` — `index.html` e `article-loader.js` (preenche a página a partir da API).
- `prisma/` — schema e migrations.
