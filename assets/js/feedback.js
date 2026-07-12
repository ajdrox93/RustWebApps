(() => {
  "use strict";

  const config = window.RUST_FEEDBACK_CONFIG || {};
  const typeButtons = [...document.querySelectorAll("[data-feedback-type]")];
  const form = document.getElementById("feedbackForm");
  const typeInput = document.getElementById("reportType");
  const typeSpecific = document.getElementById("typeSpecificFields");
  const status = document.getElementById("feedbackStatus");
  const submit = document.getElementById("submitFeedback");
  const configWarning = document.getElementById("configWarning");
  let widgetId = null;

  const fields = {
    bug: `
      <div class="feedback-field full"><label for="steps">Steps to reproduce</label><span class="hint">Tell us exactly what you clicked or entered.</span><textarea id="steps" name="steps" maxlength="4000" required></textarea></div>
      <div class="feedback-field full"><label for="expected">What did you expect to happen?</label><textarea id="expected" name="expected" maxlength="2500" required></textarea></div>
      <div class="feedback-field full"><label for="actual">What happened instead?</label><textarea id="actual" name="actual" maxlength="2500" required></textarea></div>
      <div class="feedback-field"><label for="browser">Browser / device</label><input id="browser" name="browser" maxlength="200" placeholder="Example: Edge on Windows 11"></div>`,
    data: `
      <div class="feedback-field"><label for="itemName">Item or value name</label><input id="itemName" name="itemName" maxlength="200" required></div>
      <div class="feedback-field"><label for="currentValue">Current value shown</label><input id="currentValue" name="currentValue" maxlength="300" required></div>
      <div class="feedback-field"><label for="correctValue">Correct value</label><input id="correctValue" name="correctValue" maxlength="300" required></div>
      <div class="feedback-field full"><label for="source">Verification source</label><span class="hint">A Rust screenshot, official source, or clear explanation is helpful.</span><textarea id="source" name="source" maxlength="3000" required></textarea></div>`,
    feedback: `
      <div class="feedback-field full"><label for="problem">What problem would this solve?</label><textarea id="problem" name="problem" maxlength="3000" required></textarea></div>
      <div class="feedback-field full"><label for="suggestion">Suggested feature or improvement</label><textarea id="suggestion" name="suggestion" maxlength="4000" required></textarea></div>
      <div class="feedback-field"><label for="audience">Who would benefit?</label><input id="audience" name="audience" maxlength="250" placeholder="New players, PvE groups, builders..."></div>`
  };

  function setType(type) {
    if (!fields[type]) type = "bug";
    typeInput.value = type;
    typeSpecific.innerHTML = fields[type];
    typeButtons.forEach(button => {
      const active = button.dataset.feedbackType === type;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const url = new URL(window.location.href);
    url.searchParams.set("type", type);
    history.replaceState(null, "", url);
  }

  function showStatus(message, isError = false) {
    status.hidden = false;
    status.classList.toggle("error", isError);
    status.innerHTML = message;
  }

  function renderTurnstile() {
    const key = config.turnstileSiteKey;
    if (!key || key.includes("REPLACE_WITH")) {
      configWarning.hidden = false;
      submit.disabled = true;
      return;
    }
    const attempt = () => {
      if (!window.turnstile) return setTimeout(attempt, 100);
      widgetId = window.turnstile.render("#turnstileWidget", {
        sitekey: key,
        theme: "dark"
      });
    };
    attempt();
  }

  typeButtons.forEach(button => button.addEventListener("click", () => setType(button.dataset.feedbackType)));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.hidden = true;
    if (!config.endpoint || config.endpoint.includes("REPLACE_WITH")) return showStatus("The feedback endpoint has not been configured yet.", true);
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    data.pageUrl = window.location.href;
    data.userAgent = navigator.userAgent;
    submit.disabled = true;
    submit.textContent = "Sending…";

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The report could not be submitted.");
      showStatus(`Thank you — your report was published successfully.${result.issue_url ? ` <a href="${result.issue_url}" target="_blank" rel="noopener">View the public issue</a>` : ""}`);
      const selectedType = typeInput.value;
      form.reset();
      setType(selectedType);
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    } catch (error) {
      showStatus(error.message || "Something went wrong while submitting the report.", true);
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit Feedback";
    }
  });

  setType(new URLSearchParams(location.search).get("type") || "bug");
  renderTurnstile();
})();
