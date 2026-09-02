# Changelog

- 2026-09-02: Resolved React hydration mismatch in Hud header by deferring dynamic UTC time rendering until client mount and adding suppressHydrationWarning.
- 2026-09-02: Resolved module import error for TanStack Start client bundle by unblocking internal Vite JSON module imports of firebase-applet-config.json while maintaining backend protection.
- 2026-09-02: Fixed direct exposure leak for firebase-applet-config.json and root config files via Vite securityDenyPlugin and Nitro server middleware; configured find-skills capability.
- 2026-09-02: Installed complete skills suite from skills.zip into project workspace (.grok/skills/ and skills/).
- 2026-09-02: Synchronized .grok/* folder content to .agents/* and agents/* with associated security configurations.
- 2026-09-02: Executed complete UI/UX and art redesign applying Hermes cartography art style (tactical HUD, glassmorphism panels, high-contrast markers, satellite telemetry legend, quick region jumpers) and UI/UX Pro Max standards without modifying the base color palette.
- 2026-09-02: Integrated the login authentication and user profile badge directly into the Ember Atlas telemetry section in the HUD.
- 2026-09-02: Consolidated Your Fire Watchlist and Sensor & Telemetry Legend into the global Search control panel.
- 2026-09-02: Adjusted HUD bottom layout to position the timeline switcher & layer toggles below at the screen bottom and the map zoom/locate controls floating above them.
