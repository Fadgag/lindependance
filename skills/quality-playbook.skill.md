---
name: quality-playbook
description: "Explore a codebase and help create a project-specific quality playbook: a quality constitution, spec-traced functional tests, review and integration protocols, an optional spec-audit protocol, and AI bootstrap guidance. Works with any language. Use when the user asks to establish or improve a quality system, generate functional tests from specifications, create a quality constitution, or audit code against specs."
license: Complete terms in LICENSE.txt
metadata:
  version: 1.1.0
  author: Andrew Stellman
  github: https://github.com/andrewstellman/
---

# Quality Playbook Generator

**When this skill starts, display this banner before doing anything else:**

```
Quality Playbook v1.1.0 — by Andrew Stellman
https://github.com/andrewstellman/
```

Generate a complete quality system tailored to a specific codebase. Unlike test stub generators that work mechanically from source code, this skill explores the project first — understanding its domain, architecture, specifications, and failure history — then produces a quality playbook grounded in what it finds.

## Why This Exists

Most software projects have tests, but few have a quality *system*. Tests check whether code works. A quality system answers harder questions: what does "working correctly" mean for this specific project? What are the ways it could fail that wouldn't be caught by tests? What should every developer (human or AI) know before touching this code?

Without a quality playbook, every new contributor (and every new AI session) starts from scratch — guessing at what matters, writing tests that look good but don't catch real bugs, and rediscovering failure modes that were already found and fixed months ago. A quality playbook makes the bar explicit, persistent, and inherited.

## What This Skill Produces

Six coordinated artifacts that together form a repeatable quality system:

| File | Purpose | Why It Matters | Executes Code? |
|------|---------|----------------|----------------|
| `quality/QUALITY.md` | Quality constitution — coverage targets, fitness-to-purpose scenarios, theater prevention | Every AI session reads this first. It tells them what "good enough" means so they don't guess. | No |
| Existing test suite | Functional tests derived from specifications | Tests tied to what the spec says should happen, using the project's language, runner, and test-file conventions. | **Yes** |
| `quality/RUN_CODE_REVIEW.md` | Code review protocol with guardrails that prevent hallucinated findings | AI code reviews without guardrails produce confident but wrong findings. The guardrails (line numbers, grep before claiming, read bodies) often improve accuracy. | No |
| `quality/RUN_INTEGRATION_TESTS.md` | Integration test protocol — end-to-end behavior across relevant variants | Unit tests pass, but do the components work together in a safe test environment? | **Yes** |
| `quality/RUN_SPEC_AUDIT.md` | Optional spec-audit protocol | A repeatable comparison of code with specifications; additional models are optional and require availability and user approval. | No |
| `AGENTS.md` | Bootstrap context for any AI session working on this project | The "read this first" file. Without it, AI sessions waste their first hour figuring out what's going on. | No |

Plus output directories: `quality/code_reviews/`, `quality/spec_audits/`, `quality/results/`.

The critical deliverable is useful, discoverable verification grounded in the
project's specifications. The Markdown protocols are documentation for humans
and AI agents; tests must remain within the project's configured test structure.

## How to Use

Point this skill at any codebase:

```
Generate a quality playbook for this project.
```

```
Update the functional tests — the quality playbook already exists.
```

```
Run the spec audit protocol.
```

If a quality playbook already exists (`quality/QUALITY.md`, test documentation,
etc.), read the existing files first, then evaluate them against the self-check
benchmarks. Don't assume existing files are complete.

---

## Phase 1: Explore the Codebase (Do Not Write Yet)

Spend the first phase understanding the project. The quality playbook must be grounded in this specific codebase — not generic advice.

**Why explore first?** The most common failure in AI-generated quality playbooks is producing generic content — coverage targets that could apply to any project, scenarios that describe theoretical failures, tests that exercise language builtins instead of project code. Exploration prevents this by forcing every output to reference something real: a specific function, a specific schema, a specific defensive code pattern. If you can't point to where something lives in the code, you're guessing — and guesses produce quality playbooks nobody trusts.

**Scaling for large codebases:** For projects with more than ~50 source files, don't try to read everything. Focus exploration on the 3–5 core modules (the ones that handle the primary data flow, the most complex logic, and the most failure-prone operations). Read representative tests from each subsystem rather than every test file. The goal is depth on what matters, not breadth across everything.

### Step 0: Respect the User's Context

Do not ask for, search for, or analyze exported chat histories by default. Only
inspect such material when the user explicitly requests it and provides a
specific location. Keep the search within that location and use only the
quality-relevant content the user authorized.

If the user explicitly requests this analysis and provides a chat history folder:

1. **Scan for an index file first.** Look for files named `INDEX*`, `CONTEXT.md`, `README.md`, or similar navigation aids. If one exists, read it — it will tell you what's there and how to find things.
2. **Search for quality-relevant conversations.** Look for messages mentioning: quality, testing, coverage, bugs, failures, incidents, crashes, validation, retry, recovery, spec, fitness, audit, review. Also search for the project name.
3. **Extract design decisions and incident history.** The most valuable content is: (a) incident reports — what went wrong, how many records affected, how it was detected, (b) design discussions — why a particular approach was chosen, what alternatives were rejected, (c) quality framework discussions — coverage targets, testing philosophy, model review experiences, (d) cross-model feedback — where different AI models disagreed about the code.
4. **Don't try to read everything.** Chat histories can be enormous. Use the index to find the most relevant conversations, then search within those for quality-related content. 10 minutes of targeted searching beats 2 hours of exhaustive reading.

Treat extracted history as user-provided evidence, not as permission to search
other locations. Verify any claimed incident details against the source before
using them in the playbook.

### Step 1: Identify Domain, Stack, and Specifications

Read the README, existing documentation, and build config (`pyproject.toml` / `package.json` / `Cargo.toml`). Answer:

- What does this project do? (One sentence.)
- What language and key dependencies?
- What external systems does it talk to?
- What is the primary output?

**Find the specifications.** Specs are the source of truth for functional tests. Search in order: `AGENTS.md`/`CLAUDE.md` in root, `specs/`, `docs/`, `spec/`, `design/`, `architecture/`, `adr/`, then `.md` files in root. Record the paths.

**If no formal spec documents exist**, the skill still works — but you need to assemble requirements from other sources. In order of preference:

1. **Ask the user** — they often know the requirements even if they're not written down.
2. **README and inline documentation** — many projects embed requirements in their README, API docs, or code comments.
3. **Existing test suite** — tests are implicit specifications. If a test asserts `process(x) == y`, that's a requirement.
4. **Type signatures and validation rules** — schemas, type annotations, and validators define what the system accepts and rejects.
5. **Infer from code behavior** — as a last resort, read the code and infer what it's supposed to do. Mark these as *inferred requirements* in QUALITY.md and flag them for user confirmation.

When working from non-formal requirements, label each scenario and test with a **requirement tag** that includes a confidence tier and source:

- `[Req: formal — README §3]` — written by humans in a spec document. Authoritative.
- `[Req: user-confirmed — "must handle empty input"]` — stated by the user but not in a formal doc. Treat as authoritative.
- `[Req: inferred — from validate_input() behavior]` — deduced from code. Flag for user review.

Use this exact tag format in QUALITY.md scenarios, functional test documentation, and spec audit findings. It makes clear which requirements are authoritative and which need validation.

### Step 2: Map the Architecture

List source directories and their purposes. Read the main entry point, trace execution flow. Identify:

- The 3–5 major subsystems
- The data flow (Input → Processing → Output)
- The most complex module
- The most fragile module

### Step 3: Read Existing Tests

Read the existing test files — all of them for small/medium projects, or a representative sample from each subsystem for large ones. Identify: test count, coverage patterns, gaps, and any coverage theater (tests that look good but don't catch real bugs).

**Critical: Record the import pattern.** How do existing tests import project modules? Every language has its own conventions (Python `sys.path` manipulation, Java/Scala package imports, TypeScript relative paths or aliases, Go package/module paths, Rust `use crate::` or `use myproject::`). Follow the conventions and test runner already configured in the project.

**Identify integration test runners.** Look for scripts or test files that exercise the system end-to-end against real external services (APIs, databases, etc.). Note their patterns — you'll need them for `RUN_INTEGRATION_TESTS.md`.

### Step 4: Read the Specifications

Walk each spec document section by section. For every section, ask: "What testable requirement does this state?" Record spec requirements without corresponding tests — these are the gaps the functional tests must close.

If using inferred requirements (from tests, types, or code behavior), tag each with its confidence tier using the `[Req: tier — source]` format defined in Step 1. Inferred requirements feed into QUALITY.md scenarios and should be flagged for user review in Phase 4.

### Step 4b: Read Function Signatures and Real Data

Before writing any test, you must know exactly how each function is called. For every module you identified in Step 2:

1. **Read the actual function signatures** — parameter names, types, defaults. Don't guess from usage context — read the function definition and any documentation (Python docstrings, Java/Scala Javadoc/ScalaDoc, TypeScript type annotations, Go godoc comments, Rust doc comments and type signatures).
2. **Read real data files** — If the project has items files, fixture files, config files, or sample data (in `pipelines/`, `fixtures/`, `test_data/`, `examples/`), read them. Your test fixtures must match the real data shape exactly.
3. **Read existing test fixtures** — How do existing tests create test data? Copy their patterns. If they build config dicts with specific keys, use those exact keys.
4. **Check library versions** — Check the project's dependency manifest (`requirements.txt`, `build.sbt`, `package.json`, `pom.xml`/`build.gradle`, `go.mod`, `Cargo.toml`) to see what's actually available. Don't write tests that depend on library features that aren't installed.

Record a **function call map**: for each function you plan to test, write down its name, module, parameters, and what it returns. This map prevents the most common test failure: calling functions with wrong arguments.

### Step 5: Find the Skeletons

This is the most important step. Search for defensive code patterns — each one is evidence of a past failure or known risk.

**Why this matters:** Developers don't write `try/except` blocks, null checks, or retry logic for fun. Every piece of defensive code exists because someone got burned. A `try/except` around a JSON parse means malformed JSON happened in production. A null check on a field means that field was missing when it shouldn't have been. These patterns are the codebase whispering its history of failures. Each one becomes a fitness-to-purpose scenario and a boundary test.

Search for relevant defensive patterns and read the surrounding code. Record only
patterns supported by evidence; there is no minimum count per file.

### Step 5b: Map Schema Types

If the project has a validation layer (Pydantic models in Python, JSON Schema, TypeScript interfaces/Zod schemas, Java Bean Validation annotations, Scala case class codecs), read the schema definitions now. For every field you found a defensive pattern for, record what the schema accepts vs. rejects.

Use the project's actual schemas to determine which input values are valid before
designing boundary tests.

### Step 6: Identify Quality Risks (Code + Domain Knowledge)

Every project has a different failure profile. This step uses **two sources** — not just code exploration, but your training knowledge of what goes wrong in similar systems.

**From code exploration**, ask:
- What does "silently wrong" look like for this project?
- What external dependencies can change without warning?
- What looks simple but is actually complex?
- Where do cross-cutting concerns hide?

**From domain knowledge**, ask:
- "What goes wrong in systems like this?" — If it's a batch processor, think about crash recovery, idempotency, silent data loss, state corruption. If it's a web app, think about auth edge cases, race conditions, input validation bypasses. If it handles randomness or statistics, think about seeding, correlation, distribution bias.
- "What produces correct-looking output that is actually wrong?" — This is the most dangerous class of bug: output that passes all checks but is subtly corrupted.
- "What happens at 10x scale that doesn't happen at 1x?" — Chunk boundaries, rate limits, timeout cascading, memory pressure.
- "What happens when this process is killed at the worst possible moment?" — Mid-write, mid-transaction, mid-batch-submission.

Generate plausible failure scenarios from this knowledge, but label them as
hypotheses unless supported by project evidence. Ground code claims in actual
files and functions. Use numerical impact only when verified from project data;
otherwise describe the impact qualitatively and state the assumptions.

---

## Phase 2: Generate the Quality Playbook

Produce the six artifacts. For each one, follow the structure below and ground it in the repository and its configured tooling.

**Why a playbook instead of just tests?** Tests catch regressions but do not
prevent every category of bug. The quality constitution (`QUALITY.md`) records
project-specific expectations. The protocols (`RUN_*.md`) provide repeatable
review, integration-test, and spec-audit processes. Map scenarios to suitable
verification without requiring a one-to-one test count or a multi-model audit.

### File 1: `quality/QUALITY.md` — Quality Constitution

The constitution has six sections:

1. **Purpose** — What quality means for this project, grounded in Deming (built in, not inspected), Juran (fitness for use), Crosby (quality is free). Apply these specifically: what does "fitness for use" mean for *this system*? Not "tests pass" but the actual operational requirement.
2. **Coverage Targets** — Table mapping each subsystem to a target with rationale referencing real risks. Every target must have a "why" grounded in a specific scenario — without it, a future AI session will argue the target down.
3. **Coverage Theater Prevention** — Project-specific examples of fake tests, derived from what you saw during exploration. (Why: AI-generated tests often pad coverage numbers without catching real bugs — asserting that imports worked, that dicts have keys, or that mocks return what they were configured to return. Calling this out explicitly stops the pattern.)
4. **Fitness-to-Purpose Scenarios** — Each scenario documents a plausible failure mode with code references and a verification method. Add only scenarios relevant to the project; do not target a fixed count.
5. **AI Session Quality Discipline** — Rules every AI session must follow
6. **The Human Gate** — Things requiring human judgment

Scenarios must distinguish observed facts from hypotheses. Ground code claims in
the repository and numerical impact in verified project data. If an impact is
hypothetical, label it as an assumption and do not present it as an incident or a
measured quantity.

Every scenario must have an appropriate verification method. Prefer an automated
test when the behavior can be tested reliably and the project has a suitable runner.

### File 2: Functional Tests

**This is the most important deliverable.** Keep tests tied to actual requirements
and runnable through the project's existing test setup.

Organize the verification into logical groups using the project's test framework:

- **Spec requirements** — Cover testable requirements with meaningful tests and cite the requirement each test verifies.
- **Fitness scenarios** — Map each scenario to an appropriate test or other verification method.
- **Boundaries and edge cases** — Add cases for relevant defensive patterns where the behavior is testable.

Key rules:
- **Match the existing import pattern exactly.** Read how existing tests import project modules and do the same thing. Getting this wrong means every test fails.
- **Read every function's signature before calling it.** Read the actual `def` line — parameter names, types, defaults. Read real data files from the project to understand data shapes. Do not guess at function parameters or fixture structures.
- **No placeholder tests.** Every test must import and call actual project code. If the body is `pass` or the assertion is trivial (`assert isinstance(x, list)`), delete it. A test that doesn't exercise project code inflates the count and creates false confidence.
- **No test quotas.** Choose test cases from requirements, risks, and meaningful edge cases. Do not add tests to hit a count or percentage.
- **Cross-variant coverage.** When behavior is shared across variants, test relevant variants; choose coverage based on risk rather than a fixed percentage.
- **Test outcomes, not mechanisms** — Assert what the spec says should happen, not how the code implements it.
- **Use schema-valid mutations** — Boundary tests must use values the schema accepts (from Step 5b), not values it rejects.

### File 3: `quality/RUN_CODE_REVIEW.md`

Key sections: bootstrap files, focus areas mapped to architecture, and these mandatory guardrails:

- Line numbers are mandatory — no line number, no finding
- Read function bodies, not just signatures
- If unsure: flag as QUESTION, not BUG
- Grep before claiming missing
- Do NOT suggest style changes — only flag things that are incorrect

**Phase 2: Regression tests.** After the review produces confirmed BUG findings,
add regression tests in the project's existing test structure. Each test should
reproduce the bug before the fix. Report results as a confirmation table
(BUG CONFIRMED / FALSE POSITIVE / NEEDS INVESTIGATION).

### File 4: `quality/RUN_INTEGRATION_TESTS.md`

Must include: safety constraints, pre-flight checks, test matrix with specific pass criteria, an execution UX section, and a structured reporting format. Cover happy path, cross-variant consistency, output correctness, and component boundaries.

**All commands must use relative paths.** The generated protocol should include a "Working Directory" section at the top stating that all commands run from the project root using relative paths. Never generate commands that `cd` to an absolute path — this breaks when the protocol is run from a different machine or directory. Use `./scripts/`, `./pipelines/`, `./quality/`, etc.

**Include an Execution UX section.** Specify how to present the plan, concise
progress updates when useful, and a final summary of pass/fail counts and limitations.

**Use safe integration targets.** Exercise real external dependencies only in
approved test environments with disposable data and no production credentials. If
a live integration is unsafe, unavailable, costly, or has external side effects,
use a contract test, a controlled test double, or request human approval before
running it.

**Derive quality gates from the code, not generic checks.** Read validation rules, schema enums, and generation logic during exploration. Turn them into per-pipeline quality checks with specific fields and acceptable value ranges. "All units validated" is not enough — the protocol must verify domain-specific correctness.

**Use parallelism only when safe.** Parallelize independent test runs when the
test environment, data isolation, and service rate limits allow it.

**Calibrate test size to the project.** Use representative cases and the smallest
dataset that can validate the required behavior and relevant boundaries.

**Deep post-run verification.** Don't stop at "process completed." Verify log files, manifest state, output data existence, sample record content, and any existing quality check scripts — for every run.

**Find and use existing verification tools.** Search for existing scripts that verify output quality (e.g., `integration_checks.py`, validation scripts, quality gate functions). If they exist, call them from the protocol. If the project has a TUI or dashboard, include TUI verification commands (e.g., `--dump` flags) in the post-run checklist.

For schema-driven quality gates, optionally build a field reference table from the
actual schema. Copy names and constraints exactly, and include only fields
relevant to the checks.

### File 5: `quality/RUN_SPEC_AUDIT.md` — Optional Spec Audit

When requested and available, independent AI models can audit the code against
specifications. Do not assume access to particular models or incur external
costs without approval.

The protocol should define a copy-pasteable audit prompt with guardrails,
project-specific scrutiny areas, triage by evidence and confidence, and fix
execution rules.

### File 6: `AGENTS.md`

If `AGENTS.md` already exists, update it — don't replace it. Add a Quality Docs section pointing to all generated files.

If creating from scratch: project description, setup commands, build & test commands, architecture overview, key design decisions, known quirks, and quality docs pointers.

---

## Phase 3: Verify

**Why a verification phase?** AI-generated output can look polished and be subtly wrong. Tests that reference undefined fixtures report 0 failures but 16 errors — and "0 failures" sounds like success. Integration protocols can list field names that don't exist in the actual schemas. The verification phase catches these problems before the user discovers them, which is important because trust in a generated quality playbook is fragile — one wrong field name undermines confidence in everything else.

### Self-Check Benchmarks

Before declaring done, verify the generated artifacts against the project
configuration and the user's requirements.

The critical checks:

1. **Scenario coverage** — Each documented scenario has an appropriate verification method; add tests where justified.
2. **Assertion depth** — Assertions check meaningful outcomes rather than only presence.
3. **Layer correctness** — Tests assert outcomes, not incidental implementation details.
4. **Mutation validity** — Test data follows the actual schemas and project fixtures.
5. **Test discovery** — New tests are in a location discovered by the existing test runner.
6. **Existing tests unbroken** — Confirm that the generated artifacts do not disrupt the existing suite.
7. **Test results** — Run the smallest relevant configured test command; report failures, errors, skipped tests, and unavailable dependencies accurately.
8. **Evidence quality** — Claims, field names, and numeric impact are traceable to project sources or clearly labeled as hypotheses.

If any benchmark fails, go back and fix it before proceeding.

---

## Phase 4: Present, Explore, Improve (Interactive)

After generating and verifying, present the results clearly and give the user control over what happens next. This phase has three parts: a scannable summary, drill-down on demand, and a menu of improvement paths.

**Do not skip this phase.** The autonomous output from Phases 1-3 is a solid starting point, but the user needs to understand what was generated, explore what matters to them, and choose how to improve it. A quality playbook is only useful if the people who own the project trust it and understand it. Dumping six files without explanation creates artifacts nobody reads.

### Part 1: The Summary Table

Present a single table the user can scan in 10 seconds:

```
Here's what I generated:

| File | What It Does | Key Metric | Confidence |
|------|-------------|------------|------------|
| QUALITY.md | Quality constitution | `[N]` evidence-linked scenarios | Confidence derived from source quality |
| Functional tests | Automated tests | `[N]` relevant tests | Report actual results and skipped tests |
| RUN_CODE_REVIEW.md | Code review protocol | Project-specific focus areas | Grounded in inspected architecture |
| RUN_INTEGRATION_TESTS.md | Integration test protocol | Safe, relevant test cases | Note external dependencies and limitations |
| RUN_SPEC_AUDIT.md | Optional spec-audit protocol | Areas tied to the specification | Use additional models only when requested and available |
| AGENTS.md | AI session bootstrap | Updated | ████████ High — factual |
```

Adapt the table to what you actually generated — the file names, metrics, and confidence levels will vary by project. The confidence column is the most important: it tells the user where to focus their attention.

**Confidence levels:**
- **High** — Derived directly from code, specs, or schemas. Unlikely to need revision.
- **Medium** — Reasonable inference, but could be wrong. Benefits from user input.
- **Low** — Best guess. Definitely needs user input to be useful.

After the table, add a "Quick Start" block with ready-to-copy prompts for executing each artifact:

```
To use these artifacts, start a new AI session and try one of these prompts:

• Run a code review:
  "Read quality/RUN_CODE_REVIEW.md and follow its instructions to review [module or file]."

• Run the functional tests:
  "[the relevant test command from the project's configured test runner]"

• Run the integration tests:
  "Read quality/RUN_INTEGRATION_TESTS.md and follow its instructions."

• Start a spec audit:
  "Read quality/RUN_SPEC_AUDIT.md and follow its instructions. Use additional models only if I request them."
```

Adapt the test runner command and module names to the actual project. The point is to give the user copy-pasteable prompts — not descriptions of what they could do, but the actual text they'd type.

After the Quick Start block, add one line:

> "You can ask me about any of these to see the details — for example, 'show me Scenario 3' or 'walk me through the integration test matrix.'"

### Part 2: Drill-Down on Demand

When the user asks about a specific item, give a focused summary — not the whole file, but the key decisions and what you're uncertain about. Examples:

- **"Tell me about Scenario 4"** → Show the scenario text, explain where it came from (which defensive pattern or domain knowledge), and flag what you inferred vs. what you know.
- **"Show me the integration test matrix"** → Show the run groups, explain the parallelism strategy, and note which quality gates you derived from schemas vs. guessed at.
- **"How do the functional tests work?"** → Show the three test groups, explain the mapping to specs and scenarios, and highlight any tests you're least confident about.

The user may go through several drill-downs before they're ready to improve anything. That's fine — let them explore at their own pace.

### Part 3: The Improvement Menu

After the user has seen the summary (and optionally drilled into details), present the improvement options:

> "Two ways to make this better:"
>
> **1. Review and harden individual items** — Pick any scenario, test, or protocol section and I'll walk through it with you. Good for: tightening specific quality gates, fixing inferred scenarios, adding missing edge cases.
>
> **2. Guided Q&A** — I'll ask you 3-5 targeted questions about things I couldn't infer from the code: incident history, expected distributions, cost tolerance, model preferences. Good for: filling knowledge gaps that make scenarios more authoritative.
>
> "You can do any combination of these, in any order. Which would you like to start with?"

### Executing Each Improvement Path

**Path 1: Review and harden.** The user picks an item. Walk through it: show the current text, explain your reasoning, ask if it's accurate. Revise based on their feedback. Re-run tests if the functional tests change.

**Path 2: Guided Q&A.** Ask 3-5 questions derived from what you actually found during exploration. These categories cover the most common high-leverage gaps:

- **Incident history for scenarios.** "I found [specific defensive code]. Is there a confirmed incident or known impact? If not, I'll keep the scenario labeled as a hypothesis."
- **Quality gate thresholds.** "I'm checking that [field] contains [values]. What distribution is normal? What signals a problem?"
- **Integration test scale and cost.** "The protocol runs [N] tests costing roughly $[X]. Should I increase or decrease coverage?"
- **Test scope.** "I generated [N] functional tests. Your existing suite covers [other areas]. Are there gaps?"
- **Model preferences for spec audit.** "Which AI models do you use? Have you noticed specific strengths?"

After the user answers, revise the generated files and re-run tests.

### Iteration

The user can cycle through these paths as many times as they want. Each pass makes the quality playbook more grounded. When they're satisfied, they'll move on naturally — there's no explicit "done" step.

---

## Fixture Strategy

Use the existing test directory and runner. Only create a separate `quality/`
test setup when the repository configuration discovers it and the user wants it.
Use the project's established fixture strategy:

- **Python:** `quality/conftest.py` for pytest fixtures. If fixtures are defined inline (common with pytest's `tmp_path` pattern), prefer that over shared fixtures.
- **Java:** A test class with `@BeforeEach`/`@BeforeAll` setup methods, or a shared test utility class.
- **Scala:** A trait mixed into test specs (e.g., `trait FunctionalTestFixtures`), or inline data builders.
- **TypeScript/JavaScript:** A `quality/setup.ts` with `beforeAll`/`beforeEach` hooks, or inline test factories.
- **Go:** Helper functions in the same `_test.go` file or a shared `testutil_test.go`. Use `t.Helper()` for test helpers. Go convention prefers inline test setup over shared fixtures.
- **Rust:** Helper functions in a `#[cfg(test)] mod tests` block, or a shared `test_utils.rs` module. Use builder patterns for test data.

Examine existing test files to understand how they set up test data. Reuse the
project's established patterns and fixtures for realistic data shapes.

---

## Terminology

- **Functional testing** — Does the code produce the output specs say it should? Distinct from unit testing (individual functions in isolation).
- **Integration testing** — Do components work together end-to-end in a safe test environment?
- **Spec audit** — AI models read code and compare against specs. No code executed. Catches where code doesn't match documentation.
- **Coverage theater** — Tests that produce high coverage numbers but don't catch real bugs. Example: asserting a function didn't throw without checking its output.
- **Fitness-to-purpose** — Does the code do what it's supposed to do under real-world conditions? A system can have 95% coverage and still lose records silently.

---

## Principles

1. Fitness-to-purpose over coverage percentages
2. Scenarios come from code exploration and, when useful, clearly labeled hypotheses
3. Evidence-backed failure modes make standards actionable
4. Guardrails transform AI review quality (line numbers, read bodies, grep before claiming)
5. Triage before fixing — many "defects" are spec bugs or design decisions

---

## Self-Contained Guidance

This skill contains its own workflow and checklists. Do not assume companion
`references/` files exist; use project documentation and configuration as the
source of truth.