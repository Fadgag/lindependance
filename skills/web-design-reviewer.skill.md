# Skill: Web Design Reviewer

## Purpose

Inspect and improve the visual quality, responsive behavior, and accessibility
of the application's web pages without losing its established product identity.

## When to Use

- The user asks for a visual/UI review, responsive check, or design correction.
- A UI change needs verification at desktop and mobile viewport sizes.

## Project Context

- This is a Next.js App Router application using React, Tailwind CSS, and
  component-level styles. Reuse existing components, tokens, and conventions.
- The product interface is in French. Keep visible labels and user-facing
  messages natural and consistent with the surrounding page.
- Before editing Next.js code, read the relevant documentation under
  `node_modules/next/dist/docs/`, as required by this repository.
- Follow `skills/global-rules.md`; keep business rules out of UI components and
  API route handlers.

## Review Checklist

- Check the requested page at its relevant desktop and mobile breakpoints.
- Look for overflow, clipped content, inconsistent spacing or typography,
  unclear hierarchy, and broken loading/empty/error states.
- Check keyboard navigation, visible focus, accessible names, contrast, and
  reduced-motion behavior where applicable.
- Preserve existing navigation and interaction semantics; do not add decorative
  animation or dependencies just to make a page feel more elaborate.
- Use the browser canvas or available Playwright tooling for a live visual
  review when possible. If the app cannot be run, distinguish source inspection
  from visual verification in the result.

## Workflow

1. Limit the review to the requested page or UI surface; inspect neighboring
   components and styles for established patterns.
2. Reproduce the page in a browser when possible and note concrete issues.
3. Make only in-scope, low-risk corrections. Ask before introducing a new
   visual direction or making a broad design-system change.
4. Recheck the affected viewport(s) and run relevant targeted checks.
5. Report the verified corrections and any remaining issues or limitations.
