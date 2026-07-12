# OTS Fit Model

A single-URL research tool that scores a performing arts venue against a
two-axis **Fit** (structural) and **Propensity** (timing) model, built for
sales prioritization at On The Stage (OTS).

Paste a venue's website, and it researches the org via public web search,
scores it on 10 weighted categories (5 per axis, 0–20 each), plots it on a
Fit-vs-Propensity quadrant chart, and surfaces firmographics, history/POV,
contact info, key people, and a switch rationale, each with a source link
back to where the claim was found.

## How it works

The frontend (`public/index.html`) is a single static page. It builds a
research prompt and calls Anthropic's Claude API with the `web_search` tool
enabled, asking for a structured JSON response, then renders that response
into the dashboard.

The backend (`server.js`) is a thin proxy. Its only job is to attach your
Anthropic API key to outgoing requests server-side, so the key never reaches
the browser. See "Why the backend exists" below for why this is necessary.

## Setup

Requires Node 18 or later.

```bash
npm install
cp .env.example .env
```

Open `.env` and add your Anthropic API key (get one at
[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)):

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then run:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Why the backend exists

This project started as a Claude.ai artifact, where the frontend called
`api.anthropic.com` directly with no visible API key. That works *only*
inside Claude.ai's artifact sandbox, which injects authentication
automatically. Outside that sandbox, calling Anthropic's API directly from
browser JavaScript would mean shipping your API key in client-side code,
visible to anyone who opens dev tools. `server.js` exists to hold the key
server-side instead.

## Known limitations

- **Not a site crawl.** Research is done via web search, not by fetching and
  parsing a venue's actual HTML. Tech stack detection, capacity figures, and
  contact details reflect what's publicly indexed, not what's necessarily on
  the page. Well-covered venues return richer detail; small venues with a
  thin web presence return more "Not found" fields.
- **Source links are best-effort.** Some facts are inferred by the model
  across several search results rather than pulled from one page, so they
  correctly show no source link rather than a shaky one.
- **Scores are computed, not vibes.** Each Fit and Propensity total is the
  sum of 5 category scores (0–20 each) that the model returns with
  reasoning, not a single holistic number, so every point on the quadrant
  traces back to a specific, visible reason. See the in-app "Fit and
  Propensity Details" panel for the full rubric and the roadmap items not
  yet scored.
- **Rate limiting is minimal.** `server.js` includes a simple in-memory
  limiter (20 requests/hour by default) to guard against runaway API cost
  during local use. It resets on server restart and is not sufficient for a
  public-facing deployment; use a real rate limiter (e.g.
  `express-rate-limit` with persistent storage) if you deploy this beyond
  your own machine.
- **Cost.** Every assessment triggers a Claude API call with web search
  enabled, which costs money on your Anthropic account. There's no caching,
  so re-assessing the same venue re-runs the full research.

## Project structure

```
.
├── server.js          # Express server + Anthropic API proxy
├── public/
│   └── index.html      # Frontend (single-page app, no build step)
├── package.json
├── .env.example
└── .gitignore
```

## License

MIT, see [LICENSE](LICENSE).
