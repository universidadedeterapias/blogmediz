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

  /** Remove o “casco” estático do index.html depois de preencher o artigo pela API. */
  function clearArticleShellLoading() {
    document.documentElement.classList.remove("article-shell-loading");
    var o = document.querySelector(".article-loading-overlay");
    if (o) o.remove();
  }

  function normalizeYoutubeEmbedUrl(url) {
    if (!url || typeof url !== "string") return "";
    var u = url.trim();
    var m = u.match(/(?:youtube\.com|m\.youtube\.com)\/(?:embed\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (!m) m = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    return m ? "https://www.youtube.com/embed/" + m[1] + "?rel=0&modestbranding=1" : "";
  }

  function podcastWaveformSpans() {
    var parts = [];
    for (var i = 0; i < 12; i++) parts.push("<span></span>");
    return parts.join("");
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
      var p = content.podcast;
      var podcastUrl = (p.audioUrl || "").trim();
      var youtubeEmbed = normalizeYoutubeEmbedUrl(podcastUrl);
      var eyebrowRaw = p.eyebrow && String(p.eyebrow).trim() ? String(p.eyebrow).trim() : "PODCAST";
      var titleHtml = p.title ? "<div class=\"title\">" + escapeHtml(p.title) + "</div>" : "";
      var subHtml = p.subtitle && String(p.subtitle).trim()
        ? "<div class=\"subtitle\">" + escapeHtml(String(p.subtitle).trim()) + "</div>"
        : "";
      var ytAttr = youtubeEmbed
        ? " data-podcast-youtube=\"" + escapeHtml(youtubeEmbed) + "\""
        : "";
      html.push(
        "<div class=\"podcast-block\" id=\"podcast-block\"" + ytAttr + ">" +
          "<button type=\"button\" class=\"podcast-play-big\" id=\"playBtn\" aria-label=\"Ouvir episódio\"></button>" +
          "<div class=\"podcast-info\">" +
          "<div class=\"eyebrow\">" + escapeHtml(eyebrowRaw) + "</div>" +
          titleHtml +
          subHtml +
          "<div class=\"podcast-waveform paused\" id=\"waveform\">" + podcastWaveformSpans() + "</div>" +
          "<div class=\"podcast-prog\" id=\"progBar\"><div class=\"fill\" id=\"progFill\"></div></div>" +
          "<div class=\"podcast-duration\" id=\"durLabel\">Clique para ouvir</div>" +
          "</div>" +
          "</div>" +
          (youtubeEmbed ? "" : "<audio id=\"podcastAudio\" preload=\"metadata\" playsinline src=\"" + escapeHtml(podcastUrl) + "\"></audio>")
      );
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
        "<div class=\"prod-card-img\"><img src=\"/images/prod-livro-o-corpo-diz.png\" alt=\"O Corpo Diz — Prof. Paulo Barbosa\" width=\"600\" height=\"600\" loading=\"lazy\" decoding=\"async\"></div>" +
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
        "<div class=\"prod-card-img\"><img src=\"/images/prod-pdf-sentido-biologico.png\" alt=\"PDF Sentido Biológico — Diabetes Tipo 1\" width=\"600\" height=\"600\" loading=\"lazy\" decoding=\"async\"></div>" +
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

  function estimateReadMinutes(article) {
    var c = article.content || {};
    var html = String(c.mainContent || c.body || "");
    var text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return null;
    var words = text.split(/\s/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  var DEFAULT_AUTHOR = "Prof. Paulo Barbosa";
  var DEFAULT_CATEGORY = "Sistema Imune e Geral";

  function displayCategory(tag) {
    var t = (tag || "").trim();
    if (!t || t.toLowerCase() === "artigo") return DEFAULT_CATEGORY;
    return t;
  }

  function displayAuthor(author) {
    var a = (author || "").trim();
    return a || DEFAULT_AUTHOR;
  }

  function setMeta(article) {
    if (!article) return;
    var cat = document.querySelector(".cat-tag");
    if (cat) {
      cat.textContent = displayCategory(article.categoryTag);
      cat.style.display = "";
    }
    var titleEl = document.querySelector(".art-title");
    if (titleEl) {
      var lines = String(article.title || "").split("\n");
      titleEl.innerHTML = lines.map(function (line) { return escapeHtml(line); }).join("<br>");
    }
    var plainTitle = String(article.title || "meDIZ").replace(/\n/g, " ").trim();
    document.title = plainTitle + " | meDIZ";
    var meta = document.querySelector(".art-meta");
    if (meta) {
      var metaHtml = "";
      metaHtml += "<span>✍️ " + escapeHtml(displayAuthor(article.author)) + "</span>";
      var mins = estimateReadMinutes(article);
      if (mins != null) metaHtml += "<span>⏱ " + mins + " min de leitura</span>";
      if (article.publishedAt) {
        var d = new Date(article.publishedAt);
        var monthsPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        metaHtml += "<span>📅 " + monthsPt[d.getMonth()] + " " + d.getFullYear() + "</span>";
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

  /** Player único do print: áudio nativo ou YouTube só em iframe oculto (sem miniatura na página). */
  function bindPodcastPlayer() {
    setTimeout(function () {
      var block = document.getElementById("podcast-block");
      var playBtn = document.getElementById("playBtn");
      if (!block || !playBtn) return;

      var wf = document.getElementById("waveform");
      var fill = document.getElementById("progFill");
      var dur = document.getElementById("durLabel");
      var bar = document.getElementById("progBar");

      var yt = block.getAttribute("data-podcast-youtube");
      if (yt) {
        var iframeEl = null;
        function ensureYtFrame() {
          if (iframeEl) return iframeEl;
          var holder = document.getElementById("podcast-yt-hidden");
          if (!holder) {
            holder = document.createElement("div");
            holder.id = "podcast-yt-hidden";
            holder.setAttribute("aria-hidden", "true");
            holder.style.cssText =
              "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
            holder.innerHTML =
              "<iframe id=\"podcastYtFrame\" title=\"Podcast\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" style=\"border:0;width:560px;height:315px\"></iframe>";
            document.body.appendChild(holder);
          }
          iframeEl = document.getElementById("podcastYtFrame");
          return iframeEl;
        }
        var ytPlaying = false;
        playBtn.addEventListener("click", function () {
          var fr = ensureYtFrame();
          if (ytPlaying) {
            fr.src = "about:blank";
            ytPlaying = false;
            playBtn.classList.remove("playing");
            if (wf) wf.classList.add("paused");
            if (fill) fill.style.width = "0%";
            if (dur) dur.textContent = "Clique para ouvir";
          } else {
            var sep = yt.indexOf("?") >= 0 ? "&" : "?";
            fr.src = yt + sep + "autoplay=1";
            ytPlaying = true;
            playBtn.classList.add("playing");
            if (wf) wf.classList.remove("paused");
            if (dur) dur.textContent = "Reproduzindo…";
          }
        });
        return;
      }

      var audio = document.getElementById("podcastAudio");
      if (!audio) return;

      function fmt(s) {
        var m = Math.floor(s / 60);
        return m + ":" + String(Math.floor(s % 60)).padStart(2, "0");
      }
      var playing = false;

      playBtn.addEventListener("click", function () {
        if (playing) {
          audio.pause();
          playing = false;
          playBtn.classList.remove("playing");
          if (wf) wf.classList.add("paused");
        } else {
          audio.play();
          playing = true;
          playBtn.classList.add("playing");
          if (wf) wf.classList.remove("paused");
        }
      });
      audio.addEventListener("timeupdate", function () {
        if (audio.duration && fill) {
          fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
          if (dur) dur.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
        }
      });
      audio.addEventListener("ended", function () {
        playing = false;
        playBtn.classList.remove("playing");
        if (wf) wf.classList.add("paused");
        if (fill) fill.style.width = "0%";
        if (dur) dur.textContent = "Clique para ouvir";
      });
      if (bar) {
        bar.addEventListener("click", function (e) {
          if (!audio.duration) return;
          var r = bar.getBoundingClientRect();
          audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
        });
      }
    }, 0);
  }

  function fillLatestArticles(locale) {
    var sb = document.getElementById("sidebar-latest-list");
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
          if (sb) sb.innerHTML = "<li style='font-size:13px;color:var(--light);'>Nenhum artigo cadastrado ainda.</li>";
          return;
        }
        var top10 = list.slice(0, 10);
        if (sb) {
          sb.innerHTML = top10.map(function (a) {
            return "<li><a href=\"/" + locale + "/" + encodeURIComponent(a.slug) + "\">" + escapeHtml(a.title) + "</a></li>";
          }).join("");
        }
      })
      .catch(function (err) {
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
          bindPodcastPlayer();
          document.querySelectorAll(".faq-item").forEach(function (item) {
            var q = item.querySelector(".faq-q");
            if (q) q.addEventListener("click", function () { item.classList.toggle("open"); });
          });
        }
        clearArticleShellLoading();
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
          if (contentEl) {
            contentEl.innerHTML = "<p style='color:var(--light);'>Nenhum artigo disponível.</p>";
            buildDynamicToc(contentEl);
          }
          clearArticleShellLoading();
        })
        .catch(function () {
          if (contentEl) {
            contentEl.innerHTML = "<p style='color:var(--light);'>Nenhum artigo disponível.</p>";
            buildDynamicToc(contentEl);
          }
          clearArticleShellLoading();
        });
      return;
    }
    updateLangLinks(locale, slug);
    loadArticle(locale, slug, contentEl).catch(function () {
      if (contentEl) {
        contentEl.innerHTML = "<p style='color:var(--light);'>Artigo não encontrado.</p>";
        buildDynamicToc(contentEl);
      }
      clearArticleShellLoading();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
