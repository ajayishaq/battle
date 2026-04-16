# Bayy.com — Competitor Analysis Tool

A clean, AI-powered competitor analysis dashboard for property listing platforms. Built with vanilla HTML/CSS/JS — no build tools, no dependencies, deploys in under 2 minutes.

## Files

```
bayy-analyzer/
├── index.html   ← App shell & layout
├── style.css    ← Dark theme styles
├── app.js       ← All logic + Claude API calls
└── README.md    ← This file
```

---

## Deploy to GitHub Pages (2 minutes)

### Step 1 — Add your API key

Open `app.js` and replace line 5:

```js
const API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";
```

With your actual key from https://console.anthropic.com:

```js
const API_KEY = "sk-ant-api03-xxxxxxxx...";
```

> ⚠️ **Security note:** This puts your API key in the browser. Fine for internal/private use. For a public site, build a small backend proxy (see below).

---

### Step 2 — Push to GitHub

```bash
# Create a new repo on github.com first, then:
git init
git add .
git commit -m "init: bayy competitor analyzer"
git remote add origin https://github.com/YOUR_USERNAME/bayy-analyzer.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under "Source" select **Deploy from a branch**
4. Choose `main` branch, `/ (root)` folder
5. Click **Save**

Your site will be live at:
`https://YOUR_USERNAME.github.io/bayy-analyzer/`

(Takes ~60 seconds to go live.)

---

## Usage

1. Your site (bayy.com) is pre-filled
2. Add competitor URLs — one per line (e.g. bayut.com, propertyfinder.ae, dubizzle.com)
3. Toggle the focus areas you care about
4. Click **Run Analysis** — takes 15–30 seconds
5. View scores, gaps, recommendations, and quick wins
6. Click **Generate roadmap** for a 6-month action plan

---

## Keep Your API Key Private (Production)

For a public-facing tool, create a simple proxy so the key never leaves your server:

**Netlify Function example** (`netlify/functions/analyze.js`):
```js
const fetch = require("node-fetch");
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { statusCode: 200, body: JSON.stringify(data) };
};
```

Then in `app.js` change the fetch URL to `/.netlify/functions/analyze`.

---

## Customization

| What | Where |
|------|-------|
| Change default competitor URLs | `index.html` — textarea placeholder |
| Add/remove focus area tags | `index.html` — `.tag-grid` section |
| Tweak colors/fonts | `style.css` — `:root` variables |
| Change AI model | `app.js` — `MODEL` constant |
| Adjust analysis depth | `app.js` — `buildPrompt()` function |

---

## Requirements

- A modern browser (Chrome, Firefox, Safari, Edge)
- An Anthropic API key with access to Claude Sonnet

---

Built for bayy.com · Powered by Claude AI
