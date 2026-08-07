# Hackathon build — 2 hour limit

## Output discipline
- No preamble, no summaries, no "Here's what I did". Make the edit, say one line, stop.
- Never explain code unless I ask "why".
- Never re-read a file you just wrote.
- Never restate my requirements back to me.

## Build discipline
- Fewest files that work. One file if viable. New file only if it prevents a rewrite.
- Working over correct. Demoable over complete.
- If a feature can't be SEEN in a 60-second demo, don't build it.
- Anything needing an API key, account, or paid service: mock it with realistic fake data
  and put one `// MOCK:` comment on it. Do not stop to ask.
- Blocked? Take the workaround with the best demo and keep going. Report it at the end, not mid-build.

## Verification
- After a build step, run it. If there's a UI, screenshot it with Playwright.
- Fix what the screenshot/error shows. Don't ask me to test it for you.

## Design
- Judges see the UI before they see the code. Use the frontend-design skill for anything visual.
- Dark mode, one accent color, real spacing, no default browser styles, no Bootstrap look.
- Empty states and loading states must look intentional — that's what reads as "finished".
