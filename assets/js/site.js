(() => {
  "use strict";

  const SITE = Object.freeze({
    name: "Rust Web Apps",
    shortName: "Rust Apps",
    creator: "AJ",
    version: "1.4.0",
    updated: "July 2026",
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
      { id: "feedback", label: "Feedback", icon: "💬", href: "/feedback/" }
    ]
  });

  window.RUST_WEB_APPS = SITE;

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
      const variant = container.dataset.siteNav || "top";
      container.innerHTML = navMarkup(variant);
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
          <span>v${SITE.version} • Updated ${SITE.updated}</span>
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
      <div class="copyright">© ${SITE.copyrightYear} ${SITE.shortName} • Created by ${SITE.creator} • v${SITE.version} • Not affiliated with Facepunch Studios</div>`;
  }

  function renderFooters() {
    document.querySelectorAll("[data-site-footer]").forEach(footer => {
      footer.innerHTML = footer.dataset.siteFooter === "rich" ? richFooterMarkup() : standardFooterMarkup();
    });
  }

  function renderSharedText() {
    document.querySelectorAll("[data-site-version]").forEach(el => el.textContent = SITE.version);
    document.querySelectorAll("[data-site-creator]").forEach(el => el.textContent = SITE.creator);
    document.querySelectorAll("[data-site-updated]").forEach(el => el.textContent = SITE.updated);
  }

  function init() {
    renderNavigation();
    renderFooters();
    renderSharedText();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
