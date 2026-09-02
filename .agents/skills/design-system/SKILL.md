---
name: "design-system"
description: "Token architecture, primitive tokens, semantic tokens, component specifications, variants, and Tailwind integration."
---

# Design System Guidelines

## Token Architecture
- **Primitive Tokens**: Core raw values (colors, spacing steps, font families, radii, elevations).
- **Semantic Tokens**: Contextual abstractions (`bg-background`, `text-foreground`, `border-muted`, `accent-primary`).
- **Component Tokens**: Scoped variants for buttons, cards, badges, inputs, and modals.

## Implementation Rules
- Calculate nested border radii mathematically: `Inner Radius = Outer Radius - Padding`.
- Maintain consistent spacing steps (4px/8px grid system).
- Pass WCAG AA color contrast (minimum 4.5:1 for body text).
