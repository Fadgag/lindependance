# Skill: Product-Driven UI/UX

Adapted from [anti-ui-slop](https://github.com/github/awesome-copilot/tree/main/skills/anti-ui-slop)
(MIT). Use this skill to design, redesign, critique, or polish a user interface
without falling back on generic AI-generated patterns.

## Principles

- Start from the user, their task, and the product's existing interface. Reuse
  its components, visual language, and conventions before proposing new ones.
- Make the product's real content and actions clear. Avoid decorative sections,
  novelty for its own sake, invented product features, and placeholder content.
- Keep the UI coherent across its loading, empty, error, success, and interactive
  states, not just the initial screenshot.
- Respect the project's French-language UX, accessibility, responsive behavior,
  and reduced-motion preferences.
- Do not add dependencies, external services, or send project details to third
  parties to obtain design references unless the user explicitly requests it.

## Workflow

1. Identify the target page, its users, primary task, and constraints from the
   request and existing code.
2. Inspect nearby pages, shared components, and styles; preserve established
   patterns unless a redesign is explicitly requested.
3. Define a concise visual and interaction direction appropriate to that task.
   For a small refinement, do not introduce a new design system.
4. Implement only the requested scope, including relevant interaction and
   accessibility states.
5. Render and inspect the result when the local app/browser is available. Fix
   concrete issues such as clipping, overlap, inaccessible controls, or inert
   actions; state clearly when visual verification was not possible.
