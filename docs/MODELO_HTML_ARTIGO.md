# Modelo completo de HTML para artigo

Use este template ao colar o texto na aba **Publicar texto pronto** ou ao editar manualmente. A estrutura segue exatamente o que o blog renderiza, na mesma ordem das seções que você envia hoje como JSON.

---

## Template completo (todas as seções)

Copie o bloco abaixo e substitua os textos pelos seus. A ordem das seções é fixa.

```html
<!-- 1. TEXTO PRINCIPAL -->
<div class="content-body">
  <p>Primeiro parágrafo do artigo. Introduza o tema.</p>
  <p>Segundo parágrafo. Desenvolva a ideia.</p>
  <h2 id="introducao">Introdução</h2>
  <p>Texto da seção introdução. Use <strong>negrito</strong> e <em>itálico</em> quando fizer sentido.</p>
  <h2 id="o-que-e">O que é e como funciona</h2>
  <p>Mais conteúdo...</p>
</div>

<!-- 2. ISSO VAI TE SURPREENDER -->
<div class="surprise">
  <div class="tag">💡 Isso vai te surpreender</div>
  <p>Texto do bloco surpresa. Uma descoberta ou insight em destaque.</p>
</div>

<!-- 3. VÍDEO — adicione a URL na aba Links de mídia -->
<!-- O vídeo é inserido automaticamente pelo painel admin -->

<!-- 4. MAPA MENTAL — adicione na aba Links de mídia -->
<!-- O mapa mental é inserido automaticamente pelo painel admin -->

<!-- 5. PODCAST — adicione na aba Links de mídia -->
<!-- O podcast é inserido automaticamente pelo painel admin -->

<!-- 6. CITAÇÕES EM DESTAQUE -->
<div class="hl"><p>"Citação ou frase em destaque do artigo."</p></div>
<div class="hl"><p>"Segunda citação, se houver."</p></div>

<!-- 7. A HIPÓTESE EMOCIONAL -->
<h2 id="hipotese">A hipótese emocional — o que pode estar por trás</h2>
<div class="content-body">
  <p>O que você vai ler não é diagnóstico. É uma hipótese do <strong>Sentido Biológico</strong>.</p>
  <p>Desenvolva a hipótese emocional do tema. Use parágrafos.</p>
</div>

<!-- 8. PADRÕES QUE APARECEM COM FREQUÊNCIA -->
<h2 id="padroes">Padrões que aparecem com frequência</h2>
<p>Uma hipótese do Sentido Biológico — sem confirmação científica estabelecida — sugere que esses padrões aparecem com recorrência em pessoas com doenças autoimunes:</p>
<ul class="patterns-list" style="padding-left:20px;margin-bottom:18px;color:var(--mid)">
  <li style="margin-bottom:8px">Ambiente familiar imprevisível nos anos de formação — amor disponível, mas com condições</li>
  <li style="margin-bottom:8px">Aprendizado precoce de que pedir cuidado é arriscado</li>
  <li style="margin-bottom:8px">Transição abrupta de contexto no período próximo ao diagnóstico</li>
  <li style="margin-bottom:8px">Conflito intenso entre querer pertencer e sentir que pertencer é perigoso</li>
</ul>

<!-- 9. PERGUNTAS FREQUENTES -->
<div class="faq" id="faq">
  <h2>Perguntas frequentes</h2>
  <div class="faq-item">
    <div class="faq-q">Primeira pergunta?</div>
    <div class="faq-a">Resposta da primeira pergunta.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">Segunda pergunta?</div>
    <div class="faq-a">Resposta da segunda pergunta.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">Terceira pergunta?</div>
    <div class="faq-a">Resposta da terceira pergunta.</div>
  </div>
</div>
```

---

## Correspondência com o JSON atual

| Seção no HTML | Campo no JSON |
|---------------|---------------|
| `<div class="content-body">` (primeiro) | `content.mainContent` |
| `<div class="surprise">` | `content.surprises[]` |
| Vídeo, mapa, podcast | `content.video`, `content.mindmap`, `content.podcast` (via Links de mídia) |
| `<div class="hl">` | `content.highlights[]` |
| `<h2 id="hipotese">` + `<div class="content-body">` | `content.hypothesis` |
| `<h2 id="padroes">` + `<ul class="patterns-list">` | `content.patterns[]` |
| `<div class="faq">` + `<div class="faq-item">` | `content.faq[]` |

---

## Regras importantes

1. **`h2` com `id`** — use kebab-case (ex.: `id="introducao"`, `id="o-que-e"`). Esses ids geram o índice de navegação.
2. **Ordem** — mantenha a ordem das seções como no template.
3. **Classes** — use exatamente `content-body`, `surprise`, `tag`, `hl`, `faq`, `faq-item`, `faq-q`, `faq-a`, `patterns-list`.
4. **Citações** — o texto dentro de `<div class="hl"><p>` deve ir entre aspas no HTML (`"..."`).
5. **Vídeo, mapa mental, podcast** — são preenchidos na aba "Links de mídia"; não coloque no HTML.

---

## Exemplo real (Diabetes)

```html
<div class="content-body">
  <p>Você ou alguém que ama vive com Diabetes Tipo 1. Já sabe tudo sobre insulina, glicemia, lancetas, carboidratos.</p>
  <p>Mas existe uma pergunta que quase ninguém faz — e que pode mudar completamente como você entende essa condição.</p>
  <h2 id="pancreas">O que o pâncreas faz — e o que poucos sabem</h2>
  <p>O pâncreas é o porteiro do metabolismo. Ele decide o que o corpo consegue usar do que entra.</p>
</div>

<div class="surprise">
  <div class="tag">💡 Isso vai te surpreender</div>
  <p>O Diabetes Tipo 1 não é uma doença do açúcar. É uma doença autoimune.</p>
</div>

<div class="hl"><p>"E se seu corpo não estivesse te atacando? E se ele estivesse tentando te mostrar onde você aprendeu que não merecia receber?"</p></div>

<h2 id="hipotese">A hipótese emocional — o que pode estar por trás</h2>
<div class="content-body">
  <p>O que você vai ler não é diagnóstico. É uma hipótese do Sentido Biológico — baseada em anos de pesquisa do Prof. Paulo Barbosa.</p>
  <p>O pâncreas, em termos simbólicos, governa a <strong>doçura de vida</strong>: a capacidade de receber o que está disponível e transformar isso em energia.</p>
</div>

<h2 id="padroes">Padrões que aparecem com frequência</h2>
<p>Uma hipótese do Sentido Biológico — sem confirmação científica estabelecida — sugere que esses padrões aparecem com recorrência em pessoas com doenças autoimunes:</p>
<ul class="patterns-list" style="padding-left:20px;margin-bottom:18px;color:var(--mid)">
  <li style="margin-bottom:8px">Ambiente familiar imprevisível nos anos de formação — amor disponível, mas com condições</li>
  <li style="margin-bottom:8px">Aprendizado precoce de que pedir cuidado é arriscado</li>
  <li style="margin-bottom:8px">Transição abrupta de contexto no período próximo ao diagnóstico</li>
  <li style="margin-bottom:8px">Conflito intenso entre querer pertencer e sentir que pertencer é perigoso</li>
</ul>

<div class="faq" id="faq">
  <h2>Perguntas frequentes</h2>
  <div class="faq-item">
    <div class="faq-q">Diabetes Tipo 1 pode ter causa emocional?</div>
    <div class="faq-a">A medicina classifica o DM1 como autoimune de causa desconhecida. O que observamos é que por trás de muitos diagnósticos há um momento de conflito emocional intenso.</div>
  </div>
  <div class="faq-item">
    <div class="faq-q">Por que o sistema imune atacaria o próprio corpo?</div>
    <div class="faq-a">Uma hipótese do Sentido Biológico: quando a pessoa não consegue distinguir o que é seguro do que é ameaça no campo emocional, o corpo pode espelhar essa confusão.</div>
  </div>
</div>
```
