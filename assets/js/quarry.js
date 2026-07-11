(() => {
  "use strict";
  const DATA_URL = "/assets/data/quarry.json";
  const SAVE_KEY = "rustAppsQuarryPlanV1";
  let data = null;

  const fmt = n => Math.round(Number(n) || 0).toLocaleString();
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function inputValue(id) {
    return Math.max(0, Math.floor(Number(document.getElementById(`qty-${id}`)?.value) || 0));
  }

  function durationText(seconds) {
    if (!seconds) return "0 min";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs ? `${mins} min ${secs} sec` : `${mins} min`;
  }

  function renderMachines() {
    const groups = [...new Set(data.machines.map(machine => machine.group))];
    const host = document.getElementById("quarryGroups");
    host.innerHTML = groups.map(group => {
      const machines = data.machines.filter(machine => machine.group === group);
      return `<section class="quarry-group planner-panel">
        <div class="quarry-group-heading"><div><h2>${esc(group)}</h2><p>${group === "Giant Excavator" ? "Enter diesel separately for each resource mode you plan to run." : "Enter the number of diesel barrels for each machine."}</p></div></div>
        <div class="quarry-card-grid">${machines.map(machine => {
          const outputs = Object.entries(machine.outputs).map(([resource, amount]) => `<li><span>${esc(resource)}</span><strong>${fmt(amount)}</strong></li>`).join("");
          return `<article class="quarry-card">
            <div class="quarry-card-head"><span class="quarry-icon">${machine.icon}</span><div><h3>${esc(machine.name)}</h3><span>${durationText(machine.timePerBarrelSeconds)} per diesel</span></div></div>
            <div class="yield-label">Yield per diesel barrel</div>
            <ul class="yield-list">${outputs}</ul>
            ${machine.note ? `<p class="machine-note">${esc(machine.note)}</p>` : ""}
            <label class="diesel-input"><span>Diesel barrels</span><input id="qty-${machine.id}" data-machine="${machine.id}" type="number" min="0" step="1" value="0" inputmode="numeric"></label>
            <div class="machine-total" id="total-${machine.id}"></div>
          </article>`;
        }).join("")}</div>
      </section>`;
    }).join("");
    host.querySelectorAll("[data-machine]").forEach(input => {
      input.addEventListener("input", calculate);
      input.addEventListener("focus", () => {
        if (input.value === "0") input.select();
      });
      input.addEventListener("click", () => {
        if (input.value === "0") input.select();
      });
      input.addEventListener("blur", () => {
        if (input.value.trim() === "") input.value = "0";
        calculate();
      });
    });
  }

  function calculate() {
    const totals = {};
    let totalDiesel = 0;
    let totalSeconds = 0;
    let activeMachines = 0;
    data.machines.forEach(machine => {
      const barrels = inputValue(machine.id);
      totalDiesel += barrels;
      totalSeconds += barrels * machine.timePerBarrelSeconds;
      if (barrels > 0) activeMachines++;
      const lines = [];
      Object.entries(machine.outputs).forEach(([resource, perBarrel]) => {
        const amount = barrels * perBarrel;
        totals[resource] = (totals[resource] || 0) + amount;
        if (barrels > 0) lines.push(`<div><span>${esc(resource)}</span><strong>${fmt(amount)}</strong></div>`);
      });
      const runtime = barrels * machine.timePerBarrelSeconds;
      document.getElementById(`total-${machine.id}`).innerHTML = barrels > 0
        ? `<span class="machine-total-title">Run total</span>${lines.join("")}<div class="machine-runtime"><span>Estimated runtime</span><strong>${durationText(runtime)}</strong></div>`
        : `<span class="empty-run">Enter diesel to calculate.</span>`;
    });

    document.getElementById("totalDiesel").textContent = fmt(totalDiesel);
    document.getElementById("activeRuns").textContent = fmt(activeMachines);
    document.getElementById("totalRuntime").textContent = durationText(totalSeconds);
    const list = document.getElementById("resourceTotals");
    const entries = Object.entries(totals).filter(([,amount]) => amount > 0).sort((a,b) => b[1]-a[1]);
    list.innerHTML = entries.length ? entries.map(([resource, amount]) => `<div class="requirement-row"><span>${esc(resource)}</span><strong>${fmt(amount)}</strong></div>`).join("") : `<p class="empty-state">Enter diesel barrels to see combined resource totals.</p>`;
    document.getElementById("planText").value = buildExport(entries, totalDiesel, totalSeconds);
  }

  function buildExport(entries, totalDiesel, totalSeconds) {
    const selected = data.machines.filter(machine => inputValue(machine.id) > 0);
    const lines = ["RUST QUARRY PLAN", "", `Total diesel: ${fmt(totalDiesel)}`, `Estimated machine runtime: ${durationText(totalSeconds)}`, "", "RUNS"];
    if (!selected.length) lines.push("No quarry runs selected.");
    selected.forEach(machine => lines.push(`- ${machine.name}: ${fmt(inputValue(machine.id))} diesel`));
    lines.push("", "TOTAL RESOURCES");
    if (!entries.length) lines.push("No resources calculated.");
    entries.forEach(([resource, amount]) => lines.push(`- ${resource}: ${fmt(amount)}`));
    return lines.join("\n");
  }

  function clearAll() {
    document.querySelectorAll("[data-machine]").forEach(input => input.value = 0);
    localStorage.removeItem(SAVE_KEY);
    calculate();
  }

  function savePlan() {
    const quantities = Object.fromEntries(data.machines.map(machine => [machine.id, inputValue(machine.id)]));
    localStorage.setItem(SAVE_KEY, JSON.stringify(quantities));
    showStatus("Quarry plan saved in this browser.");
  }

  function loadPlan() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      data.machines.forEach(machine => {
        const input = document.getElementById(`qty-${machine.id}`);
        if (input) input.value = Math.max(0, Math.floor(Number(saved[machine.id]) || 0));
      });
      calculate();
      showStatus(Object.keys(saved).length ? "Saved quarry plan loaded." : "No saved quarry plan was found.");
    } catch {
      showStatus("The saved quarry plan could not be read.", true);
    }
  }

  async function copyPlan() {
    const text = document.getElementById("planText").value;
    try { await navigator.clipboard.writeText(text); showStatus("Quarry plan copied."); }
    catch { document.getElementById("planText").select(); document.execCommand("copy"); showStatus("Quarry plan copied."); }
  }

  function showStatus(message, error=false) {
    const status = document.getElementById("statusMessage");
    status.textContent = message;
    status.classList.toggle("error", error);
    status.hidden = false;
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(() => status.hidden = true, 3500);
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, {cache:"no-store"});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      renderMachines();
      calculate();
      document.getElementById("savePlan").addEventListener("click", savePlan);
      document.getElementById("loadPlan").addEventListener("click", loadPlan);
      document.getElementById("copyPlan").addEventListener("click", copyPlan);
      document.getElementById("clearPlan").addEventListener("click", clearAll);
    } catch (error) {
      document.getElementById("loadError").hidden = false;
      console.error("Quarry data load failed", error);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
