---
name: "resolving-merge-conflicts"
description: "Techniques and workflows for analyzing and cleanly resolving Git merge conflicts without regressing features."
---

# Resolving Merge Conflicts

## Step-by-Step Resolution
1. **Identify Conflict Markers**: Locate `<<<<<<<`, `=======`, and `>>>>>>>` boundaries.
2. **Context Analysis**: Understand the intent of both branch modifications.
3. **Harmonious Integration**: Combine logic preserving both feature sets where appropriate.
4. **Compile & Test**: Run typechecks, linters, and smoke tests after resolution.
