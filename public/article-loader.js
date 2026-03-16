/**
 * Carrega o artigo da API conforme locale/slug na URL e preenche a página.
 * URL esperada: /pt/slug-do-artigo | /es/slug | /en/slug
 */
(function () {
  const LOCALES = ["pt", "es", "en"];

  function getLocaleAndSlug() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "") || "";
    const parts = path.split("/");
    if (parts.length >= 1 && LOCALES.includes(parts[0])) {
      const locale = parts[0];
      const slug = parts[1] || null;
      return { locale, slug };
    }
    return { locale: "pt", slug: null };
  }

  function normalizeYoutubeEmbedUrl(url) {
    if (!url || typeof url !== "string") return "";
    var u = url.trim();
    var m = u.match(/(?:youtube\.com|m\.youtube\.com)\/(?:embed\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (!m) m = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    return m ? "https://www.youtube.com/embed/" + m[1] + "?rel=0&modestbranding=1" : "";
  }

  function buildContentHtml(content) {
    if (!content) return "";
    const html = [];
    const main = content.mainContent ?? content.body ?? "";
    if (main) html.push("<div class=\"content-body\">" + main + "</div>");
    (content.surprises || []).forEach(function (s) {
      var txt = typeof s === "string" ? s : (s && typeof s === "object" ? (s.text ?? s.content ?? s.value ?? "") : "");
      html.push(
        "<div class=\"surprise\"><div class=\"tag\">💡 Isso vai te surpreender</div><p>" +
          escapeHtml(txt || "") +
          "</p></div>"
      );
    });
    if (content.video && content.video.embedUrl) {
      var embedUrl = normalizeYoutubeEmbedUrl(content.video.embedUrl);
      if (embedUrl) {
        const title = content.video.title ? " title=\"" + escapeHtml(content.video.title) + "\"" : "";
        html.push(
          "<div class=\"vid-wrap\"><iframe src=\"" +
            escapeHtml(embedUrl) +
            "\" allowfullscreen" +
            title +
            "></iframe></div>"
        );
      }
    }
    if (content.mindmap && (content.mindmap.imageUrl || content.mindmap.caption)) {
      const img = content.mindmap.imageUrl
        ? "<img src=\"" + escapeHtml(content.mindmap.imageUrl) + "\" alt=\"\">"
        : "";
      const cap = content.mindmap.caption
        ? "<figcaption>" + escapeHtml(content.mindmap.caption) + "</figcaption>"
        : "";
      html.push("<figure class=\"mindmap\">" + img + cap + "</figure>");
    }
    if (content.podcast && content.podcast.audioUrl) {
      var podcastUrl = (content.podcast.audioUrl || "").trim();
      var youtubeEmbed = normalizeYoutubeEmbedUrl(podcastUrl);
      if (youtubeEmbed) {
        var podTitle = content.podcast.title ? " title=\"" + escapeHtml(content.podcast.title) + "\"" : "";
        html.push(
          "<div class=\"podcast-block podcast-youtube\" id=\"podcast-block\">" +
            (content.podcast.eyebrow ? "<div class=\"eyebrow\">" + escapeHtml(content.podcast.eyebrow) + "</div>" : "") +
            (content.podcast.title ? "<div class=\"title\" style=\"margin-bottom:12px;\">" + escapeHtml(content.podcast.title) + "</div>" : "") +
            "<div class=\"vid-wrap\"><iframe src=\"" + escapeHtml(youtubeEmbed) + "\" allowfullscreen" + podTitle + "></iframe></div>" +
          "</div>"
        );
      } else {
        const eyebrow = content.podcast.eyebrow ? "<div class=\"eyebrow\">" + escapeHtml(content.podcast.eyebrow) + "</div>" : "";
        const title = content.podcast.title ? "<div class=\"title\">" + escapeHtml(content.podcast.title) + "</div>" : "";
        html.push(
          "<div class=\"podcast-block\" id=\"podcast-block\">" +
            "<button class=\"podcast-play-big\" id=\"playBtn\" aria-label=\"Ouvir episódio\"></button>" +
            "<div class=\"podcast-info\">" + eyebrow + title + "</div>" +
            "<audio id=\"podcastAudio\" src=\"" + escapeHtml(podcastUrl) + "\"></audio>" +
            "<div class=\"podcast-waveform\" id=\"waveform\"></div>" +
            "<div class=\"podcast-prog\" id=\"progBar\"><div class=\"fill\" id=\"progFill\"></div></div>" +
            "<div class=\"podcast-duration\" id=\"durLabel\">Clique para ouvir</div>" +
            "</div>"
        );
      }
    }
    (content.highlights || []).forEach(function (h) {
      var txt = typeof h === "string" ? h : (h && typeof h === "object" ? (h.text || h.content || h.value || "") : "");
      html.push("<div class=\"hl\"><p>\"" + escapeHtml(txt || "") + "\"</p></div>");
    });
    if (content.hypothesis && content.hypothesis.trim()) {
      html.push(
        "<h2 id=\"hipotese\">A hipótese emocional — o que pode estar por trás</h2>" +
        "<div class=\"content-body\">" + content.hypothesis + "</div>"
      );
    }
    var patterns = content.patterns && content.patterns.length > 0
      ? content.patterns
      : [
          "Ambiente familiar imprevisível nos anos de formação — amor disponível, mas com condições",
          "Aprendizado precoce de que pedir cuidado é arriscado",
          "Transição abrupta de contexto no período próximo ao diagnóstico",
          "Conflito intenso entre querer pertencer e sentir que pertencer é perigoso"
        ];
    html.push(
      "<h2 id=\"padroes\">Padrões que aparecem com frequência</h2>" +
      "<p>Uma hipótese do Sentido Biológico — sem confirmação científica estabelecida — sugere que esses padrões aparecem com recorrência em pessoas com doenças autoimunes:</p>" +
      "<ul class=\"patterns-list\" style=\"padding-left:20px;margin-bottom:18px;color:var(--mid)\">" +
      patterns.map(function (p) { return "<li style=\"margin-bottom:8px\">" + escapeHtml(String(p)) + "</li>"; }).join("") +
      "</ul>"
    );
    if (content.faq && content.faq.length > 0) {
      html.push("<div class=\"faq\" id=\"faq\"><h2>Perguntas frequentes</h2>");
      content.faq.forEach(function (item) {
        html.push(
          "<div class=\"faq-item\">" +
            "<div class=\"faq-q\">" + escapeHtml(item.question || "") + "</div>" +
            "<div class=\"faq-a\">" + escapeHtml(item.answer || "") + "</div>" +
            "</div>"
        );
      });
      html.push("</div>");
    }
    html.push(
      "<a class=\"prod-card\" href=\"https://universidadedeterapias.com.br/guia-impresso\" target=\"_blank\" rel=\"noopener\">" +
        "<div class=\"prod-card-img\"><div class=\"prod-card-placeholder\" style=\"width:100%;height:100%;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:40px;\">📘</div></div>" +
        "<div class=\"prod-card-body\">" +
          "<div class=\"prod-card-eyebrow\">Para ir mais fundo</div>" +
          "<div class=\"prod-card-title\">O Corpo Diz — Prof. Paulo Barbosa</div>" +
          "<div class=\"prod-card-desc\">A função emocional completa de cada órgão, tecido e parte do corpo.</div>" +
          "<div class=\"prod-card-cta\">Conhecer o livro</div>" +
        "</div>" +
      "</a>"
    );
    html.push(
      "<a class=\"prod-card pdf\" href=\"https://universidadedeterapias.com.br\" target=\"_blank\" rel=\"noopener\">" +
        "<div class=\"prod-card-img\"><div class=\"prod-card-placeholder\" style=\"width:100%;height:100%;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:40px;\">📄</div></div>" +
        "<div class=\"prod-card-body\">" +
          "<div class=\"prod-card-eyebrow\">Guia completo</div>" +
          "<div class=\"prod-card-title\">PDF Sentido Biológico — Diabetes Tipo 1</div>" +
          "<div class=\"prod-card-desc\">Os 12 aspectos emocionais específicos do DM1. Decodificação completa para este diagnóstico.</div>" +
          "<div class=\"prod-card-cta\">Acessar o PDF</div>" +
        "</div>" +
      "</a>"
    );
    html.push(
      "<div class=\"email-capture\">" +
        "<h3>Aprofunde o assunto</h3>" +
        "<p>Receba uma apresentação pronta, guias em PDF e mais materiais. Só o seu e-mail:</p>" +
        "<div class=\"email-row\">" +
          "<input class=\"email-input\" id=\"newsletterEmail\" type=\"email\" placeholder=\"seu@email.com\" required>" +
          "<button class=\"email-submit\" id=\"newsletterSubmit\" type=\"button\">Receber</button>" +
        "</div>" +
        "<p class=\"email-msg\" id=\"newsletterMsg\" style=\"display:none;font-size:13px;margin-top:8px;\"></p>" +
      "</div>"
    );
    html.push(
      "<div class=\"aline-widget\" id=\"alineWidget\">" +
        "<div class=\"aline-header\">" +
          "<div class=\"aline-avatar\">🌿</div>" +
          "<div class=\"aline-header-text\">" +
            "<div class=\"aline-header-name\">Aline</div>" +
            "<div class=\"aline-header-sub\"><span class=\"aline-status\"></span></div>" +
          "</div>" +
        "</div>" +
        "<div class=\"aline-messages\" id=\"alineMsgs\">" +
          "<div class=\"msg bot\"><div class=\"msg-avatar\">🌿</div><div class=\"msg-bubble\">Olá! Sou a Aline, a pesquisadora de Sentido Biológico do meDIZ. Posso te ajudar a entender a origem emocional da sua dor ou sintoma.</div></div>" +
          "<div class=\"msg bot\"><div class=\"msg-avatar\">🌿</div><div class=\"msg-bubble\">Qual sintoma ou condição você quer explorar hoje?</div></div>" +
        "</div>" +
        "<div class=\"aline-input-row\">" +
          "<input class=\"aline-input\" id=\"alineInput\" type=\"text\" placeholder=\"Descreva sua dor ou sintoma...\">" +
          "<button class=\"aline-send\" id=\"alineSend\">➤</button>" +
        "</div>" +
        "<div class=\"aline-cta-strip\">" +
          "<a href=\"https://universidadedeterapias.com.br\" target=\"_blank\" rel=\"noopener\">Universidade de Terapias →</a>" +
          "<a href=\"https://universidadedeterapias.com.br/guia-impresso\" target=\"_blank\" rel=\"noopener\">Livro O Corpo Diz →</a>" +
        "</div>" +
      "</div>"
    );
    return html.join("\n");
  }

  function bindNewsletterForm(container) {
    if (!container) return;
    var btn = container.querySelector("#newsletterSubmit");
    var input = container.querySelector("#newsletterEmail");
    var msg = container.querySelector("#newsletterMsg");
    if (!btn || !input) return;
    btn.onclick = function () {
      var email = (input.value || "").trim();
      if (!email) {
        if (msg) { msg.textContent = "Digite seu e-mail."; msg.style.display = "block"; msg.style.color = "#e57373"; }
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (msg) { msg.textContent = "E-mail inválido."; msg.style.display = "block"; msg.style.color = "#e57373"; }
        return;
      }
      btn.disabled = true;
      if (msg) msg.style.display = "none";
      fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (res.ok) {
            if (msg) { msg.textContent = "Obrigado! Em breve você receberá os materiais."; msg.style.color = "#81c784"; msg.style.display = "block"; }
            input.value = "";
          } else {
            if (msg) { msg.textContent = (res.data && res.data.error) ? res.data.error : "Não foi possível cadastrar. Tente de novo."; msg.style.color = "#e57373"; msg.style.display = "block"; }
          }
        })
        .catch(function () {
          if (msg) { msg.textContent = "Erro de conexão. Tente de novo."; msg.style.color = "#e57373"; msg.style.display = "block"; }
        })
        .finally(function () { btn.disabled = false; });
    };
    input.onkeydown = function (e) { if (e.key === "Enter") btn.click(); };
  }

  function escapeHtml(s) {
    if (s == null || s === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  function setMeta(article) {
    if (!article) return;
    const cat = document.querySelector(".cat-tag");
    if (cat) cat.textContent = article.categoryTag || "";
    const titleEl = document.querySelector(".art-title");
    if (titleEl) titleEl.innerHTML = (article.title || "").replace(/\n/g, "<br>");
    document.title = article.title + " | meDIZ";
    const meta = document.querySelector(".art-meta");
    if (meta) {
      let metaHtml = "";
      if (article.author) metaHtml += "<span>✍️ " + escapeHtml(article.author) + "</span>";
      if (article.publishedAt) {
        const d = new Date(article.publishedAt);
        metaHtml += "<span>📅 " + d.toLocaleDateString("pt-BR") + "</span>";
      }
      meta.innerHTML = metaHtml || "<span>meDIZ</span>";
    }
  }

  function updateLangLinks(locale, slug) {
    document.querySelectorAll(".lang button[data-locale]").forEach(function (btn) {
      var l = btn.getAttribute("data-locale");
      if (l) btn.onclick = function () { window.location.href = slug ? "/" + l + "/" + slug : "/" + l; };
    });
  }

  function setLangActive(locale) {
    document.querySelectorAll(".lang button[data-locale], .lang a[data-locale]").forEach(function (el) {
      if (el.getAttribute("data-locale") === locale) el.classList.add("on");
      else el.classList.remove("on");
    });
    const html = document.documentElement;
    if (locale === "pt") html.setAttribute("lang", "pt-BR");
    else if (locale === "es") html.setAttribute("lang", "es");
    else html.setAttribute("lang", "en");
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function buildDynamicToc(container) {
    var tocNav = document.querySelector(".toc");
    if (!tocNav || !container) return;
    var h2s = container.querySelectorAll("h2");
    if (h2s.length === 0) {
      tocNav.innerHTML = "<span style='font-size:13px;color:var(--light);'>Nenhuma seção</span>";
      return;
    }
    var links = [];
    h2s.forEach(function (h2, i) {
      var id = h2.id || ("sec-" + i);
      if (!h2.id) {
        h2.id = slugify(h2.textContent) || id;
        id = h2.id;
      }
      links.push("<a href=\"#" + escapeHtml(id) + "\">" + escapeHtml((h2.textContent || "").trim()) + "</a>");
    });
    tocNav.innerHTML = links.join("");
  }

  function fillLatestArticles(locale) {
    var wrap = document.getElementById("latest-articles");
    var sb = document.getElementById("sidebar-latest-list");
    if (wrap) {
      wrap.innerHTML = "<p style='color:var(--mid);font-size:14px;'>Carregando…</p>";
      wrap.style.display = "block";
    }
    if (sb) {
      sb.innerHTML = "<li style='font-size:13px;color:var(--light);'>Carregando…</li>";
    }
    fetch("/api/articles/" + locale + "?limit=10&_=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("API " + r.status);
        return r.json();
      })
      .then(function (list) {
        if (!Array.isArray(list) || list.length === 0) {
          if (wrap) {
            wrap.innerHTML = "";
            wrap.style.display = "none";
          }
          if (sb) sb.innerHTML = "<li style='font-size:13px;color:var(--light);'>Nenhum artigo cadastrado ainda.</li>";
          return;
        }
        // limitar sidebar a 5
        var top5 = list.slice(0, 5);
        if (wrap) {
          var html = "<h2 style='font-family: Fraunces, serif; font-size: 1.25rem; margin-bottom: 12px; color: var(--dark);'>Últimos artigos</h2><ul class='latest-articles-list' style='list-style:none;padding:0;margin:0;'>";
          list.forEach(function (a) {
            html += "<li style='margin-bottom: 8px;'><a href=\"/" + locale + "/" + encodeURIComponent(a.slug) + "\" style='color: var(--terra); text-decoration: none;'>" + escapeHtml(a.title) + "</a></li>";
          });
          html += "</ul>";
          wrap.innerHTML = html;
        }
        if (sb) {
          sb.innerHTML = top5.map(function (a) {
            return "<li><a href=\"/" + locale + "/" + encodeURIComponent(a.slug) + "\">" + escapeHtml(a.title) + "</a></li>";
          }).join("");
        }
      })
      .catch(function (err) {
        if (wrap) {
          wrap.innerHTML = "<p style='font-size:14px;color:var(--light);'>Não foi possível carregar os artigos.</p>";
          wrap.style.display = "block";
        }
        if (sb) sb.innerHTML = "<li style='font-size:13px;color:var(--light);'>Não foi possível carregar os artigos.</li>";
      });
  }

  function loadArticle(locale, slug, contentEl) {
    return fetch("/api/articles/" + locale + "/" + encodeURIComponent(slug) + "?_=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then(function (article) {
        setMeta(article);
        if (contentEl && article.content) {
          try {
            contentEl.innerHTML = buildContentHtml(article.content);
            bindNewsletterForm(contentEl);
            buildDynamicToc(contentEl);
          } catch (e) {
            console.error("Erro ao renderizar artigo:", e);
            contentEl.innerHTML = "<p style='color:var(--light);'>Erro ao carregar o conteúdo do artigo.</p>";
          }
          var content = article.content || {};
          if (content.podcast && content.podcast.audioUrl) {
            setTimeout(function () {
              var playBtn = document.getElementById("playBtn");
              var audio = document.getElementById("podcastAudio");
              if (playBtn && audio) {
                playBtn.addEventListener("click", function () {
                  if (audio.paused) { audio.play(); playBtn.classList.add("playing"); }
                  else { audio.pause(); playBtn.classList.remove("playing"); }
                });
                audio.addEventListener("timeupdate", function () {
                  var fill = document.getElementById("progFill");
                  if (fill) fill.style.width = (audio.currentTime / audio.duration * 100) + "%";
                });
                audio.addEventListener("durationchange", function () {
                  var lab = document.getElementById("durLabel");
                  if (lab) lab.textContent = Math.floor(audio.duration / 60) + " min";
                });
              }
            }, 0);
          }
          document.querySelectorAll(".faq-item").forEach(function (item) {
            var q = item.querySelector(".faq-q");
            if (q) q.addEventListener("click", function () { item.classList.toggle("open"); });
          });
        }
      })
      .catch(function (err) {
        console.error("Erro ao carregar artigo:", err);
        throw err;
      });
  }

  function run() {
    const { locale, slug } = getLocaleAndSlug();
    setLangActive(locale);
    var contentEl = document.querySelector(".content");
    fillLatestArticles(locale);
    if (!slug) {
      updateLangLinks(locale, null);
      fetch("/api/articles/" + locale + "?limit=1&_=" + Date.now())
        .then(function (r) {
          if (!r.ok) throw new Error("API " + r.status);
          return r.json();
        })
        .then(function (list) {
          if (Array.isArray(list) && list.length > 0) {
            var newest = list[0];
            updateLangLinks(locale, newest.slug);
            return loadArticle(locale, newest.slug, contentEl);
          }
        })
        .catch(function () {
          if (contentEl) {
            contentEl.innerHTML = "<p style='color:var(--light);'>Nenhum artigo disponível.</p>";
            buildDynamicToc(contentEl);
          }
        });
      return;
    }
    updateLangLinks(locale, slug);
    loadArticle(locale, slug, contentEl).catch(function () {
      if (contentEl) {
        contentEl.innerHTML = "<p style='color:var(--light);'>Artigo não encontrado.</p>";
        buildDynamicToc(contentEl);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
