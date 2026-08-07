---
description: Lock the spec from a problem statement and produce a build plan
argument-hint: <paste the problem statement and your vision>
---

The hackathon brief and my vision:

$ARGUMENTS

You have ~2 hours total and a limited token budget. Optimize for a demo that wins, not for completeness.

## Step 1 — Lock the spec (keep this under 120 words)
Output exactly:
- **Product:** one sentence, the pitch.
- **The one thing judges will remember:** the single feature that makes this memorable. Pick the most visual/surprising one.
- **Demo path:** the literal 4-6 clicks I will perform in front of judges, in order.
- **Cut list:** what I am deliberately NOT building.

## Step 2 — Pick the stack
Pre-built starters exist. Prefer them; they run instantly with no install:
- `C:\Users\Atharva\Documents\promptathon-kit\starters\web` — Vite + React + TS + Tailwind, deps installed
- `C:\Users\Atharva\Documents\promptathon-kit\starters\py` — venv with Streamlit, FastAPI, pandas, plotly

Copy the contents of the right starter into this folder and say which you chose in one line.
Only go off-starter if the brief truly demands it.

## Step 3 — Plan (max 10 bullets)
One bullet per file you will create or edit, with a 6-word purpose. No prose.

## Step 4 — STOP
End with: `Ready. Type /go to build, or tell me what to change.`
Do not write any application code in this turn.

## Standing rules
- Anything needing an API key, account, login, or paid service: mock it with realistic
  data, mark `// MOCK:`, keep moving. Never stop to ask me for a key.
- If the brief is ambiguous, choose the interpretation that demos best and note it in one line.
