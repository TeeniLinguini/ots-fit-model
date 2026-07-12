// Minimal backend for the OTS Fit Model tool.
//
// Why this file exists: the frontend (public/index.html) needs to call
// Anthropic's /v1/messages endpoint with web_search enabled, but that call
// requires an API key. Inside Claude.ai's artifact sandbox, that key is
// injected automatically. Outside of it (e.g. running this on your own
// machine or a server), there is no automatic auth, so the browser cannot
// call api.anthropic.com directly without exposing your key to anyone who
// opens the page's dev tools.
//
// This server sits in between: the browser calls THIS server, THIS server
// attaches your real API key (read from an environment variable, never
// sent to the browser) and forwards the request to Anthropic, then relays
// the response back. Your key never leaves the server process.

// Load variables from a local .env file if present (e.g. ANTHROPIC_API_KEY).
// Requires the `dotenv` package (see package.json).
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_VERSION = '2023-06-01';

if (!ANTHROPIC_API_KEY) {
  console.error(
    '\nMissing ANTHROPIC_API_KEY.\n' +
    'Copy .env.example to .env and add your key, or set it in your shell:\n' +
    '  export ANTHROPIC_API_KEY=sk-ant-...\n'
  );
  process.exit(1);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Very light rate limiting: this endpoint calls a paid API with web search
// enabled, so an unthrottled public deployment could rack up real cost.
// This is a basic in-memory limiter (per-process, resets on restart) —
// fine for personal/local use, not a substitute for a real rate limiter
// (e.g. express-rate-limit + Redis) if you deploy this publicly.
const requestLog = [];
const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited() {
  const now = Date.now();
  while (requestLog.length && now - requestLog[0] > WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= MAX_REQUESTS_PER_WINDOW) return true;
  requestLog.push(now);
  return false;
}

app.post('/api/messages', async (req, res) => {
  if (isRateLimited()) {
    return res.status(429).json({
      error: 'Rate limit reached for this server instance. Try again later.',
    });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      // Forward the request body as-is (model, messages, tools) — the
      // frontend already builds the correct payload, this server just
      // adds authentication.
      body: JSON.stringify(req.body),
    });

    const data = await anthropicRes.json();
    res.status(anthropicRes.status).json(data);
  } catch (err) {
    console.error('Anthropic API request failed:', err);
    res.status(502).json({ error: 'Failed to reach Anthropic API.' });
  }
});

app.listen(PORT, () => {
  console.log(`OTS Fit Model running at http://localhost:${PORT}`);
});
