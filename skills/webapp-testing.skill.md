# Skill: Web Application Testing with Playwright

## Purpose

Use Playwright to verify user-visible behavior in the local application, diagnose
browser issues, and add stable end-to-end coverage for important workflows.

## When to Use

- A change affects a browser workflow, form, navigation, or responsive layout.
- The user requests browser-based verification or an end-to-end test.
- A UI issue needs reproduction in a real browser.

## Project Setup

- Read `playwright.config.js`, `package.json`, and relevant tests before acting.
- Tests live in `tests/e2e/`; the configured server runs with `pnpm dev`.
- Use `pnpm exec playwright test <path>` for a targeted test. The billing suite
  also has the `pnpm test:e2e:billing` script.
- Reuse the project's authentication and test-data setup. Do not assume a fixed
  account, route, database state, or storage state.
- Use the Playwright MCP/browser tooling when available. Otherwise use the
  installed `@playwright/test` package and the repository's Playwright config.

## Test Practices

- Prefer accessible locators such as `getByRole` and `getByLabel`; use
  `data-testid` only when a stable accessible locator is not suitable.
- Assert observable outcomes, not implementation details. Avoid fixed sleeps;
  wait on a locator, URL, or other concrete condition.
- Keep tests isolated and use test data only. Never enter real customer data or
  credentials, and do not run destructive flows against production.
- Capture traces/screenshots on failure when useful; close browser contexts
  created manually.
- Do not weaken or rewrite an existing test merely to make a code change pass.
  Fix the behavior or explain a confirmed test-environment issue.

## Workflow

1. Identify the affected page and expected behavior from the task/spec.
2. Read the relevant implementation, existing tests, and fixtures.
3. Run the narrowest applicable Playwright test; add a test only when it covers
   a meaningful user-visible behavior not already covered.
4. If the test cannot run because required local services or data are missing,
   report the limitation instead of claiming browser verification succeeded.
