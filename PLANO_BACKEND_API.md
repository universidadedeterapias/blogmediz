# Plano: Backend + API para blog meDIZ (n8n + pt/es/en)

## Resumo das decisões

- **n8n** gera apenas textos e títulos e envia em um único payload por idioma.
- **Idiomas**: pt, es, en — conteúdo independente (páginas e endpoints por locale), sem tradução automática.
- **Autenticação**: Bearer token apenas na API que o n8n chama (criar/atualizar artigo).
- **Banco**: Supabase (PostgreSQL). `DATABASE_URL` no `.env`.
- **Hosting**: Backend na Vercel (produção); alterações feitas localmente e depois deploy.
- **Conteúdo do artigo**: Formato do body deixado flexível (string/HTML) para testar quando os endpoints existirem.

---

## Fase 1 — Banco de dados e Prisma

1. **Supabase**
   - Criar projeto no Supabase.
   - Em *Settings → Database* copiar a connection string (URI).
   - Usar a string "Transaction" (pooled) para serverless (Vercel). Formato:  
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`  
   - Para migrações locais, pode usar a connection string direta (porta 5432) se quiser.

2. **Schema Prisma**
   - Enum `Locale`: `pt`, `es`, `en`.
   - Modelo `Article`:
     - `id` (cuid), `locale`, `slug`, `title`, `categoryTag`, `author`, `publishedAt`, `createdAt`, `updatedAt`.
     - `content` (Json): um único objeto com toda a estrutura do artigo (mainContent, surprises[], video, mindmap, podcast, highlights[], faq[], relatedSlugs[]).
   - Índice único `[locale, slug]` para um artigo por idioma + slug.

3. **Variáveis de ambiente**
   - `.env.example` com `DATABASE_URL` e `API_BEARER_TOKEN` (e opcionalmente `NODE_ENV`).
   - Não alterar `.env` do usuário; apenas criar exemplo.

---

## Fase 2 — Estrutura do backend (Express na Vercel)

1. **Estrutura de pastas**
   - `src/`
     - `index.ts` — entrada do app (Express + rotas para Vercel).
     - `app.ts` — criação do Express, middleware, montagem de rotas.
     - `config/env.ts` — leitura de variáveis (PORT, API_BEARER_TOKEN, etc.).
     - `middleware/auth.ts` — validação de Bearer token para rotas da API de escrita.
     - `routes/articles.ts` — rotas de artigos (API).
     - `routes/site.ts` ou similar — servir o HTML estático e/ou rota de página.
     - `generated/prisma` — cliente Prisma (já configurado no schema).
   - `api/` (Vercel): ponto de entrada serverless que usa o app Express (ex.: `api/index.ts` → importa app e exporta para `@vercel/node`).

2. **Dependências**
   - Manter: express, prisma, @prisma/client, typescript, tsx, @types/node, @types/express.
   - Adicionar: `dotenv` (dev/dependência) para rodar localmente; para Vercel as env já estão no painel.

3. **Vercel**
   - `vercel.json`: rewrites para enviar tudo para `/api` (ou o path da serverless function).
   - Entrada serverless que importa o app Express e exporta como handler para a Vercel.

---

## Fase 3 — Endpoints HTTP

1. **POST /api/articles** (protegido com Bearer)
   - Header: `Authorization: Bearer <token>`.
   - Body (JSON): um único payload contendo:
     - `locale`: `"pt"` | `"es"` | `"en"`.
     - `slug`: string (único por locale).
     - `title`: string.
     - `categoryTag`: string opcional.
     - `author`: string opcional.
     - `publishedAt`: ISO string opcional.
     - `content`: objeto com todos os blocos (surprises, video, mindmap, podcast, highlights, faq, relatedSlugs, e um campo para o texto principal do artigo, ex. `mainContent` ou `body` — formato flexível string para você testar depois).
   - Comportamento: cria ou atualiza (upsert por `locale` + `slug`) o artigo no Supabase via Prisma.
   - Resposta: 201/200 com o artigo criado/atualizado (id, locale, slug, title, etc.).

2. **GET /api/articles/:locale/:slug** (público)
   - Retorna o artigo para o `locale` e `slug` dados.
   - 404 se não existir.

3. **GET /api/articles/:locale** (público, opcional)
   - Lista artigos do locale (ex.: para “Quem leu também explorou” ou listagem). Query params opcionais: `limit`, `offset`.

---

## Fase 4 — Front: mesma página em pt, es e en

1. **URL por idioma**
   - Estrutura: `/{locale}/{slug}` — ex.: `/pt/diabetes-tipo-1-origem-emocional`, `/es/...`, `/en/...`.
   - Raiz `/` pode redirecionar para `/pt` ou exibir landing/listagem.

2. **Entrega do HTML**
   - Servir o `public/index.html` (ou um template único) para todas as rotas de página (ex.: `/pt`, `/pt/:slug`, `/es`, `/es/:slug`, `/en`, `/en/:slug`) para que o front seja um “SPA” de uma página que lê locale e slug da URL.

3. **JavaScript no front**
   - Ao carregar a página, ler `locale` e `slug` do path (ex.: `/pt/diabetes-tipo-1` → locale=pt, slug=diabetes-tipo-1).
   - Chamar `GET /api/articles/:locale/:slug` e preencher os elementos da página (título, categoria, meta, “Isso vai te surpreender”, vídeo, mapa mental, podcast, citações, FAQ, relacionados).
   - Manter os botões de idioma (pt/es/en) apontando para `/{locale}/{slug}` para trocar de idioma sem traduzir — apenas mudar de página/endpoint.

4. **Conteúdo do artigo (body)**
   - O campo do corpo do artigo (parágrafos, subtítulos) virá em `content.mainContent` ou `content.body` como string. Você pode testar depois se é HTML ou Markdown; o backend só persiste e devolve. Se for Markdown, podemos adicionar conversão no front ou no backend em uma fase futura.

---

## Fase 5 — Arquivos e ajustes finais

1. **Scripts no package.json**
   - `build`: compilar TypeScript (tsc ou manter tsx).
   - `start`: rodar o servidor (node/tsx dist ou tsx src).
   - `dev`: tsx watch para desenvolvimento local.
   - `postinstall`: `prisma generate` (para Vercel gerar o client).

2. **tsconfig**
   - Garantir `rootDir`/`outDir` se for compilar para `dist`; ou usar tsx em dev e no start sem build.

3. **.env.example**
   - `DATABASE_URL=postgresql://...`
   - `API_BEARER_TOKEN=seu-token-secreto`
   - Comentário: no Supabase, usar a connection string do pooler (porta 6543) para produção.

4. **README (opcional e curto)**
   - Como rodar local (npm run dev, .env).
   - Como obter DATABASE_URL no Supabase e configurar API_BEARER_TOKEN.
   - Como fazer deploy na Vercel (vercel link, env no dashboard).

---

## Ordem de implementação

1. **Fase 1** — Schema Prisma (enum Locale, model Article com content Json), .env.example, instrução de DATABASE_URL no Supabase.
2. **Fase 2** — Estrutura de pastas, app Express, config env, middleware Bearer, integração Vercel (api/index.ts + vercel.json).
3. **Fase 3** — Rotas: POST /api/articles (upsert), GET /api/articles/:locale/:slug, GET /api/articles/:locale.
4. **Fase 4** — Servir o HTML estático nas rotas de página e JS no index.html para ler locale/slug da URL, chamar a API e preencher a página; links de idioma para /:locale/:slug.
5. **Fase 5** — Scripts (dev, build, start, postinstall), revisão de tsconfig e README.

---

## Sugestão Supabase (resumo)

- Criar projeto em [supabase.com](https://supabase.com).
- **Settings → Database** → Connection string:
  - **Session mode** (porta 5432): uso em migrações locais.
  - **Transaction mode** (porta 6543, pooler): uso em produção (Vercel). Recomendado para `DATABASE_URL` na Vercel.
- Colocar a mesma string no `.env` local e em **Vercel → Project → Settings → Environment Variables** (`DATABASE_URL`, `API_BEARER_TOKEN`).

Se estiver de acordo com este plano, responda **aprovado** (ou indique o que quer alterar) para eu seguir com a implementação na ordem acima.
