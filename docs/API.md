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

## Endpoints

### 1. Criar ou atualizar artigo (protegido)

Cria um novo artigo ou atualiza um existente para o par `locale` + `slug`.

| Item    | Valor |
|--------|--------|
| **Método** | `POST` |
| **Path**   | `/api/articles` |
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
| **Path**   | `/api/articles/:locale/:slug` |
| **Autenticação** | Não |

**Exemplo:**  
`GET /api/articles/pt/diabetes-tipo-1-origem-emocional`

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
| **Path**   | `/api/articles/:locale` |
| **Query**  | `limit` (opcional, padrão 20, máx. 100), `offset` (opcional, padrão 0) |
| **Autenticação** | Não |

**Exemplo:**  
`GET /api/articles/pt?limit=10&offset=0`

**Resposta 200 OK:**  
Array de objetos com: `id`, `locale`, `slug`, `title`, `categoryTag`, `publishedAt` (sem o campo `content`).

---

## Resumo rápido (n8n)

- **URL:** `https://seu-dominio.vercel.app/api/articles` (ou `http://localhost:3000/api/articles` em dev).
- **Método:** POST.
- **Header:** `Authorization: Bearer <token>` (token definido por você no `.env` e no n8n).
- **Body:** JSON no formato acima (um payload por artigo por idioma).

Para **ler** um artigo (sem token):  
`GET https://seu-dominio.vercel.app/api/articles/pt/slug-do-artigo`
