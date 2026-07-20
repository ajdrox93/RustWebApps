(() => {
  "use strict";

  const SITE = {
    name: "Rust Web Apps",
    shortName: "Rust Apps",
    creator: "AJ",
    version: "—",
    updated: "—",
    latestRelease: null,
    featuredRelease: null,
    repository: "https://github.com/ajdrox93/RustWebApps",
    issues: "/feedback/",
    copyrightYear: 2026,
    navigation: [
      { id: "home", label: "Home", icon: "🏠", href: "/" },
      { id: "build", label: "Building Planner", icon: "🧱", href: "/build/" },
      { id: "systems", label: "Systems Planner", icon: "⚡", href: "/systems/" },
      { id: "crafting", label: "Crafting Planner", icon: "🛠️", href: "/crafting/" },
      { id: "munitions", label: "Munitions Planner", icon: "💥", href: "/munitions/" },
      { id: "fireworks", label: "Fireworks Planner", icon: "🎆", href: "/fireworks/" },
      { id: "quarry", label: "Quarry Planner", icon: "⛏️", href: "/quarry/" },
      { id: "cooking", label: "Cooking Planner", icon: "🍳", href: "/cooking/" },
      { id: "upkeep", label: "Upkeep Planner", icon: "📦", href: "/upkeep/" },
      { id: "feedback", label: "Feedback", icon: "💬", href: "/feedback/" },
      { id: "changelog", label: "Changelog", icon: "📋", href: "/changelog/" },
      { id: "about", label: "About", icon: "ℹ️", href: "/about/" }
    ]
  };

  window.RUST_WEB_APPS = SITE;

  const text = value => String(value ?? "").trim();
  const published = item => text(item?.status).toLowerCase() === "published";

  function parseVersion(value) {
    const match = text(value).replace(/^v/i, "").match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+](.*))?$/);
    if (!match) return { parts: [0, 0, 0], prerelease: text(value) };
    return {
      parts: [Number(match[1] || 0), Number(match[2] || 0), Number(match[3] || 0)],
      prerelease: match[4] || ""
    };
  }

  function compareVersionsDescending(a, b) {
    const av = parseVersion(a?.version);
    const bv = parseVersion(b?.version);
    for (let index = 0; index < 3; index += 1) {
      if (av.parts[index] !== bv.parts[index]) return bv.parts[index] - av.parts[index];
    }
    if (!av.prerelease && bv.prerelease) return -1;
    if (av.prerelease && !bv.prerelease) return 1;
    return bv.prerelease.localeCompare(av.prerelease, undefined, { numeric: true });
  }

  function sortReleases(releases) {
    return [...releases].sort((a, b) => {
      const versionOrder = compareVersionsDescending(a, b);
      if (versionOrder) return versionOrder;
      return text(b.date).localeCompare(text(a.date));
    });
  }

  function prettyDate(value, includeDay = true) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return text(value) || "—";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return text(value) || "—";
    const options = includeDay
      ? { year: "numeric", month: "long", day: "numeric" }
      : { year: "numeric", month: "long" };
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function activePage() {
    const declared = document.body?.dataset?.page;
    if (declared) return declared;
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return "home";
    return path.split("/").filter(Boolean).pop() || "home";
  }

  function navMarkup(variant) {
    const current = activePage();
    return SITE.navigation.map(item => {
      const active = item.id === current;
      if (variant === "sidebar") {
        return `<a class="nav-link site-link${active ? " active" : ""}" href="${item.href}"${active ? ' aria-current="page"' : ""}><span class="nav-icon">${item.icon}</span><span>${item.label}</span></a>`;
      }
      return `<a class="${active ? "active" : ""}" href="${item.href}"${active ? ' aria-current="page"' : ""}>${item.icon} ${item.label}</a>`;
    }).join("");
  }

  function renderNavigation() {
    document.querySelectorAll("[data-site-nav]").forEach(container => {
      container.innerHTML = navMarkup(container.dataset.siteNav || "top");
    });
  }

  function standardFooterMarkup() {
    return `
      <div class="site-footer-inner">
        <div class="site-footer-brand">
          <strong>${SITE.name}</strong>
          <span>Accurate, community-focused planning tools for Rust players.</span>
        </div>
        <nav class="site-footer-links" aria-label="Footer navigation">
          ${SITE.navigation.map(item => `<a href="${item.href}">${item.label}</a>`).join("")}
          <a href="${SITE.issues}">Send Feedback</a>
          <a href="${SITE.repository}">GitHub</a>
        </nav>
        <div class="site-footer-meta">
          <span>Created by <strong>${SITE.creator}</strong></span>
          <span>v<span data-site-version>${SITE.version}</span> • Updated <span data-site-updated>${SITE.updated}</span></span>
          <span>© ${SITE.copyrightYear} ${SITE.name}</span>
        </div>
      </div>`;
  }

  function richFooterMarkup() {
    return `
      <div class="footer-wrap">
        <div><h3>${SITE.shortName}</h3><p>Community-built planning tools made to remove guesswork from Rust building, upkeep, cooking, electricity, and more.</p></div>
        <div><h3>Quick Links</h3><div class="footer-links">${SITE.navigation.map(item => `<a href="${item.href}">${item.label}</a>`).join("")}</div></div>
        <div><h3>Help Improve ${SITE.shortName}</h3><p>Found a bug, incorrect cost, or feature idea?</p><div class="footer-links"><a href="${SITE.issues}">Send Feedback</a><a href="${SITE.repository}">View Source on GitHub</a></div></div>
      </div>
      <div class="copyright">© ${SITE.copyrightYear} ${SITE.shortName} • Created by ${SITE.creator} • v<span data-site-version>${SITE.version}</span> • Not affiliated with Facepunch Studios</div>`;
  }

  function renderFooters() {
    document.querySelectorAll("[data-site-footer]").forEach(footer => {
      footer.innerHTML = footer.dataset.siteFooter === "rich" ? richFooterMarkup() : standardFooterMarkup();
    });
  }

  function applySharedReleaseText() {
    document.querySelectorAll("[data-site-version]").forEach(el => el.textContent = SITE.version);
    document.querySelectorAll("[data-site-creator]").forEach(el => el.textContent = SITE.creator);
    document.querySelectorAll("[data-site-updated]").forEach(el => el.textContent = SITE.updated);
    document.querySelectorAll("[data-latest-release-title]").forEach(el => el.textContent = text(SITE.latestRelease?.title) || `Version ${SITE.version}`);
    document.querySelectorAll("[data-latest-release-summary]").forEach(el => el.textContent = text(SITE.latestRelease?.summary) || "See the latest improvements and fixes.");
    document.querySelectorAll("[data-latest-release-date]").forEach(el => {
      el.textContent = prettyDate(SITE.latestRelease?.date);
      if (el.tagName === "TIME") el.dateTime = text(SITE.latestRelease?.date);
    });
  }

  function renderLatestReleaseCard() {
    const release = SITE.featuredRelease || SITE.latestRelease;
    document.querySelectorAll("[data-latest-release-card]").forEach(card => {
      if (!release) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      const version = card.querySelector("[data-release-version]");
      const title = card.querySelector("[data-release-title]");
      const summary = card.querySelector("[data-release-summary]");
      const date = card.querySelector("[data-release-date]");
      if (version) version.textContent = `Version ${text(release.version)}`;
      if (title) title.textContent = text(release.title) || `Version ${text(release.version)}`;
      if (summary) summary.textContent = text(release.summary) || "See the latest additions, changes, and fixes.";
      if (date) {
        date.textContent = prettyDate(release.date);
        if (date.tagName === "TIME") date.dateTime = text(release.date);
      }
    });
  }

  async function loadReleaseInfo() {
    try {
      const response = await fetch("/changelog.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.releases)) throw new Error("Unsupported changelog format");
      const releases = sortReleases(data.releases.filter(published));
      SITE.latestRelease = releases[0] || null;
      SITE.featuredRelease = releases.find(release => release.featured === true) || SITE.latestRelease;
      if (SITE.latestRelease) {
        SITE.version = text(SITE.latestRelease.version) || "—";
        SITE.updated = prettyDate(SITE.latestRelease.date, false);
      }
    } catch (error) {
      console.error("Site release information could not be loaded:", error);
    }

    applySharedReleaseText();
    renderLatestReleaseCard();
    window.dispatchEvent(new CustomEvent("rustapps:release-loaded", {
      detail: { latest: SITE.latestRelease, featured: SITE.featuredRelease }
    }));
  }

  function init() {
    renderNavigation();
    renderFooters();
    applySharedReleaseText();
    loadReleaseInfo();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
