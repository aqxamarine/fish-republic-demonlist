/* ============================================================
   Fish Republic Demonlist — renders the whole list from
   data/levels.json. Add or rearrange levels there; no need
   to touch this file.
   ============================================================ */

(function () {
  "use strict";

  /**
   * Which page is this script rendering? Read from the script tag:
   *   <script src="./js/app.js" data-page="future"></script>
   * Lists in levels.json are assigned to pages via their own "page" field
   * (defaults to "home" when omitted).
   */
  var scriptTag = document.querySelector('script[src*="app.js"]');
  var currentPage = (scriptTag && scriptTag.dataset.page) || "home";

  /** Small helper: create an element with a class and optional text. */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Build the scroll-to filter chips from the list config. */
  function buildFilters(lists) {
    var filters = el("div", "filters");
    var group = el("nav", "filters__group");
    lists.forEach(function (list) {
      var chip = el("a", "filters__chip", list.label);
      chip.href = "#" + list.id + "-list";
      group.appendChild(chip);
    });
    filters.appendChild(group);
    return filters;
  }

  /** Round to 1 decimal and drop a trailing ".0" (500 → "500", 33.33 → "33.3"). */
  function formatPoints(value) {
    var rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  /**
   * Auto-calculate points for every level.
   *
   * Levels in "scored" lists share one ladder: the top level (#1) gets 500,
   * and each step down the ladder adds 500 / N (N = total scored levels),
   * so the bottom scored level gets 500 / N x 1. Levels in unscored lists
   * (e.g. Legacy, #26+) always get 0.
   */
  function computePoints(data) {
    var scoredIds = {};
    (data.lists || []).forEach(function (list) {
      scoredIds[list.id] = list.scored !== false; // scored by default
    });

    var scored = (data.levels || [])
      .filter(function (level) { return scoredIds[level.list]; })
      .sort(function (a, b) { return a.rank - b.rank; });

    var n = scored.length;
    var step = n > 0 ? 500 / n : 0;

    scored.forEach(function (level, i) {
      // i = 0 is the top level → xN; the last scored level → x1
      level.points = formatPoints(step * (n - i));
    });

    // Everything outside the scored lists is worth 0
    (data.levels || []).forEach(function (level) {
      if (!scoredIds[level.list]) level.points = "0";
    });
  }

  /** Build one level card. */
  function buildCard(level, site) {
    var card = el("article", "level-card");
    card.dataset.rank = level.rank;

    var thumb = el("div", "level-card__thumb");
    thumb.style.backgroundImage = "url('" + level.thumbnail + "')";
    card.appendChild(thumb);

    var info = el("div", "level-card__info");

    // Remember the level name so the AREDL loader can stamp the placement later
    card.dataset.name = String(level.name).trim().toLowerCase();

    // Top row: level name on the left, AREDL placement pinned right
    var top = el("div", "level-card__top");
    top.appendChild(el("h2", "level-card__name", "#" + level.rank + " – " + level.name));
    top.appendChild(el("span", "level-card__aredl")); // filled in by loadAredlPlacements()
    info.appendChild(top);

    info.appendChild(el("p", "level-card__author", "By " + level.creator));

    var meta = el("div", "level-card__meta");
    meta.appendChild(
      el("span", "level-card__points", level.points + " " + (site.pointsLabel || "points"))
    );
    var beaten = Array.isArray(level.beatenBy) ? level.beatenBy.join(", ") : level.beatenBy;
    meta.appendChild(el("span", "level-card__beaten", "Beaten by: " + beaten));
    info.appendChild(meta);

    card.appendChild(info);
    return card;
  }

  /** Build one list section (background, divider, cards / empty state). */
  function buildSection(list, levels, site, index, total) {
    var section = el("section", "section");
    section.id = list.id + "-list";
    if (index === 0) section.classList.add("section--first");
    if (index === total - 1) section.classList.add("section--last");
    if (list.background) {
      section.style.backgroundImage = "url('" + list.background + "')";
    }

    var inner = el("div", "section__inner");

    if (list.divider) {
      var divider = el("div", "list-divider");
      divider.appendChild(el("span", null, list.divider));
      inner.appendChild(divider);
    }

    if (levels.length === 0) {
      var empty = el("div", "empty-state");
      empty.appendChild(
        el("span", null, "No " + list.label + " levels yet.")
      );
      inner.appendChild(empty);
    } else {
      levels.forEach(function (level) {
        inner.appendChild(buildCard(level, site));
      });
    }

    section.appendChild(inner);
    return section;
  }

  /** Friendly error screen (e.g. page opened via file:// where fetch is blocked). */
  function renderError(err) {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var box = el("div", "error-box");
    box.appendChild(el("h2", null, "Couldn't load data/levels.json"));
    box.appendChild(
      el(
        "p",
        null,
        "This page needs to be served over HTTP (browsers block fetch on file:// URLs). " +
          "Run one of these in the project folder, then reload:"
      )
    );
    var code = el("pre", null,
      "npx serve\n" +
      "python -m http.server 8000"
    );
    box.appendChild(code);
    box.appendChild(el("p", null, String(err && err.message ? err.message : err)));
    app.appendChild(box);
  }

  /**
   * Fetch placements from the AREDL (All Rated Extreme Demons List) API and
   * stamp "AREDL #N" onto every card whose level name matches. Runs in the
   * background — if the API is unreachable the cards simply show no badge.
   */
  function loadAredlPlacements() {
    fetch("https://api.aredl.net/v2/api/aredl/levels")
      .then(function (res) {
        if (!res.ok) throw new Error("AREDL HTTP " + res.status);
        return res.json();
      })
      .then(function (aredlLevels) {
        var byName = {};
        (aredlLevels || []).forEach(function (entry) {
          var key = String(entry.name).trim().toLowerCase();
          if (!(key in byName)) byName[key] = entry.position;
        });

        document.querySelectorAll(".level-card").forEach(function (card) {
          var position = byName[card.dataset.name];
          var badge = card.querySelector(".level-card__aredl");
          if (badge && position) {
            badge.textContent = "AREDL #" + position;
          }
        });
      })
      .catch(function () {
        // Placements are a nice-to-have; don't break the page over them.
      });
  }

  function render(data) {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var site = data.site || {};
    var lists = data.lists || [];
    var levels = Array.isArray(data.levels) ? data.levels : [];

    computePoints(data);

    // Only render the lists assigned to this page
    var pageLists = lists.filter(function (list) {
      return (list.page || "home") === currentPage;
    });

    pageLists.forEach(function (list, i) {
      var inList = levels
        .filter(function (l) { return l.list === list.id; })
        .sort(function (a, b) { return a.rank - b.rank; });

      var section = buildSection(list, inList, site, i, pageLists.length);

      // The filter chips live at the top of the first section
      // (only worth showing when there is more than one list to jump between)
      if (i === 0 && pageLists.length > 1) {
        section.insertBefore(buildFilters(pageLists), section.firstChild);
      } else if (i === 0) {
        // No chip bar — pad below the fixed navbar instead
        section.classList.add("section--lone");
      }

      app.appendChild(section);
    });

    // Fill in AREDL placements in the background once the page is up
    loadAredlPlacements();
  }

  fetch("data/levels.json?ts=" + Date.now(), {
    headers: { Accept: "application/json" },
    cache: "no-store" // never reuse a cached JSON — data edits show up on reload
  })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " while loading levels.json");
      return res.json();
    })
    .then(render)
    .catch(renderError);
})();
