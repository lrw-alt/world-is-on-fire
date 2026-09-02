---
name: "no-mistakes"
description: "Guidelines and mental models to prevent common software engineering mistakes, regressions, and security anti-patterns."
---

# No-Mistakes Engineering

## Invariants
- Read files completely before editing.
- Never write broken imports or assume unverified APIs.
- Guard against null/undefined runtime errors with defensive type narrowing.
- Verify production build before declaring tasks complete.
