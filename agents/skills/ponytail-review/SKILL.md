---
name: "ponytail-review"
description: "Guidelines and checklists for conducting rigorous code and architecture reviews."
---

# Ponytail Code Review

## Review Criteria
1. **Correctness & Robustness**: Edge cases handled, zero unhandled rejections, strict type safety.
2. **Readability & Modularity**: Functions under 50 lines where practical, meaningful naming, clear component boundaries.
3. **Security Invariants**: No secret leaks, sanitized user inputs, secure authorization boundaries.
4. **Performance**: No redundant renders, memoized selectors, optimized network requests.
