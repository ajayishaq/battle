/* ── Config ── */
// IMPORTANT: Replace this with your actual Anthropic API key
// Get one at: https://console.anthropic.com
// WARNING: For production, proxy requests through your own backend to keep the key secret
const API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";
const MODEL   = "claude-sonnet-4-20250514";

/* ── State ── */
let lastInputs = {};

/* ── Tag toggles ── */
document.querySelectorAll("#focus-tags .tag").forEach(tag => {
  tag.addEventListener("click", () => tag.classList.toggle("active"));
});

/* ── Loader messages ── */
const LOADER_MSGS = [
  "Scanning your website features…",
  "Analyzing competitor listings…",
  "Comparing search & filter capabilities…",
  "Identifying feature gaps…",
  "Generating recommendations…",
  "Scoring each dimension…",
];
let loaderTimer;

function cycleLoaderMsg() {
  let i = 0;
  loaderTimer = setInterval(() => {
    i = (i + 1) % LOADER_MSGS.length;
    document.getElementById("loader-msg").textContent = LOADER_MSGS[i];
  }, 2500);
}

/* ── Get inputs ── */
function getInputs() {
  const myUrl   = document.getElementById("my-url").value.trim();
  const rawUrls = document.getElementById("comp-urls").value.trim();
  const compUrls = rawUrls.split("\n").map(u => u.trim()).filter(Boolean);
  const focus   = [...document.querySelectorAll("#focus-tags .tag.active")].map(t => t.dataset.v);
  return { myUrl, compUrls, focus };
}

/* ── UI helpers ── */
function showSection(id) { document.getElementById(id).style.display = ""; }
function hideSection(id) { document.getElementById(id).style.display = "none"; }

function resetUI() {
  hideSection("loader");
  hideSection("results");
  hideSection("error-wrap");
  showSection("config-panel");
  document.getElementById("analyze-btn").disabled = false;
  document.getElementById("btn-label").textContent = "Run Analysis";
  clearInterval(loaderTimer);
}

/* ── Main analysis ── */
document.getElementById("analyze-btn").addEventListener("click", runAnalysis);

async function runAnalysis() {
  const { myUrl, compUrls, focus } = getInputs();

  if (!myUrl)              return alert("Please enter your website URL.");
  if (!compUrls.length)    return alert("Please add at least one competitor URL.");
  if (!focus.length)       return alert("Please select at least one focus area.");
  if (API_KEY === "YOUR_ANTHROPIC_API_KEY_HERE")
    return alert("Please open app.js and replace YOUR_ANTHROPIC_API_KEY_HERE with your Anthropic API key.");

  lastInputs = { myUrl, compUrls, focus };

  hideSection("config-panel");
  hideSection("error-wrap");
  hideSection("results");
  showSection("loader");
  document.getElementById("loader-msg").textContent = LOADER_MSGS[0];
  cycleLoaderMsg();

  const prompt = buildPrompt(myUrl, compUrls, focus);

  try {
    const data = await callClaude(prompt);
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const result = JSON.parse(match[0]);
    clearInterval(loaderTimer);
    hideSection("loader");
    renderResults(result, myUrl, compUrls);
  } catch (err) {
    clearInterval(loaderTimer);
    hideSection("loader");
    document.getElementById("error-msg").textContent = "Analysis failed: " + err.message + ". Check your API key and try again.";
    showSection("error-wrap");
  }
}

/* ── Roadmap ── */
document.getElementById("roadmap-btn").addEventListener("click", runRoadmap);

async function runRoadmap() {
  const btn = document.getElementById("roadmap-btn");
  btn.disabled = true;
  btn.textContent = "Generating…";

  const { myUrl, compUrls, focus } = lastInputs;
  const roadmapPrompt = `You are a senior product manager for a property listing platform.

Create a practical 6-month product roadmap for ${myUrl} to close feature gaps against ${compUrls.join(", ")}.
Focus areas: ${focus.join(", ")}.

Structure the roadmap as:

Month 1–2 (Quick Wins):
- List 3–4 fast, high-impact improvements

Month 3–4 (Core Features):
- List 3–4 medium-effort features that close major gaps

Month 5–6 (Differentiation):
- List 2–3 features that would make ${myUrl} stand out from competitors

For each item include: what to build, why it matters, and a rough effort estimate (S/M/L).

Be specific to the MENA property market and platforms like Bayut, PropertyFinder, and Dubizzle.
Write in plain text, no JSON, no markdown headers — just clear prose organized by month.`;

  try {
    const data = await callClaude(roadmapPrompt);
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    document.getElementById("card-roadmap").innerHTML = `
      <p class="card-title">6-month product roadmap</p>
      <div class="roadmap-content">${escHtml(text)}</div>`;
    showSection("card-roadmap");
    document.getElementById("card-roadmap").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    alert("Roadmap generation failed: " + err.message);
  }

  btn.disabled = false;
  btn.textContent = "Generate roadmap →";
}

/* ── API call ── */
async function callClaude(userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/* ── Prompt builder ── */
function buildPrompt(myUrl, compUrls, focus) {
  return `You are a senior product analyst specializing in property listing platforms and real estate tech in MENA.

Analyze: MY WEBSITE: ${myUrl}
COMPETITORS: ${compUrls.join(", ")}
FOCUS AREAS: ${focus.join(", ")}

Respond ONLY with valid JSON — no markdown fences, no preamble:

{
  "overall_score": <integer 1-100 for my site>,
  "competitor_scores": [
    { "name": "<short name>", "score": <integer 1-100> }
  ],
  "dimension_scores": {
    "ux": <1-10>,
    "search": <1-10>,
    "listings": <1-10>,
    "mobile": <1-10>
  },
  "top_gaps": [
    {
      "feature": "<feature name>",
      "priority": "high|medium|low",
      "description": "<what competitors do that you don't, 1-2 sentences>",
      "recommendation": "<specific actionable fix, 1-2 sentences>"
    }
  ],
  "quick_wins": ["<short actionable improvement>"],
  "competitor_strengths": {
    "<competitor short name>": "<1-2 sentence strength summary>"
  },
  "summary": "<2-3 sentence executive summary>"
}

Provide 6-8 top_gaps and 4-5 quick_wins. Base scores on known real-estate portal best practices in MENA.`;
}

/* ── Render ── */
function renderResults(r, myUrl, compUrls) {
  document.getElementById("results-title").textContent = "Analysis — " + hostname(myUrl);

  // Summary
  if (r.summary) {
    document.getElementById("card-summary").innerHTML = `
      <p class="card-title">Executive summary</p>
      <p class="summary-text">${escHtml(r.summary)}</p>`;
  }

  // Score bars
  const allScores = [
    { name: hostname(myUrl) + " ★", score: r.overall_score, isMe: true },
    ...(r.competitor_scores || []).map(c => ({ name: c.name, score: c.score, isMe: false }))
  ].sort((a, b) => b.score - a.score);

  const barsHtml = allScores.map(s => `
    <div class="score-row">
      <span class="score-name ${s.isMe ? "is-me" : ""}">${escHtml(s.name)}</span>
      <div class="score-bar-bg">
        <div class="score-bar" data-width="${s.score}" style="width:0%;background:${barColor(s.score)}"></div>
      </div>
      <span class="score-num">${s.score}</span>
    </div>`).join("");

  document.getElementById("card-scores").innerHTML = `
    <p class="card-title">Overall scores</p>
    <div class="score-list">${barsHtml}</div>`;

  // Animate bars after DOM paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll(".score-bar[data-width]").forEach(el => {
        el.style.width = el.dataset.width + "%";
      });
    });
  });

  // Dimensions
  const ds = r.dimension_scores || {};
  const dimMap = [
    { key: "ux",       label: "UX & Design" },
    { key: "search",   label: "Search" },
    { key: "listings", label: "Listings" },
    { key: "mobile",   label: "Mobile" },
  ];
  const dimsHtml = dimMap.filter(d => ds[d.key] != null).map(d => `
    <div class="dim-card">
      <p class="dim-label">${d.label}</p>
      <p class="dim-val ${dimColor(ds[d.key])}">${ds[d.key]}<span style="font-size:0.75rem;color:var(--text-3)">/10</span></p>
    </div>`).join("");

  if (dimsHtml) {
    document.getElementById("card-dims").innerHTML = `
      <p class="card-title">bayy.com — dimension scores</p>
      <div class="dim-grid">${dimsHtml}</div>`;
  } else {
    hideSection("card-dims");
  }

  // Gaps
  const gapsHtml = (r.top_gaps || []).map(g => `
    <div class="gap-item">
      <span class="priority p-${escHtml(g.priority)}">${escHtml(g.priority)}</span>
      <div class="gap-content">
        <p class="gap-feature">${escHtml(g.feature)}</p>
        <p class="gap-desc">${escHtml(g.description)}</p>
        <p class="gap-rec">${escHtml(g.recommendation)}</p>
      </div>
    </div>`).join("");

  document.getElementById("card-gaps").innerHTML = `
    <p class="card-title">Feature gaps & recommendations</p>
    <div class="gap-list">${gapsHtml}</div>`;

  // Quick wins
  const winsHtml = (r.quick_wins || []).map((w, i) => `
    <div class="win-item">
      <span class="win-num">${i + 1}</span>
      <span>${escHtml(w)}</span>
    </div>`).join("");

  document.getElementById("card-wins").innerHTML = `
    <p class="card-title">Quick wins</p>
    <div class="win-list">${winsHtml}</div>`;

  // Strengths
  const strHtml = Object.entries(r.competitor_strengths || {}).map(([name, s]) => `
    <div class="strength-item">
      <p class="strength-name">${escHtml(name)}</p>
      <p class="strength-text">${escHtml(s)}</p>
    </div>`).join("");

  if (strHtml) {
    document.getElementById("card-strengths").innerHTML = `
      <p class="card-title">What competitors do best</p>
      <div class="strength-list">${strHtml}</div>`;
  } else {
    hideSection("card-strengths");
  }

  hideSection("card-roadmap");
  showSection("results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── Helpers ── */
function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function barColor(score) {
  if (score >= 70) return "#34c77b";
  if (score >= 50) return "#f5a623";
  return "#f05252";
}

function dimColor(val) {
  if (val >= 7) return "green";
  if (val >= 5) return "amber";
  return "red";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
