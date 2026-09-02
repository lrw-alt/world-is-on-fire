# Context & Key Decisions

- **Security Enforcement**: `firebase-applet-config.json` and sensitive root config files are blocked from direct browser requests using both Vite dev middleware and Nitro server middleware.
- **Firebase Initialization**: Firebase client initializes cleanly from internal imports without exposing raw config objects on public module exports.
- **Skills Architecture**: `find-skills` and the complete skill catalog from `skills.zip` (design, ui-styling, ui-ux-pro-max, refactor, code-review, ponytail suite, etc.) are installed and maintained across `.agents/`, `agents/`, and `skills/` (with compatibility paths preserved in `.grok/`).
- **Path Security**: All internal agent and runtime directories (`.grok/**`, `.agents/**`, `agents/**`) are shielded against direct HTTP enumeration.
