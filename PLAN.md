# Project Plan

## Current Task Status
- [x] Fix SSR hydration mismatch: Deferred dynamic UTC live clock in `Hud` component until client mount to avoid time drift between server render and client hydration.
- [x] Fix runtime import error: Fixed TanStack Start / Vite module resolution for `firebase-applet-config.json` by allowing internal Vite JSON module imports.
- [x] Security patch: Block direct HTTP access to blueprint and sensitive configuration files in Vite and Nitro.
- [x] Skill setup: Integrated `find-skills` into `.grok/skills/`.
- [x] Skill installation: Extracted and installed full skill suite from `skills.zip` into `.grok/skills/` and `skills/`.
- [x] Folder structure sync: Mirrored `.grok/*` to `.agents/*` and `agents/*` with security protection rules.
- [x] Hermes Website Art Redesign: Implemented tactical cartography design, glass-panels, corner brackets, satellite telemetry badges, high-contrast glow markers, and live sensor legend without changing base color tokens.
- [x] UI/UX Pro Max Redesign: Streamlined HUD telemetry, instant keyboard search shortcut `/`, region quick-jumpers (North America, Amazon, Mediterranean, etc.), copyable coordinates with status indicators, and enhanced incident inspector tabs.
- [x] Verification: Confirmed applet compilation, lint, and dev server execution.
