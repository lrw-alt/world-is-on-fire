---
name: "refactor"
description: "Guidelines and techniques for clean code refactoring, reducing complexity, improving readability, and modularizing logic."
---

# Refactoring Best Practices

## Core Strategies
- **Extract Function / Component**: Isolate independent logic or UI chunks.
- **Decompose Conditional Logic**: Replace nested branching with guard clauses or strategy patterns.
- **Normalize State**: Keep single source of truth; avoid derived state duplication.
- **Preserve Behavior**: Refactor incrementally with continuous verification via linters and tests.
