# Documentação da API — Blog meDIZ

Base URL (local): `http://localhost:3000`  
Base URL (produção): `https://seu-projeto.vercel.app`

---

## Autenticação (Bearer token)

As rotas de **escrita** (POST) exigem o header:

```http
Authorization: Bearer <seu-token>
```

O token **não é gerado pela aplicação**. Você define um valor secreto e usa o **mesmo valor** em:

- `.env` → `API_BEARER_TOKEN=...`
- **n8n** → no nó HTTP Request, no campo de cabeçalhos (Headers), exatamente como abaixo
- Vercel → variável de ambiente `API_BEARER_TOKEN`

### Como gerar um token forte

Escolha **uma** das opções:

**1. Node.js (no terminal do projeto)**  
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copie a string gerada (ex.: `a1b2c3d4e5...`) e use como `API_BEARER_TOKEN`.

**2. PowerShell (Windows)**  
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**3. Site**  
Use um gerador de senha (ex.: 32 caracteres, letras e números) e cole o resultado no `.env` e no n8n.

Depois de definir o token:
- Coloque no `.env`: `API_BEARER_TOKEN=valor-gerado`
- **No n8n**, no nó *HTTP Request*, em **Headers** (Cabeçalhos), adicione:
  - **Name:** `Authorization`
  - **Value:** `Bearer valor-gerado` (escreva a palavra `Bearer`, um espaço e o token; substitua `valor-gerado` pelo token que você gerou)

---

## Cabeçalhos (Headers) — POST /api/articles

Para criar ou atualizar artigo, o nó HTTP Request do n8n deve enviar estes cabeçalhos:

| Nome            | Valor                    | Obrigatório |
|-----------------|--------------------------|-------------|
| `Authorization` | `Bearer <seu-token>`     | Sim         |
| `Content-Type`  | `application/json`      | Sim         |

**Exemplo (n8n):**

- **Header 1**  
  - Name: `Authorization`  
  - Value: `Bearer a1b2c3d4e5f6...` (o mesmo valor que está no `.env` em `API_BEARER_TOKEN`)

- **Header 2**  
  - Name: `Content-Type`  
  - Value: `application/json`

O n8n costuma preencher `Content-Type` automaticamente quando você escolhe "JSON" no body; nesse caso basta adicionar o header **Authorization**.

---

## Fluxo de publicação — o que vem de onde

| Origem | Campos | Descrição |
|--------|--------|-----------|
| **IA (via n8n)** | `title`, `content.mainContent`, `content.surprises`, `content.highlights`, `content.faq`, `content.hypothesis`, etc. | O que a IA gera e envia no `POST /api/articles`. |
| **Painel admin** | `content.video`, `content.mindmap`, `content.podcast` | Adicionados **manualmente** na aba "Links de mídia" do painel. A IA **não** envia YouTube, podcast nem mapa mental. |
| **Fixos no frontend** | Livro, PDF, ALINE | Sempre os mesmos em todos os artigos; não vêm do banco nem da IA. |

**Resumo:** A IA envia título, texto principal, FAQ e demais blocos de conteúdo. Depois, no painel admin, você escolhe o artigo e preenche YouTube, podcast e mapa mental. Livro, PDF e ALINE são blocos fixos na página.

**Seção "Últimos artigos":** Atualiza automaticamente quando um novo artigo entra — o frontend busca a lista na API a cada carregamento.

**sessionId nos webhooks:** Todos os webhooks chamados pelo blog (Aline, newsletter, publicação de artigo) incluem o campo `sessionId` no payload. Para Aline e newsletter, é o ID da sessão do usuário (cookie `aline_sid`). Para publicação de artigo (admin), é um ID único por requisição (`req-{timestamp}-{random}`). Use no n8n para correlacionar eventos.

---

## O que cada campo do body atualiza no blog

### Campos enviados pela IA (POST /api/articles)

| O que aparece no blog | Campo no body | Exemplo / formato |
|----------------------|---------------|-------------------|
| **Título** | `title` | string |
| **Autor** | `author` | string |
| **Data de publicação** | `publishedAt` | string ISO 8601 |
| **Texto principal** | `content.mainContent` ou `content.body` | string (HTML) |
| **Bloco "Isso vai te surpreender"** | `content.surprises` | array de `{ "text": "..." }` |
| **Citações em destaque** | `content.highlights` | array de `{ "text": "..." }` |
| **A hipótese emocional** | `content.hypothesis` | string (HTML) |
| **Padrões que aparecem com frequência** | `content.patterns` | array de strings |
| **Perguntas frequentes** | `content.faq` | array de `{ "question": "...", "answer": "..." }` |
| **Categoria** | `categoryTag` | string |

### Campos adicionados manualmente no painel admin (PATCH)

| O que aparece no blog | Campo | Como preencher |
|----------------------|-------|----------------|
| **Vídeo (YouTube)** | `content.video` | Aba "Links de mídia" → selecione o artigo → preencha URL do embed |
| **Mapa mental** | `content.mindmap` | Aba "Links de mídia" → URL da imagem ou **upload** (JPEG, PNG, GIF, WebP, máx. 5MB) |
| **Podcast** | `content.podcast` | Aba "Links de mídia" → URL do áudio (.mp3/.m4a) **ou** link do YouTube, título, eyebrow |

### Blocos fixos (não vêm da API)

Livro ("O Corpo Diz"), PDF Diabetes, ALINE — sempre os mesmos em todos os artigos.

---

## Como montar o body a partir da resposta da IA

A IA costuma devolver um único texto. Para preencher o body do `POST /api/articles`, você precisa **separar** esse texto nos campos certos. Duas formas:

### Opção 1 — A IA já devolve JSON (recomendado)

Peça na **prompt** que a IA responda em JSON com exatamente estes campos (um objeto por artigo):

```json
{
  "locale": "pt",
  "slug": "slug-do-artigo",
  "title": "Título do artigo",
  "categoryTag": "Sistema Imune e Geral",
  "author": "Prof. Paulo Barbosa",
  "publishedAt": "2026-02-01T12:00:00.000Z",
  "content": {
    "mainContent": "<p>Parágrafos e seções em HTML. Use h2 com id para seções no índice.</p><h2 id=\"intro\">Introdução</h2><p>...</p>",
    "surprises": [{ "text": "Bloco 'Isso vai te surpreender'" }],
    "highlights": [{ "text": "Citação em destaque" }],
    "hypothesis": "<p>A hipótese emocional do artigo — HTML.</p>",
    "patterns": [
      "Padrão 1 específico do tema",
      "Padrão 2",
      "Padrão 3"
    ],
    "faq": [
      { "question": "Pergunta 1?", "answer": "Resposta 1." },
      { "question": "Pergunta 2?", "answer": "Resposta 2." }
    ]
  }
}
```

**Não envie** `video`, `mindmap` nem `podcast` — adicionados manualmente no painel admin.  
**Opcionais:** `hypothesis`, `patterns` — se omitidos, usam valores padrão.

No n8n: use o nó que chama a IA e, em seguida, um nó **Code** ou **Set** que pega `$json.response` (ou o campo onde está o JSON) e usa como body da requisição HTTP para `POST /api/articles`. Se a IA devolver o JSON dentro de um bloco markdown (ex.: entre \`\`\`json ... \`\`\`), use um passo antes para extrair só o JSON (regex ou Code).

**A API aceita esse JSON:** o `POST /api/articles` exige apenas `locale`, `slug`, `title` e `content` (objeto). A IA deve enviar só: `mainContent`, `surprises`, `highlights`, `faq` e demais blocos de texto. Não é necessário enviar `video`, `mindmap` ou `podcast`.

### Opção 2 — A IA devolve texto ou markdown com seções

Peça na prompt que a IA use **títulos fixos** para cada parte, para você cortar no n8n:

- `## TÍTULO` → vai em `title`
- `## TEXTO PRINCIPAL` ou `## CONTEÚDO` → vai em `content.mainContent` (converta para HTML se precisar)
- `## ISSO VAI TE SURPREENDER` → cada parágrafo ou item de lista vira um item de `content.surprises[]` (cada um `{ "text": "..." }`)
- `## CITAÇÕES` ou `## DESTAQUE` → cada item em `content.highlights[]`
- `## PERGUNTAS FREQUENTES` ou `## FAQ` → pares pergunta/resposta em `content.faq[]` (`{ "question": "...", "answer": "..." }`)

No n8n: depois do nó da IA, use um nó **Code** (JavaScript) que:

1. Lê o texto completo da resposta.
2. Divide por esses títulos (ex.: `split("## TÍTULO")`, etc.).
3. Monta o objeto `{ locale, slug, title, content: { mainContent, surprises, highlights, faq } }` (sem video, mindmap, podcast).
4. Define esse objeto no output para o próximo nó (HTTP Request) usar como body.

Exemplo de prompt para a IA (adaptável):  
*“Responda em JSON com as chaves: title, content.mainContent, content.surprises (array de { text }), content.highlights (array de { text }), content.faq (array de { question, answer }). Use locale 'pt' e slug 'xxx'.”*

---

## Endpoints

### 1. Criar ou atualizar artigo (protegido)

Cria um novo artigo ou atualiza um existente para o par `locale` + `slug`.

| Item    | Valor |
|--------|--------|
| **Método** | `POST` |
| **Endpoint completo (produção)** | `https://seu-projeto.vercel.app/api/articles` |
| **Endpoint completo (local)** | `http://localhost:3000/api/articles` |
| **Autenticação** | Obrigatória (Bearer) |
| **Cabeçalhos** | Ver seção [Cabeçalhos (Headers)](#cabeçalhos-headers--post-apiarticles) acima. |
| **Content-Type** | `application/json` |

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `locale` | `"pt"` \| `"es"` \| `"en"` | Sim | Idioma do artigo. |
| `slug`   | string | Sim | Identificador único no idioma (ex.: `diabetes-tipo-1-origem-emocional`). |
| `title`  | string | Sim | Título do artigo. |
| `categoryTag` | string | Não | Categoria (ex.: "Sistema Imune e Geral"). |
| `author` | string | Não | Nome do autor. |
| `publishedAt` | string (ISO 8601) | Não | Data de publicação. |
| `content` | objeto | Sim | Blocos do conteúdo (ver tabela abaixo). |

**Objeto `content` (o que a IA envia):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mainContent` ou `body` | string | Texto principal (HTML; use `h2 id="..."` para seções no índice). |
| `surprises` | array de `{ text: string }` | Blocos "Isso vai te surpreender". |
| `highlights` | array de `{ text: string }` | Citações em destaque. |
| `hypothesis` | string (HTML) | Seção "A hipótese emocional — o que pode estar por trás". |
| `patterns` | array de string | Lista de padrões recorrentes (se omitido, usa lista padrão). |
| `faq` | array de `{ question: string, answer: string }` | Perguntas frequentes. |

**Campos opcionais (adicionados via painel admin, não pela IA):** `video`, `mindmap`, `podcast` — ver seção [Painel admin](#5-painel-admin-vídeo-mapa-mental-podcast).

**Exemplo de body (envio da IA):**

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
    "highlights": [{ "text": "Citação em destaque" }],
    "hypothesis": "<p>A hipótese emocional...</p>",
    "patterns": ["Padrão 1", "Padrão 2", "Padrão 3"],
    "faq": [{ "question": "Pergunta?", "answer": "Resposta." }]
  }
}
```

YouTube, podcast e mapa mental são preenchidos depois, no painel admin.

**Respostas:**

- **201 Created** — Artigo criado. Body: objeto do artigo salvo.
- **200 OK** — Artigo atualizado. Body: objeto do artigo salvo.
- **400 Bad Request** — Payload inválido (ex.: `locale`, `slug` ou `content` ausentes).
- **401 Unauthorized** — Header `Authorization` ausente ou mal formatado.
- **403 Forbidden** — Token inválido.
- **500 Internal Server Error** — Erro ao salvar no banco.

---

### 2. Ler artigo (público)

Retorna um artigo pelo idioma e slug.

| Item    | Valor |
|--------|--------|
| **Método** | `GET` |
| **Endpoint completo (produção)** | `https://seu-projeto.vercel.app/api/articles/:locale/:slug` |
| **Endpoint completo (local)** | `http://localhost:3000/api/articles/:locale/:slug` |
| **Autenticação** | Não |

**Exemplos (substitua `:locale` e `:slug` pelos valores reais):**

- Produção: `https://seu-projeto.vercel.app/api/articles/pt/diabetes-tipo-1-origem-emocional`
- Local: `http://localhost:3000/api/articles/pt/diabetes-tipo-1-origem-emocional`

**Respostas:**

- **200 OK** — Body: objeto do artigo (inclui `content`).
- **400 Bad Request** — `locale` ou `slug` inválidos.
- **404 Not Found** — Artigo não encontrado.
- **500 Internal Server Error** — Erro ao consultar o banco.

---

### 3. Listar artigos por idioma (público)

Lista artigos de um idioma (para listagens ou “Quem leu também explorou”).

| Item    | Valor |
|--------|--------|
| **Método** | `GET` |
| **Endpoint completo (produção)** | `https://seu-projeto.vercel.app/api/articles/:locale` ou com query: `https://seu-projeto.vercel.app/api/articles/:locale?limit=20&offset=0` |
| **Endpoint completo (local)** | `http://localhost:3000/api/articles/:locale` ou `http://localhost:3000/api/articles/:locale?limit=20&offset=0` |
| **Query** | `limit` (opcional, padrão 20, máx. 100), `offset` (opcional, padrão 0) |
| **Autenticação** | Não |

**Exemplos (substitua `:locale` por `pt`, `es` ou `en`):**

- Produção: `https://seu-projeto.vercel.app/api/articles/pt?limit=10&offset=0`
- Local: `http://localhost:3000/api/articles/pt?limit=10&offset=0`

**Resposta 200 OK:**  
Array de objetos com: `id`, `locale`, `slug`, `title`, `categoryTag`, `publishedAt` (sem o campo `content`).

---

### 4. Cadastro de email (newsletter) — encaminha para webhook

O email cadastrado no blog é enviado para um webhook (ex.: n8n). Configure a URL na variável de ambiente `NEWSLETTER_WEBHOOK_URL`.

| Item    | Valor |
|--------|--------|
| **Método** | `POST` |
| **Endpoint completo (produção)** | `https://seu-projeto.vercel.app/api/newsletter` |
| **Endpoint completo (local)** | `http://localhost:3000/api/newsletter` |
| **Autenticação** | Não |
| **Content-Type** | `application/json` |

**Body (JSON):**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `email` | string | Sim (email válido) |

**Exemplo:**  
`POST /api/newsletter` com body `{ "email": "usuario@exemplo.com" }`.

O backend encaminha `{ "email": "...", "sessionId": "..." }` em POST para a URL configurada em `NEWSLETTER_WEBHOOK_URL`. O `sessionId` é obtido do cookie do usuário (ou gerado) para correlacionar requisições no n8n. Exemplo no `.env`:

```env
NEWSLETTER_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/6dbb678d-e842-4b06-a290-e58b850936d5
```

**Respostas:**

- **200 OK** — Email aceito e encaminhado ao webhook.
- **400 Bad Request** — Email ausente ou inválido.
- **502 Bad Gateway** — Webhook não respondeu com sucesso.
- **503 Service Unavailable** — `NEWSLETTER_WEBHOOK_URL` não configurada.

---

### 5. Chat da Aline — salvar lead (após limite de 3 buscas)

Quando o usuário atinge o limite de 3 buscas na Aline, o fluxo pode pedir o e-mail e salvar o cliente no banco. O **n8n** (ou o frontend) chama este endpoint para gravar o lead.

| Item    | Valor |
|--------|--------|
| **Método** | `POST` |
| **Endpoint completo (produção)** | `https://seu-projeto.vercel.app/api/aline-lead` |
| **Endpoint completo (local)** | `http://localhost:3000/api/aline-lead` |
| **Autenticação** | Não |
| **Content-Type** | `application/json` |

**Body (JSON):**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `email` | string | Sim (email válido) |
| `name` | string | Não |
| `messageCount` | number | Não (padrão 3) |
| `summary` | string | Não (resumo da conversa) |

**Exemplo:**  
`POST /api/aline-lead` com body `{ "email": "cliente@exemplo.com", "name": "Maria", "messageCount": 3, "summary": "Buscou sobre ansiedade e sono" }`.

**Integração com n8n:** quando a Aline atingir o limite de 3 buscas, o workflow pode pedir o e-mail ao usuário. Ao receber a resposta com o e-mail, adicione um nó **HTTP Request** que chama `POST https://seu-projeto.vercel.app/api/aline-lead` com body `{ "email": "{{ $json.email }}", "name": "{{ $json.name }}", "messageCount": 3 }` (ajuste conforme os campos retornados pelo nó anterior).

**Respostas:**

- **201 Created** — Lead salvo no banco.
- **400 Bad Request** — Email ausente ou inválido.
- **500 Internal Server Error** — Erro ao gravar no banco.

---

### 6. Painel admin

Acesso único por senha (`ADMIN_SECRET`). Use a página **/admin** no navegador. O painel tem 4 abas: **Publicar via IA**, **Publicar texto pronto**, **Editar artigo** e **Links de mídia**.

| Ação | Método | Endpoint completo |
|------|--------|-------------------|
| Listar artigos | GET | `https://seu-projeto.vercel.app/api/admin/articles` |
| Ler artigo | GET | `https://seu-projeto.vercel.app/api/admin/articles/:locale/:slug` |
| Atualizar vídeo / mapa mental / podcast | PATCH | `https://seu-projeto.vercel.app/api/admin/articles/:locale/:slug` |
| Atualizar artigo completo (content, title, etc.) | PUT | `https://seu-projeto.vercel.app/api/admin/articles/:locale/:slug` |
| Enviar assunto para n8n (publicar via IA) | POST | `https://seu-projeto.vercel.app/api/admin/publish` |
| Publicar texto pronto | POST | `https://seu-projeto.vercel.app/api/admin/publish-text` |
| Corrigir via webhook | POST | `https://seu-projeto.vercel.app/api/admin/correct` |

**Headers:** `Authorization: Bearer <ADMIN_SECRET>`.

**PATCH body (todos opcionais, envie pelo menos um bloco):**

```json
{
  "video": { "embedUrl": "https://www.youtube.com/embed/...", "thumbnailUrl": "https://...", "title": "..." },
  "mindmap": { "imageUrl": "https://...", "caption": "..." },
  "podcast": { "audioUrl": "https://...", "title": "...", "eyebrow": "..." }
}
```

Configure no `.env` (ou na Vercel):

```env
ADMIN_SECRET=sua-senha-secreta-admin
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-service-role
```

**Upload de mapa mental:** na aba "Links de mídia", além de colar a URL, você pode enviar um arquivo (JPEG, PNG, GIF ou WebP, máx. 5MB). O upload usa Supabase Storage. Crie um bucket público chamado `mindmaps` no Supabase (Storage → New bucket → nome `mindmaps` → Public).

**PUT body (atualizar artigo completo):** `{ "content": { ... }, "title": "...", "publishedAt": "...", "scheduledAt": "...", "isPublished": true | false }`. O `content` é mesclado com o existente. Com `isPublished: false`, o artigo some da API pública (lista e página), sem ser apagado.

**PATCH body (mídia ou visibilidade):** além de `video`, `mindmap` e `podcast`, pode enviar só `{ "isPublished": false }` para tirar o artigo do ar.

**POST /api/admin/publish body:** `{ "locale", "slug?", "title?", "subject", "scheduledAt?" }`. O `scheduledAt` (ISO 8601) agenda a publicação; o n8n recebe e cria o artigo agendado.

**POST /api/admin/publish-text body:** `{ "locale", "slug", "title?", "content": { "mainContent", "surprises", "highlights", "hypothesis", "patterns", "faq" }, "scheduledAt?" }`. Publica imediatamente ou agendado.

**POST /api/admin/correct body:** `{ "locale", "slug" }`. Dispara o webhook de correção (configure `ARTICLE_CORRECT_WEBHOOK_URL`).

**Cron (Vercel):** `GET /api/cron/publish-scheduled` publica artigos com `scheduledAt <= now`. Protegido por `CRON_SECRET` (header `Authorization: Bearer` ou query `?secret=`). Configure `CRON_SECRET` na Vercel.

**Página do painel:** abra no navegador `https://seu-projeto.vercel.app/admin` (ou `http://localhost:3000/admin`). Digite a senha de admin uma vez; em seguida use as abas para publicar ou editar.

---

## Resumo rápido — endpoints completos

| Ação | Método | Endpoint completo (produção) | Endpoint completo (local) |
|------|--------|------------------------------|---------------------------|
| Criar/atualizar artigo | POST | `https://seu-projeto.vercel.app/api/articles` | `http://localhost:3000/api/articles` |
| Ler artigo | GET | `https://seu-projeto.vercel.app/api/articles/:locale/:slug` | `http://localhost:3000/api/articles/:locale/:slug` |
| Listar artigos | GET | `https://seu-projeto.vercel.app/api/articles/:locale?limit=20&offset=0` | `http://localhost:3000/api/articles/:locale?limit=20&offset=0` |
| Cadastro de email (newsletter) | POST | `https://seu-projeto.vercel.app/api/newsletter` | `http://localhost:3000/api/newsletter` |
| Salvar lead da Aline (após 3 buscas) | POST | `https://seu-projeto.vercel.app/api/aline-lead` | `http://localhost:3000/api/aline-lead` |
| Cron — publicar agendados | GET | `https://seu-projeto.vercel.app/api/cron/publish-scheduled` | — |

**POST (criar/atualizar):** Header `Authorization: Bearer <token>` e `Content-Type: application/json`; body em JSON (ver seção do endpoint 1).  
**Newsletter:** body `{ "email": "..." }`; configure `NEWSLETTER_WEBHOOK_URL` para encaminhar ao n8n.  
**Aline lead:** body `{ "email": "...", "name": "...", "messageCount": 3, "summary": "..." }`; chamado pelo n8n quando o usuário atinge o limite de buscas.  
**Admin:** `/admin` no navegador; API com `Authorization: Bearer <ADMIN_SECRET>`. Configure `ARTICLE_CORRECT_WEBHOOK_URL` e `CRON_SECRET` para correção e agendamento.
