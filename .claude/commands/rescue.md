---
description: Behind schedule - cut scope to whatever can demo
---

I am behind schedule. Freeze scope now.

1. Tell me in 3 bullets what currently WORKS, verified by actually running it.
2. Find the shortest path to something demoable in 10 minutes. Cut features, hardcode
   data, fake anything that isn't the one memorable feature.
3. Tell me exactly what you are cutting, in one line. Then do it. Don't wait for approval.
4. If something is badly broken, revert it rather than debug it — `git log --oneline` and
   go back to the last commit that ran. A smaller thing that works beats a bigger thing that crashes.
5. Run it, screenshot it, confirm the demo path works.
