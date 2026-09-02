# Context & Key Decisions

- **SSR Clock Hydration**: Dynamic real-time clocks (such as the UTC header in `Hud`) are initialized with a stable placeholder on the server and hydrated on client mount to prevent React hydration mismatch errors.
- **Vite Module Imports**: `firebase-applet-config.json` must be importable by the frontend client bundle via Vite's JSON module import pipeline without 403 blocks from dev server interceptors.
- **Security Enforcement**: Sensitive root configuration files and internal schemas are blocked from direct browser access.
- **Firebase Initialization**: Firebase client initializes cleanly from internal imports without exposing raw config objects on public module exports.
- **Skills Architecture**: `find-skills` and the complete skill catalog from `skills.zip` (design, ui-styling, ui-ux-pro-max, refactor, code-review, ponytail suite, etc.) are installed and maintained across `.agents/`, `agents/`, and `skills/` (with compatibility paths preserved in `.grok/`).
- **Hermes Art Style & UI/UX Standards**: Maintained the dark amber/crimson palette while applying tactical cartography aesthetics: high-contrast telemetry indicators, corner-bracket accents (`.tactical-corner`), glassmorphism backdrop blurs, quick jump corridor presets, copyable coordinates, and a detailed sensor legend popover.
- **Path Security**: All internal agent and runtime directories (`.grok/**`, `.agents/**`, `agents/**`) are shielded against direct HTTP enumeration.
