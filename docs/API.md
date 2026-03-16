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

## O que cada campo do body atualiza no blog

Ao enviar o body do `POST /api/articles`, cada campo atualiza exatamente isto na página do artigo:

| O que aparece no blog | Campo no body | Exemplo / formato |
|----------------------|---------------|-------------------|
| **Título** (ex.: "Diabetes Tipo 1 tem origem emocional? O que o pâncreas está tentando te dizer") | `title` | string |
| **Autor** (ex.: "Prof. Paulo Barbosa") | `author` | string |
| **Data de publicação** (ex.: "Fev 2026") | `publishedAt` | string ISO 8601 (ex.: `"2026-02-01T00:00:00.000Z"`) |
| **Texto principal** — parágrafos, seções ("O que o pâncreas faz", "A hipótese emocional", "Padrões que aparecem com frequência" com a lista em tópicos), blockquotes, etc. | `content.mainContent` ou `content.body` | string (pode ser HTML) |
| **Bloco "Isso vai te surpreender"** (caixa com borda laranja e o texto em destaque) | `content.surprises` | array de `{ "text": "..." }` (cada item = um bloco) |
| **Citações em destaque** (bloco com borda lateral, ex.: "E se seu corpo não estivesse te atacando?") | `content.highlights` | array de `{ "text": "..." }` |
| **Perguntas frequentes** (seção FAQ: pergunta + resposta) | `content.faq` | array de `{ "question": "Pergunta?", "answer": "Resposta." }` |
| **Vídeo** (embed e miniatura) | `content.video` | `{ "embedUrl": "https://...", "thumbnailUrl": "https://...", "title": "..." }` |
| **Mapa mental** | `content.mindmap` | `{ "imageUrl": "...", "caption": "..." }` |
| **Podcast** (áudio) | `content.podcast` | `{ "audioUrl": "...", "title": "...", "eyebrow": "..." }` |
| **Artigos relacionados** | `content.relatedSlugs` | array de slugs (ex.: `["outro-artigo"]`) |
| **Categoria** (tag exibida na listagem) | `categoryTag` | string (ex.: "Sistema Imune e Geral") |

**Resumo para o que você citou:**  
- **Título** → `title`  
- **Perguntas frequentes** → `content.faq` (array de `question` + `answer`)  
- **Demais campos dos prints** → `content.mainContent` (todo o texto em HTML, incluindo "Padrões que aparecem com frequência" e as listas), `content.surprises` (blocos "Isso vai te surpreender") e `content.highlights` (citações em destaque).

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
  "author": "Nome do autor",
  "publishedAt": "2026-02-01T12:00:00.000Z",
  "content": {
    "mainContent": "<p>Parágrafos e seções em HTML...</p>",
    "surprises": [{ "text": "Primeiro bloco surpreender" }, { "text": "Segundo bloco" }],
    "highlights": [{ "text": "Citação em destaque" }],
    "faq": [
      { "question": "Pergunta 1?", "answer": "Resposta 1." },
      { "question": "Pergunta 2?", "answer": "Resposta 2." }
    ]
  }
}
```

No n8n: use o nó que chama a IA e, em seguida, um nó **Code** ou **Set** que pega `$json.response` (ou o campo onde está o JSON) e usa como body da requisição HTTP para `POST /api/articles`. Se a IA devolver o JSON dentro de um bloco markdown (ex.: entre \`\`\`json ... \`\`\`), use um passo antes para extrair só o JSON (regex ou Code).

**A API está preparada para receber esse JSON:** o `POST /api/articles` exige apenas `locale`, `slug`, `title` e `content` (objeto). Qualquer campo dentro de `content` (mainContent, surprises, highlights, faq, video, mindmap, podcast, etc.) é aceito e salvo no banco; não é necessário enviar todos os campos — só os que a IA preencher.

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
3. Monta o objeto `{ locale, slug, title, content: { mainContent, surprises, highlights, faq } }`.
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

**Objeto `content`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mainContent` ou `body` | string | Texto principal (HTML ou texto; formato flexível). |
| `surprises` | array de `{ text: string }` | Blocos "Isso vai te surpreender". |
| `video` | `{ embedUrl?: string, title?: string }` | Vídeo (ex.: embed do YouTube). |
| `mindmap` | `{ imageUrl?: string, caption?: string }` | Mapa mental. |
| `podcast` | `{ audioUrl?: string, title?: string, eyebrow?: string }` | Player de podcast. |
| `highlights` | array de `{ text: string }` | Citações em destaque. |
| `faq` | array de `{ question: string, answer: string }` | Perguntas frequentes. |
| `relatedSlugs` | array de string | Slugs de artigos relacionados. |

**Exemplo de body:**

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
    "mindmap": { "imageUrl": "https://exemplo.com/img.png", "caption": "Legenda" },
    "podcast": { "audioUrl": "https://exemplo.com/audio.m4a", "title": "Episódio", "eyebrow": "Podcast" },
    "highlights": [{ "text": "Citação em destaque" }],
    "faq": [{ "question": "Pergunta?", "answer": "Resposta." }],
    "relatedSlugs": ["outro-artigo"]
  }
}
```

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

O backend encaminha o mesmo body (`{ "email": "..." }`) em POST para a URL configurada em `NEWSLETTER_WEBHOOK_URL`. Exemplo no `.env`:

```env
NEWSLETTER_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/6dbb678d-e842-4b06-a290-e58b850936d5
```

**Respostas:**

- **200 OK** — Email aceito e encaminhado ao webhook.
- **400 Bad Request** — Email ausente ou inválido.
- **502 Bad Gateway** — Webhook não respondeu com sucesso.
- **503 Service Unavailable** — `NEWSLETTER_WEBHOOK_URL` não configurada.

---

### 5. Painel admin (vídeo, mapa mental, podcast)

Acesso único por senha (`ADMIN_SECRET`). Use a página **/admin** no navegador: escolha o artigo e preencha os links de vídeo (embed + miniatura), mapa mental e podcast. As requisições abaixo usam **Bearer** com o valor de `ADMIN_SECRET`.

| Ação | Método | Endpoint completo |
|------|--------|-------------------|
| Listar artigos (para o dropdown) | GET | `https://seu-projeto.vercel.app/api/admin/articles` |
| Ler artigo (para preencher o formulário) | GET | `https://seu-projeto.vercel.app/api/admin/articles/:locale/:slug` |
| Atualizar vídeo / mapa mental / podcast | PATCH | `https://seu-projeto.vercel.app/api/admin/articles/:locale/:slug` |

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
```

**Página do painel:** abra no navegador `https://seu-projeto.vercel.app/admin` (ou `http://localhost:3000/admin`). Digite a senha de admin uma vez; em seguida selecione o artigo e preencha os campos.

---

## Resumo rápido — endpoints completos

| Ação | Método | Endpoint completo (produção) | Endpoint completo (local) |
|------|--------|------------------------------|---------------------------|
| Criar/atualizar artigo | POST | `https://seu-projeto.vercel.app/api/articles` | `http://localhost:3000/api/articles` |
| Ler artigo | GET | `https://seu-projeto.vercel.app/api/articles/:locale/:slug` | `http://localhost:3000/api/articles/:locale/:slug` |
| Listar artigos | GET | `https://seu-projeto.vercel.app/api/articles/:locale?limit=20&offset=0` | `http://localhost:3000/api/articles/:locale?limit=20&offset=0` |
| Cadastro de email (newsletter) | POST | `https://seu-projeto.vercel.app/api/newsletter` | `http://localhost:3000/api/newsletter` |

**POST (criar/atualizar):** Header `Authorization: Bearer <token>` e `Content-Type: application/json`; body em JSON (ver seção do endpoint 1).  
**Newsletter:** body `{ "email": "..." }`; configure `NEWSLETTER_WEBHOOK_URL` para encaminhar ao n8n.  
**Admin:** `/admin` no navegador; API com `Authorization: Bearer <ADMIN_SECRET>`.
