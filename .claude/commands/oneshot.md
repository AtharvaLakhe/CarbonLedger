---
description: No gates - spec, build, polish, and ship in a single run
argument-hint: <paste the problem statement and your vision>
---

The hackathon brief and my vision:

$ARGUMENTS

Do the ENTIRE build in one run. Do not stop to ask me anything. ~2 hours, limited tokens.

Sequence, without pausing between phases:
1. **Spec** (under 120 words): product sentence, the one memorable feature, the 4-6 click demo path, the cut list.
2. **Stack**: copy in a pre-built starter — `C:\Users\Atharva\Documents\promptathon-kit\starters\web`
   (Vite+React+TS+Tailwind) or `...\starters\py` (Streamlit/FastAPI). Deps are already installed.
3. **Build** it all. No commentary between files.
4. **Run** it, open with Playwright, screenshot, fix your own errors.
5. **Polish** with the frontend-design skill. Dark, one accent, real empty states. No new features.
6. **Ship**: README.md, DEMO.md with a 60-second spoken script, screenshots/, and a final commit.

Rules: mock anything needing a key or account (`// MOCK:`), never ask me for credentials,
take the best-demoing workaround when blocked, commit whenever something works.

Report at the end only: what works, what's mocked, and the demo script.
