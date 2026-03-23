# Plano de implementação — Painel admin robusto

Documento de referência para não perder o contexto entre sessões.

---

## Resumo das fases

| Fase | Descrição |
|------|-----------|
| **1** | Prisma: `scheduledAt` + migration |
| **2** | Endpoints: PUT, publish-text, correct, cron |
| **3** | Vercel Cron em vercel.json |
| **4** | Admin UI: 4 abas, ambas formas de entrada (HTML completo + campos separados) |
| **5** | Documentação API.md |

---

## Fase 1 — Modelo de dados

- Adicionar `scheduledAt DateTime?` em `Article`
- Migration: `add_scheduled_at_to_article`
- Lógica: `scheduledAt` preenchido + `publishedAt` null = agendado. Cron seta `publishedAt` quando chega a hora.

---

## Fase 2 — Endpoints

| Endpoint | Função |
|----------|--------|
| `PUT /api/admin/articles/:locale/:slug` | Atualiza artigo completo (incluindo content) |
| `POST /api/admin/publish` | Ajustar: aceitar `scheduledAt` |
| `POST /api/admin/publish-text` | Publicar texto pronto (HTML ou campos), imediato ou agendado |
| `POST /api/admin/correct` | Dispara webhook correção com `{ locale, slug }` |
| `GET /api/cron/publish-scheduled` | Rota do Vercel Cron; publica artigos com `scheduledAt <= now` |

**Env:** `ARTICLE_CORRECT_WEBHOOK_URL`, `CRON_SECRET`

---

## Fase 3 — Vercel Cron

```json
"crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/15 * * * *" }]
```

---

## Fase 4 — Admin UI (4 abas)

| Aba | Conteúdo |
|-----|----------|
| **Publicar via IA** | Subject, slug, title, locale. Checkbox agendar + datetime. Botão enviar n8n. |
| **Publicar texto pronto** | Duas formas de entrada: (1) colar HTML completo, (2) campos separados (mainContent, surprises, highlights, hypothesis, patterns, faq). Agendar opcional. |
| **Editar artigo** | Select artigo. Duas formas de entrada: (1) editar HTML completo, (2) editar cada campo separado. Botão Salvar. Botão Corrigir via webhook. |
| **Links de mídia** | Sem mudanças (vídeo, mindmap, podcast) |

**Ambas as formas de entrada** em Publicar texto pronto e Editar artigo.

---

## Fase 5 — Documentação

- Atualizar docs/API.md com novos endpoints
- Documentar ARTICLE_CORRECT_WEBHOOK_URL, CRON_SECRET

---

## Webhook de correção

```
ARTICLE_CORRECT_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/3ebd8007-84ec-49b6-a701-ed77c5c40ec6
```
