const MAX_BODY_BYTES = 24_000;
const REPORT_TYPES = new Set(["bug", "data", "feedback"]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = allowedOrigins(env);
    const corsOrigin = allowed.has(origin) ? origin : "";

    if (request.method === "OPTIONS") {
      if (!corsOrigin) return json({ error: "Origin not allowed." }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    }

    if (request.method === "GET") return json({ ok: true, service: "Rust Web Apps feedback" }, 200, corsOrigin);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, corsOrigin);
    if (!corsOrigin) return json({ error: "Origin not allowed." }, 403);

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY_BYTES) return json({ error: "Submission is too large." }, 413, corsOrigin);
    if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "JSON is required." }, 415, corsOrigin);

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: "Invalid JSON." }, 400, corsOrigin); }

    if (payload.website) return json({ ok: true }, 200, corsOrigin); // honeypot

    const validation = validatePayload(payload);
    if (validation) return json({ error: validation }, 400, corsOrigin);

    const token = clean(payload["cf-turnstile-response"], 2048);
    if (!token) return json({ error: "Please complete the security check." }, 400, corsOrigin);

    const turnstile = await verifyTurnstile(token, request, env);
    if (!turnstile.success) return json({ error: "The security check could not be verified. Please try again." }, 400, corsOrigin);

    const issue = buildIssue(payload);
    const githubResponse = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "rust-web-apps-feedback-worker"
      },
      body: JSON.stringify(issue)
    });

    const githubData = await githubResponse.json().catch(() => ({}));
    if (!githubResponse.ok) {
      console.error("GitHub issue creation failed", githubResponse.status, githubData);
      return json({ error: "GitHub could not publish the report right now. Please try again later." }, 502, corsOrigin);
    }

    return json({ ok: true, issue_url: githubData.html_url, issue_number: githubData.number }, 201, corsOrigin);
  }
};

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || "https://rust-apps.com").split(",").map(value => value.trim()).filter(Boolean));
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(data, status = 200, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value, max = 5000) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
}

function validatePayload(payload) {
  const type = clean(payload.reportType, 30);
  if (!REPORT_TYPES.has(type)) return "Choose a valid report type.";
  if (!clean(payload.title, 160)) return "A short title is required.";
  if (!clean(payload.planner, 120)) return "Choose the affected planner.";
  if (type === "bug" && (!clean(payload.steps, 4000) || !clean(payload.expected, 2500) || !clean(payload.actual, 2500))) return "Complete the bug reproduction fields.";
  if (type === "data" && (!clean(payload.itemName, 200) || !clean(payload.currentValue, 300) || !clean(payload.correctValue, 300) || !clean(payload.source, 3000))) return "Complete the data correction fields.";
  if (type === "feedback" && (!clean(payload.problem, 3000) || !clean(payload.suggestion, 4000))) return "Complete the feedback fields.";
  return "";
}

async function verifyTurnstile(token, request, env) {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return response.json();
}

function buildIssue(payload) {
  const type = clean(payload.reportType, 30);
  const prefix = type === "bug" ? "Bug" : type === "data" ? "Data Correction" : "Feedback";
  const labels = type === "bug" ? ["bug", "submitted-from-site"] : type === "data" ? ["data-correction", "submitted-from-site"] : ["enhancement", "submitted-from-site"];
  const lines = [
    `## ${prefix}`,
    "",
    `**Planner:** ${clean(payload.planner, 120)}`,
    `**Submitted from:** ${clean(payload.pageUrl, 500) || "Rust Web Apps"}`,
    ""
  ];

  if (clean(payload.details)) lines.push("### Additional details", clean(payload.details), "");
  if (type === "bug") lines.push("### Steps to reproduce", clean(payload.steps, 4000), "", "### Expected behavior", clean(payload.expected, 2500), "", "### Actual behavior", clean(payload.actual, 2500), "", `**Browser / device:** ${clean(payload.browser, 200) || "Not provided"}`, "");
  if (type === "data") lines.push(`**Item / value:** ${clean(payload.itemName, 200)}`, `**Current value:** ${clean(payload.currentValue, 300)}`, `**Correct value:** ${clean(payload.correctValue, 300)}`, "", "### Verification source", clean(payload.source, 3000), "");
  if (type === "feedback") lines.push("### Problem or opportunity", clean(payload.problem, 3000), "", "### Suggested improvement", clean(payload.suggestion, 4000), "", `**Who would benefit:** ${clean(payload.audience, 250) || "Not specified"}`, "");

  if (clean(payload.attachmentLink, 500)) lines.push(`**Screenshot / file link:** ${clean(payload.attachmentLink, 500)}`);
  if (clean(payload.contact, 200)) lines.push(`**Optional contact:** ${clean(payload.contact, 200)}`);
  lines.push("", "---", "Submitted through the Rust Web Apps feedback form.");

  return { title: `[${prefix}] ${clean(payload.title, 160)}`, body: lines.join("\n"), labels };
}
