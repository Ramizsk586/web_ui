---
name: skill-creator
description: Use this skill any time you are tasked with creating, editing, testing, evaluating, or optimizing modular instructions (skills) in the Lumina environment. This includes designing custom SKILL.md documents, composing auxiliary subagents, setting up verification assertions, running comparative trials (with_skill vs baseline), evaluating execution transcripts, analyzing telemetry metrics, and packaging outputs.
---

# Lumina Skill Creator Skill

An executive, high-fidelity framework within Lumina Intelligence to bootstrap, benchmark, and iteratively refine custom modular agent skills in Coder Mode. Perfecting an agent skill relies on systematic, closed-loop evaluation rather than static prompts.

---

## What Are Skills?

Skills are modular instruction packages that extend the AI's capabilities for specific, well-defined tasks. Each skill lives in a dedicated folder and contains, at minimum, a `SKILL.md` file—a structured Markdown document containing a YAML front-matter block followed by precise instructions.

Skills are not executable binary plugins or code hooks imported at runtime. Instead, they are high-context instruction sheets read on-demand by the model when matching user intent. They often bundle deterministic scripts, reference tables, file schemas, and visual templates to guarantee robust, industry-grade outputs.

---

## Skill Directory Structure

Every standard skill implements the following layout:

```
skill-name/
├── SKILL.md              # Required. Front-matter metadata + core instructions.
├── scripts/              # Optional. Reusable Python/Node scripts executed via terminal.
├── references/           # Optional. Deep-dive docs, APIs, tables loaded on-demand.
└── assets/               # Optional. Templates, icons, assets, stylesheets.
```

### Progressive Disclosure Model
To prevent context window bloat and keep execution costs lean, skills load in three progressive layers:
1. **Trigger Metadata:** The `name` and `description` front-matter parameters (~100 words). Always loaded into active context for intent-matching.
2. **Core Directives:** The body of `SKILL.md` (<500 lines). Loaded only when the skill is explicitly triggered.
3. **Auxiliary Resources:** Files in `references/`, `contracts/`, or `scripts/`. Checked out dynamically only if the `SKILL.md` directs the agent to load them for a specific step.

---

## Operating Protocol: Step-by-Step

### Step 1: Intent Discovery & Scopes
Before performing any substantive code-writing or file creation, scan the `<available_skills>` catalog:
* Cross-check the user's prompt against any active skill `description`.
* If a semantic matching pattern triggers, you **must** load and read the skill's `SKILL.md` before generating any file or calling tools.
* Do not skip loading the skill even for "simple" matching tasks. Skills encode crucial system quirks, library availability, and output constraints that prevent runtime failures.

### Step 2: Diagnostic Interviews & Research
When creating or updating a skill:
* **Capture Intent:** Examine current chat transcripts to extract rules, successful configurations, and corrections.
* **Proactive Interviewing:** Ask the user targeted questions regarding edge cases, input data ranges, expected output layouts, boundaries, and required dependencies.
* **Research Integrations:** Use terminal tools or subagents to check available libraries, APIs, and frameworks. Keep the burden on the user minimal by proposing robust defaults.

### Step 3: Authoring `SKILL.md`
Compose the target skill following these rules:
* **Pushy Description:** Write a comprehensive description block in the YAML front-matter. Make it slightly "pushy" to avoid undertriggering. Detail exactly what the skill does AND list specific user phrases or file associations that should trigger it.
* **The Reasoning Anchor:** Explain the *why* behind your constraints instead of writing flat "MUST/NEVER" commands. LLMs with theory of mind perform significantly better when they understand the logical rationale.
* **Lean instructions:** Keep the instruction body clean and highly actionable under 500 lines. Move large specifications into the `references/` folder.
* **Structural Specifications:** Explicitly define output layouts, expected structures, and templates (e.g., Markdown headers, CSV columns).

### Step 4: Crafting Evals & Expectations
* Formulate 2-3 realistic test queries mimicking typical user interactions. Do not use abstract questions; use specific, high-context prompts containing realistic file names, column titles, and backgrounds.
* Save these prompts to `.lumina/evals/evals.json` (see `references/schemas.md` for schemas).
* Formulate objective, discriminating expectations (assertions) that are testable. Avoid subjective assertions unless evaluating pure writing styles.

### Step 5: Comparative Testing Loops
For each eval scenario, spawn parallel execution trials:
* **With-Skill Run:** Execute the prompt with the new skill active. Save results to `<workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/`.
* **Baseline Run:** 
  - *For a new skill:* Run the prompt with no active skill. Save outputs to `without_skill/outputs/`.
  - *For an existing skill:* Run the prompt with a snapshot of the original skill. Save outputs to `old_skill/outputs/`.
* Write an `eval_metadata.json` describing the evaluation scenario under the run directory.
* While the execution trials run, finalize your quantitative grader scripts and programmatically verifiable assertions.

### Step 6: Telemetry and Analytics Gathering
* As soon as each trial terminates, capture its performance metadata (execution duration and token consumption) and write it immediately to `timing.json` inside the trial directory. This telemetry is transient and must be captured upon task completion.

### Step 7: Automated Evaluation & Viewer Integration
Once all runs are completed:
* **Run Grader:** Launch the Grader Agent (following `agents/grader.md`) or write a programmatic verification script to verify compliance. Output formal marks to `grading.json`.
* **Compile Benchmark:** Execute the statistical aggregation script to produce `benchmark.json` and a detailed `benchmark.md` ledger comparing pass rates, timings, and token deltas.
* **Launch Evaluator Viewer:** Invoke the `eval-viewer/generate_review.py` script to compile results. If acting in a headless or remote container environment, pass `--static` to output a standalone interactive HTML review package. Provide the secure view link to the user.

### Step 8: Qualitative Feedbacks & Upgrades
* Once the user has reviewed the qualitative outputs and metrics, retrieve `feedback.json` generated on review submission.
* **Review Observations:** Pinpoint specific assertions that failed or did not meet expectations.
* **Systematic Fixes:** Identify recurring patterns across failures. Update instructions, clarify constraints, or package reusable automation scripts into `scripts/` to eliminate developer boilerplate in future generations.
* **Iterate:** Re-run the loop (Iteration N+1) until perfect pass rates and visual excellence are achieved.

### Step 9: Description Optimization
* Once the instruction set is locked, run the description tuner.
* Generate twenty highly realistic evaluation queries (10 should-trigger, 10 should-not-trigger challenging near-miss queries containing realistic backstories).
* Let the user preview the set in a web dashboard, then invoke the optimization script `scripts/run_loop.py`.
* Propose description refinements iteratively across 5 epochs, selecting the candidate that demonstrates the highest held-out test triggering scores. Update the YAML metadata block of `SKILL.md` with this optimized description.

### Step 10: Package for Deployment
* Build the finalized package by invoking `scripts/package_skill.py`. This bundles your instructions, scripts, references, and assets into an installable `.skill` bundle.

---

## Strategic Design & Usability Rules

1. **Always run comparative baselines.** You cannot claim a skill succeeds without measuring its delta against standard model behavior.
2. **Never assume or parse stale files.** Always call `view` on `SKILL.md` before making edits or running tests.
3. **No code duplication.** If multiple test runs require writing identical helper logic, extract that logic into a script inside the `scripts/` folder of the skill.
4. **Persist and present.** Write finalized outputs to the dedicated `/mnt/user-data/outputs/` directory and present links clearly to the user.
