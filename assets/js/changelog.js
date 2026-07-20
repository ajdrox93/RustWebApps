(() => {
  "use strict";
  const list = document.getElementById("releaseList");
  const status = document.getElementById("changelogStatus");
  const filter = document.getElementById("changelogFilter");
  let releases = [];

  const text = value => String(value ?? "");
  const prettyDate = value => {
    const match = /^\d{4}-\d{2}-\d{2}$/.test(text(value));
    if (!match) return text(value);
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? text(value) : new Intl.DateTimeFormat(undefined,{year:"numeric",month:"long",day:"numeric"}).format(date);
  };
  const byNewest = (a,b) => text(b.date).localeCompare(text(a.date)) || text(b.version).localeCompare(text(a.version),undefined,{numeric:true});
  const published = item => text(item.status).toLowerCase() === "published";

  function groupedChanges(release, selected) {
    const groups = new Map();
    (Array.isArray(release.changes) ? release.changes : []).forEach(change => {
      const category = text(change.category).trim() || "Changed";
      const detail = text(change.text).trim();
      if (!detail || (selected !== "all" && category !== selected)) return;
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(detail);
    });
    return groups;
  }

  function releaseCard(release, selected) {
    const groups = groupedChanges(release, selected);
    if (!groups.size) return null;
    const article = document.createElement("article");
    article.className = "release-card";

    const head = document.createElement("div"); head.className = "release-head";
    const main = document.createElement("div");
    const version = document.createElement("span"); version.className = "release-version"; version.textContent = `Version ${text(release.version)}`;
    const title = document.createElement("h2"); title.textContent = text(release.title) || `Version ${text(release.version)}`;
    main.append(version,title);
    if (text(release.summary).trim()) { const summary = document.createElement("p"); summary.className="release-summary"; summary.textContent=text(release.summary); main.append(summary); }
    const date = document.createElement("time"); date.className="release-date"; date.dateTime=text(release.date); date.textContent=prettyDate(release.date);
    head.append(main,date);

    const body = document.createElement("div"); body.className="release-body";
    groups.forEach((items,category) => {
      const group=document.createElement("section"); group.className="change-group";
      const heading=document.createElement("h3"); heading.textContent=category;
      const ul=document.createElement("ul");
      items.forEach(item => { const li=document.createElement("li"); li.textContent=item; ul.append(li); });
      group.append(heading,ul); body.append(group);
    });
    article.append(head,body); return article;
  }

  function render() {
    const selected=filter.value;
    list.replaceChildren();
    const cards=releases.map(r=>releaseCard(r,selected)).filter(Boolean);
    if (!cards.length) {
      const empty=document.createElement("div"); empty.className="empty-state";
      empty.textContent=releases.length ? "No published changes match this category." : "No published changelog entries are available yet.";
      list.append(empty);
    } else list.append(...cards);
    status.textContent=`${cards.length} published release${cards.length===1?"":"s"}${selected==="all"?"":` with ${selected} changes`}`;
  }

  async function load() {
    try {
      const response=await fetch("/changelog.json",{cache:"no-store"});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if (Number(data.schema_version)!==1 || !Array.isArray(data.releases)) throw new Error("Unsupported changelog format");
      releases=data.releases.filter(published).sort(byNewest);
      const categories=[...new Set(releases.flatMap(r=>(Array.isArray(r.changes)?r.changes:[]).map(c=>text(c.category).trim()).filter(Boolean)))].sort();
      categories.forEach(category=>{const option=document.createElement("option");option.value=category;option.textContent=category;filter.append(option);});
      filter.addEventListener("change",render); render();
    } catch (error) {
      status.textContent="Unable to load updates";
      const box=document.createElement("div"); box.className="error-state";
      box.textContent="The changelog could not be loaded. Please try again later.";
      list.replaceChildren(box);
      console.error("Changelog load failed:",error);
    }
  }
  load();
})();
