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

  function buildContentHtml(content) {
    if (!content) return "";
    const html = [];
    const main = content.mainContent ?? content.body ?? "";
    if (main) html.push("<div class=\"content-body\">" + main + "</div>");
    (content.surprises || []).forEach(function (s) {
      html.push(
        "<div class=\"surprise\"><div class=\"tag\">💡 Isso vai te surpreender</div><p>" +
          escapeHtml(s.text || "") +
          "</p></div>"
      );
    });
    if (content.video && content.video.embedUrl) {
      const title = content.video.title ? " title=\"" + escapeHtml(content.video.title) + "\"" : "";
      html.push(
        "<div class=\"vid-wrap\"><iframe src=\"" +
          escapeHtml(content.video.embedUrl) +
          "\" allowfullscreen" +
          title +
          "></iframe></div>"
      );
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
      const eyebrow = content.podcast.eyebrow ? "<div class=\"eyebrow\">" + escapeHtml(content.podcast.eyebrow) + "</div>" : "";
      const title = content.podcast.title ? "<div class=\"title\">" + escapeHtml(content.podcast.title) + "</div>" : "";
      html.push(
        "<div class=\"podcast-block\" id=\"podcast-block\">" +
          "<button class=\"podcast-play-big\" id=\"playBtn\" aria-label=\"Ouvir episódio\"></button>" +
          "<div class=\"podcast-info\">" + eyebrow + title + "</div>" +
          "<audio id=\"podcastAudio\" src=\"" + escapeHtml(content.podcast.audioUrl) + "\"></audio>" +
          "<div class=\"podcast-waveform\" id=\"waveform\"></div>" +
          "<div class=\"podcast-prog\" id=\"progBar\"><div class=\"fill\" id=\"progFill\"></div></div>" +
          "<div class=\"podcast-duration\" id=\"durLabel\">Clique para ouvir</div>" +
          "</div>"
      );
    }
    (content.highlights || []).forEach(function (h) {
      html.push("<div class=\"hl\"><p>\"" + escapeHtml(h.text || "") + "\"</p></div>");
    });
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
    if (content.relatedSlugs && content.relatedSlugs.length > 0) {
      html.push("<div class=\"related\"><h2>Quem leu isso também explorou:</h2><div class=\"related-grid\" id=\"related-grid\"></div></div>");
    }
    return html.join("\n");
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function setMeta(article) {
    const cat = document.querySelector(".cat-tag");
    if (cat) cat.textContent = article.categoryTag || "";
    const titleEl = document.querySelector(".art-title");
    if (titleEl) titleEl.innerHTML = article.title.replace(/\n/g, "<br>");
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

  function fillRelated(container, locale, slugs) {
    if (!container || !slugs.length) return;
    fetch("/api/articles/" + locale + "?limit=20")
      .then(function (r) { return r.json(); })
      .then(function (list) {
        const bySlug = {};
        list.forEach(function (a) { bySlug[a.slug] = a; });
        const html = slugs.slice(0, 6).map(function (slug) {
          const a = bySlug[slug];
          const t = a ? a.title : slug;
          return "<a href=\"/" + locale + "/" + slug + "\" class=\"related-card\">" + escapeHtml(t) + "</a>";
        }).join("");
        container.innerHTML = html;
      })
      .catch(function () { container.innerHTML = ""; });
  }

  function run() {
    const { locale, slug } = getLocaleAndSlug();
    setLangActive(locale);
    if (!slug) return;
    updateLangLinks(locale, slug);
    fetch("/api/articles/" + locale + "/" + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then(function (article) {
        setMeta(article);
        const contentEl = document.querySelector(".content");
        if (contentEl && article.content) {
          contentEl.innerHTML = buildContentHtml(article.content);
          const relatedGrid = document.getElementById("related-grid");
          const content = article.content || {};
          if (relatedGrid && content.relatedSlugs && content.relatedSlugs.length > 0) {
            fillRelated(relatedGrid, locale, content.relatedSlugs);
          }
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
      .catch(function () {
        var contentEl = document.querySelector(".content");
        if (contentEl) contentEl.innerHTML = "<p>Artigo não encontrado.</p>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
