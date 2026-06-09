import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Eye,
  Code,
  Copy,
  Check,
  MoreVertical,
  Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Define the file node interface for our tree
interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

interface Skill {
  id: string;
  name: string;
  addedBy: string;
  trigger: string;
  description: string;
  enabled: boolean;
  tree: FileNode[];
}

const MASTER_SKILL_MD = `---
name: master-orchestrator
description: Read this before heavy or multi-step tasks. It explains the Lumina skill layout, which files to inspect, and how to coordinate skills, references, and scripts for better execution.
---

# Master Orchestrator Skill

Use this skill before heavy work such as coding, debugging, architecture changes, multi-file edits, or deep research.

## Primary Role

You are the orchestration layer for Lumina's skill system. Before acting on a heavy task, map the available files, decide which ones matter, and use them deliberately.

## File Roles

- \`SKILL.md\`: main operating instructions. Read this first.
- \`references/\`: schemas, examples, domain rules, and edge cases.
- \`scripts/\`: reusable automation helpers.
- \`agents/\`: specialist review, grading, comparison, or analysis instructions.
- \`assets/\`: templates, UI helpers, or export support files.

## Workflow

1. Decide whether the task is light or heavy.
2. For heavy tasks, read the active \`SKILL.md\` before major actions.
3. Pull in only the relevant supporting files.
4. Make a short plan.
5. Execute in phases.
6. Verify before finalizing.

## Coordination Rules

- Do not read everything blindly. Read selectively.
- Do not ignore \`references/\` when formats, schemas, or edge cases matter.
- Do not improvise around an existing skill package if it already contains usable guidance.
- If multiple skills apply, use this master skill to coordinate them.`;

const EXECUTION_PLAYBOOK_MD = `---
name: execution-playbook
description: Advanced execution workflow for implementation, refactors, debugging, and complex engineering tasks.
---

# Execution Playbook

## When To Use

Use this skill for:

- feature implementation
- multi-file refactors
- difficult debugging
- risky behavior changes
- tasks that need disciplined verification

## Workflow

1. Restate the goal clearly.
2. Identify likely files and systems.
3. Read before editing.
4. Plan briefly.
5. Execute in controlled steps.
6. Verify outcome and likely regressions.
7. Summarize what changed and any remaining risk.
`;

const OPENCODE_CUSTOMIZE_SKILL_MD = `---
name: customize-opencode
description: Use ONLY when editing or creating opencode configuration, agents, skills, plugins, MCP servers, or permission rules. Do not use for normal application code.
---

# Customizing opencode

Use this skill when the task is specifically about opencode's own configuration surface.

## Scope

- \`opencode.json\` / \`opencode.jsonc\`
- files under \`.lumina_opencode/\` or \`.opencode/\`
- agents, subagents, skills, plugins, MCP servers
- permission rules and config troubleshooting

## Key Rules

1. Prefer file-based agent and skill definitions for non-trivial setups.
2. Treat \`SKILL.md\` as the main skill entry file.
3. Preserve existing config unless the change is explicitly requested.
4. If config is changed, remind the user that opencode must be restarted to pick up config-time changes.

## Important Notes

- \`mode\` can be \`primary\`, \`subagent\`, or \`all\`.
- Skills are discovered from skill folders that contain \`SKILL.md\`.
- Permission rules matter for tool availability and execution behavior.
- MCP server commands are arrays of strings, not a single shell string.
`;

const OPENCODE_EFFECT_SKILL_MD = `---
name: effect
description: Work with Effect v4 / effect-smol TypeScript code in this repo. Use when the task involves Effect services, layers, schemas, typed workflows, or Effect-specific project patterns.
---

# Effect

This skill is for Effect-style TypeScript codebases and repositories that use Effect services, schemas, and layers.

## Source Of Truth

Use current Effect v4 / effect-smol examples and nearby repo code instead of stale memory.

## Guidelines

- Prefer \`Effect.gen(function* () { ... })\` for multi-step workflows.
- Prefer named reusable effects for important workflows and service methods.
- Prefer Effect \`Schema\` for domain and API data structures.
- Keep HTTP handlers thin and move business logic into services.
- Keep dependency provisioning explicit.
- Avoid \`any\`, unchecked casts, and outdated Effect APIs.

## Testing Patterns

- Prefer the repo's Effect test helpers and realistic live tests when platform behavior matters.
- Keep test layers explicit.
- Use scoped fixtures and finalizers for cleanup-sensitive resources.
`;

const DEFAULT_SKILL_MD = `# Lumina Skill Creator

An executive, high-fidelity framework within Lumina Intelligence to bootstrap, benchmark, and iteratively refine custom modular agent skills in Coder Mode. Perfecting an agent skill relies on systematic, closed-loop evaluation rather than static prompts.

---

## What Are Skills?

Skills are modular instruction packages that extend the AI's capabilities for specific, well-defined tasks. Each skill lives in a dedicated folder and contains, at minimum, a \`SKILL.md\` file—a structured Markdown document containing a YAML front-matter block followed by precise instructions.

Skills are not executable binary plugins or code hooks imported at runtime. Instead, they are high-context instruction sheets read on-demand by the model when matching user intent. They often bundle deterministic scripts, reference tables, file schemas, and visual templates to guarantee robust, industry-grade outputs.

---

## Skill Directory Structure

Every standard skill implements the following layout:

\`\`\`
skill-name/
├── SKILL.md              # Required. Front-matter metadata + core instructions.
├── scripts/              # Optional. Reusable Python/Node scripts executed via terminal.
├── references/           # Optional. Deep-dive docs, APIs, tables loaded on-demand.
└── assets/               # Optional. Templates, icons, assets, stylesheets.
\`\`\`

### Progressive Disclosure Model
To prevent context window bloat and keep execution costs lean, skills load in three progressive layers:
1. **Trigger Metadata:** The \`name\` and \`description\` front-matter parameters (~100 words). Always loaded into active context for intent-matching.
2. **Core Directives:** The body of \`SKILL.md\` (<500 lines). Loaded only when the skill is explicitly triggered.
3. **Auxiliary Resources:** Files in \`references/\`, \`contracts/\`, or \`scripts/\`. Checked out dynamically only if the \`SKILL.md\` directs the agent to load them for a specific step.

---

## Operating Protocol: Step-by-Step

### Step 1: Intent Discovery & Scopes
Before performing any substantive code-writing or file creation, scan the \`<available_skills>\` catalog:
* Cross-check the user's prompt against any active skill \`description\`.
* If a semantic matching pattern triggers, you **must** load and read the skill's \`SKILL.md\` before generating any file or calling tools.
* Do not skip loading the skill even for "simple" matching tasks. Skills encode crucial system quirks, library availability, and output constraints that prevent runtime failures.

### Step 2: Diagnostic Interviews & Research
When creating or updating a skill:
* **Capture Intent:** Examine current chat transcripts to extract rules, successful configurations, and corrections.
* **Proactive Interviewing:** Ask the user targeted questions regarding edge cases, input data ranges, expected output layouts, boundaries, and required dependencies.
* **Research Integrations:** Use terminal tools or subagents to check available libraries, APIs, and frameworks. Keep the burden on the user minimal by proposing robust defaults.

### Step 3: Authoring \`SKILL.md\`
Compose the target skill following these rules:
* **Pushy Description:** Write a comprehensive description block in the YAML front-matter. Make it slightly "pushy" to avoid undertriggering. Detail exactly what the skill does AND list specific user phrases or file associations that should trigger it.
* **The Reasoning Anchor:** Explain the *why* behind your constraints instead of writing flat "MUST/NEVER" commands. LLMs with theory of mind perform significantly better when they understand the logical rationale.
* **Lean instructions:** Keep the instruction body clean and highly actionable under 500 lines. Move large specifications into the \`references/\` folder.
* **Structural Specifications:** Explicitly define output layouts, expected structures, and templates (e.g., Markdown headers, CSV columns).

### Step 4: Crafting Evals & Expectations
* Formulate 2-3 realistic test queries mimicking typical user interactions. Do not use abstract questions; use specific, high-context prompts containing realistic file names, column titles, and backgrounds.
* Save these prompts to \`.lumina/evals/evals.json\` (see \`references/schemas.md\` for schemas).
* Formulate objective, discriminating expectations (assertions) that are testable. Avoid subjective assertions unless evaluating pure writing styles.

### Step 5: Comparative Testing Loops
For each eval scenario, spawn parallel execution trials:
* **With-Skill Run:** Execute the prompt with the new skill active. Save results to \`<workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/\`.
* **Baseline Run:** 
  - *For a new skill:* Run the prompt with no active skill. Save outputs to \`without_skill/outputs/\`.
  - *For an existing skill:* Run the prompt with a snapshot of the original skill. Save outputs to \`old_skill/outputs/\`.
* Write an \`eval_metadata.json\` describing the evaluation scenario under the run directory.
* While the execution trials run, finalize your quantitative grader scripts and programmatically verifiable assertions.

### Step 6: Telemetry and Analytics Gathering
* As soon as each trial terminates, capture its performance metadata (execution duration and token consumption) and write it immediately to \`timing.json\` inside the trial directory. This telemetry is transient and must be captured upon task completion.

### Step 7: Automated Evaluation & Viewer Integration
Once all runs are completed:
* **Run Grader:** Launch the Grader Agent (following \`agents/grader.md\`) or write a programmatic verification script to verify compliance. Output formal marks to \`grading.json\`.
* **Compile Benchmark:** Execute the statistical aggregation script to produce \`benchmark.json\` and a detailed \`benchmark.md\` ledger comparing pass rates, timings, and token deltas.
* **Launch Evaluator Viewer:** Invoke the \`eval-viewer/generate_review.py\` script to compile results. If acting in a headless or remote container environment, pass \`--static\` to output a standalone interactive HTML review package. Provide the secure view link to the user.

### Step 8: Qualitative Feedbacks & Upgrades
* Once the user has reviewed the qualitative outputs and metrics, retrieve \`feedback.json\` generated on review submission.
* **Review Observations:** Pinpoint specific assertions that failed or did not meet expectations.
* **Systematic Fixes:** Identify recurring patterns across failures. Update instructions, clarify constraints, or package reusable automation scripts into \`scripts/\` to eliminate developer boilerplate in future generations.
* **Iterate:** Re-run the loop (Iteration N+1) until perfect pass rates and visual excellence are achieved.

### Step 9: Description Optimization
* Once the instruction set is locked, run the description tuner.
* Generate twenty highly realistic evaluation queries (10 should-trigger, 10 should-not-trigger challenging near-miss queries containing realistic backstories).
* Let the user preview the set in a web dashboard, then invoke the optimization script \`scripts/run_loop.py\`.
* Propose description refinements iteratively across 5 epochs, selecting the candidate that demonstrates the highest held-out test triggering scores. Update the YAML metadata block of \`SKILL.md\` with this optimized description.

### Step 10: Package for Deployment
* Build the finalized package by invoking \`scripts/package_skill.py\`. This bundles your instructions, scripts, references, and assets into an installable \`.skill\` bundle.

---

## Strategic Design & Usability Rules

1. **Always run comparative baselines.** You cannot claim a skill succeeds without measuring its delta against standard model behavior.
2. **Never assume or parse stale files.** Always call \`view\` on \`SKILL.md\` before making edits or running tests.
3. **No code duplication.** If multiple test runs require writing identical helper logic, extract that logic into a script inside the \`scripts/\` folder of the skill.
4. **Persist and present.** Write finalized outputs to the dedicated \`/mnt/user-data/outputs/\` directory and present links clearly to the user.
`;

const SCHEMA_SPECS_MD = `# Lumina Skill System Schema Specifications

This documentation serves as the official specification for JSON data structures, grading logs, and analytical tracking files inside Lumina's testing environment. All scripts, subagents, and tools must output structured data that conforms to these strict JSON formats to ensure compatibility with Lumina's visualization dashboards.

---

## 📋 1. Evaluation Configuration: \`.lumina/evals/evals.json\`

The central ledger containing evaluation prompts, file references, and expectation assertions used to challenge configuration quality.

### Schema Blueprint
\`\`\`json
{
  "skill_name": "example-skill-id",
  "evals": [
    {
      "id": "scenario-01",
      "prompt": "Evaluate current financial models and extract accurate monthly aggregates.",
      "expected_output": "A markdown report with a structured ledger and summary table.",
      "files": [".lumina/evals/resources/monthly_ledger.csv"],
      "expectations": [
        "The output contains rows for January through December",
        "The computed calculations match the ledger sums and avoid hover float errors"
      ]
    }
  ]
}
\`\`\`

### Fields Guide
* \`id\` *(string)*: Unique alphanumeric identifier for each test vector.
* \`prompt\` *(string)*: The high-fidelity query given to the agent.
* \`expected_output\` *(string)*: A high-level description of what success looks like.
* \`files\` *(array of strings)*: Relatives paths in the workspace containing pre-loaded data or reference files.
* \`expectations\` *(array of strings)*: Clear, binary, objectively verifiable assertions.

---

## 🕒 2. Telemetry Tracker: \`timing.json\`

Captures key latency, duration, and token consumption metrics during trial runs. Placed in the run iteration directories.

### Schema Blueprint
\`\`\`json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3,
  "execution_metrics": {
    "tool_calls": 14,
    "unhandled_errors": 0
  }
}
\`\`\`

---

## 🎯 3. Grader Summary: \`grading.json\`

Compiled by Grader Agents during audits, verifying assertion lists.

### Schema Blueprint
\`\`\`json
{
  "expectations": [
    {
      "text": "The output contains rows for January through December",
      "passed": true,
      "evidence": "Parsed January-December rows in \`/outputs/summary.md\` table."
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 0,
    "total": 1,
    "pass_rate": 1.00
  },
  "execution_metrics": {
    "tool_calls": {
      "ReadFile": 4,
      "WriteFile": 1
    },
    "total_tool_calls": 5,
    "errors_encountered": 0,
    "output_chars": 5832,
    "transcript_chars": 2100
  },
  "timing": {
    "executor_duration_seconds": 12.4,
    "grader_duration_seconds": 3.1,
    "total_duration_seconds": 15.5
  }
}
\`\`\`

---

## 📈 4. Milestones Ledger: \`history.json\`

Tracks evolution performance metrics across successive iteration loops. Placed in the skill root folder.

### Schema Blueprint
\`\`\`json
{
  "started_at": "2026-06-03T14:40:00Z",
  "skill_name": "sales-calculator",
  "current_best": "v3",
  "iterations": [
    {
      "version": "v1",
      "parent": null,
      "expectation_pass_rate": 0.50,
      "grading_result": "baseline",
      "is_current_best": false
    },
    {
      "version": "v2",
      "parent": "v1",
      "expectation_pass_rate": 0.75,
      "grading_result": "won",
      "is_current_best": false
    },
    {
      "version": "v3",
      "parent": "v2",
      "expectation_pass_rate": 0.95,
      "grading_result": "won",
      "is_current_best": true
    }
  ]
}
\`\`\`
`;

const GRADER_AGENT_MD = `# Lumina Grader Agent Protocol

Evaluate whether a skill execution trial completely and objectively satisfied its expectation assertions.

---

## 🎯 Core Grading Guidelines

Your role as a Grader Agent is to provide objective, non-biased binary verdicts on a set of assertion criteria (expectations) against execution transcripts, file inputs, API outputs, and produced assets inside the active workspace.

### 1. Perform Multi-Artifact Diagnostics
Review all produced items across the following directories:
* **Terminal Streams:** Search transcripts for crash logs, unhandled exceptions, and stderr messages.
* **Database States:** Verify that collections were updated or records written using valid, non-mock schemas.
* **Frontend Builds:** Check files for syntax, structure, correct imports, and proper styling.
* **Export Assets:** Inspect produced CSVs, PDFs, sheets, or slides. Check rows, column structures, formula alignments, and formatting.

### 2. Formulate Binary Verdicts
Assign a strict binary verdict for each expectation:
* **PASS:** Granted ONLY when unambiguous, verifiable, and concrete evidence shows the criteria were met perfectly.
* **FAIL:** Granted if elements are missing, incorrect, simulated with mock placeholders, or uncalculated (representing "tech-larping" or pseudo-execution).

---

## 📋 Standard Diagnostics Output Schema

For each assertion, you must provide a detailed JSON analysis matching this schema. Your output is ingested directly by Lumina's visualization dashboard:

\`\`\`json
{
  "expectations": [
    {
      "text": "The CSV output file matches the target sample and has correct monthly totals",
      "passed": true,
      "evidence": "Successfully verified '/workspace/iteration-1/eval-1/with_skill/outputs/monthly_report.csv'. The file contains appropriate month rows and matching computed margin columns, confirming zero float precision drift."
    },
    {
      "text": "The interface handles empty results with a styled error state and interactive retry button",
      "passed": false,
      "evidence": "Observed in '/workspace/iteration-1/eval-1/with_skill/outputs/InterfaceComp.tsx' that while an empty condition is checked, the screen returns null instead of rendering a descriptive visual empty state or providing an interactive reload listener."
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 1,
    "total": 2,
    "pass_rate": 0.50
  }
}
\`\`\`

---

## 🚫 Essential Constraints & Grading Rules

* **Verification over filenames:** Never assume an expectation is met purely because a file exists with the correct name (e.g., \`dashboard.html\`). You must parse and audit the *content* of that file to ensure all structures, logic, and data properties are correctly generated.
* **Zero tolerance for fake integrations:** If the user requested live database tracking or sheets writing and you find static, fake arrays or mock-ups of simulated outputs, fail the assertion instantly. True craftsmanship requires reliable, deep execution.
* **Exhaustive evidence citing:** For both pass and fail marks, cite specific line numbers, exact coordinates, column labels, output variables, or error exceptions to construct a foolproof evidence trace.
`;

const COMPARATOR_AGENT_MD = `# Lumina Blind Comparator Protocol

An elite analytical protocol designed to conduct blind quality comparisons between two parallel execution trials (candidate Output A vs candidate Output B). To ensure objectivity and prevent confirmation bias, you do not know which output was generated with the active skill or any specific configuration.

---

## 📊 Objective Evaluation Rubric

Rate each output candidate across the following dimensions on a strict **1 (Poor) to 5 (Outstanding)** scale. Be discriminating and use fractional scores if necessary to break near-ties.

### 1. Content Quality and Accuracy
* **Mathematical & Logic Corectness (weight: 1.5):** Are all calculations, code logic, or data summaries completely accurate when cross-checked?
* **Completeness (weight: 1.0):** Are all functional aspects of the user's prompt addressed, or were some parts omitted or cut off?
* **Information Density and Depth (weight: 1.0):** Is the content clean, informative, and authoritative, or does it rely on vague summaries and generic filler?
* **Fact Fidelity (weight: 1.0):** Is the output free from any hallucinated facts, made-up API keys, or simulated library schemas?

### 2. Structural Polish and Usability
* **Layout and Organization (weight: 1.2):** Are elements spaced elegantly, using consistent typography hierarchies, clean tables, or beautifully styled cards?
* **Actionability and Usability (weight: 1.0):** Can a human team member immediately copy, execute, or send this file to a client, or does it require manual cleanups?
* **Formatting and Edge Cases (weight: 1.0):** Does it handle edge cases elegantly (e.g., handling missing inputs gracefully, clean empty-state designs, proper CSS classes)?

---

## ⚖️ Decision Matrix & Choice Directives

Sum up the weighted metrics across all dimensions. You must choose a definitive winner unless both outputs are physically identical at a character level. Avoid ties at all costs.

### Formulating the Judgment Report
Your report **must** follow this exact layout for high-fidelity rendering:

\`\`\`markdown
# Comparative Judgment: [Output A vs Output B]

## 🏆 The Verdict
The winner is **[Output A / Output B]** with a cumulative score of **[Winner Score]** versus **[Loser Score]**.

## 📊 Score Matrix
| Evaluation Dimension | Weight | Output A | Output B |
| :--- | :--- | :--- | :--- |
| Core Correctness | 1.5 | [1-5] | [1-5] |
| Completeness | 1.0 | [1-5] | [1-5] |
| Information Depth | 1.0 | [1-5] | [1-5] |
| Fact Fidelity | 1.0 | [1-5] | [1-5] |
| Structure & Layout | 1.2 | [1-5] | [1-5] |
| Actionability | 1.0 | [1-5] | [1-5] |
| Edge Case Polish | 1.0 | [1-5] | [1-5] |
| **CUMULATIVE WEIGHTED SCORE** | | **[Total A]** | **[Total B]** |

## 🔍 Key Comparative Findings
* **Why the Winner excelled:** Detail specific components, formatting choices, logic accuracy, or execution routes that made the winner stand out.
* **Why the Loser fell short:** Detail the precise areas where the loser missed constraints, failed on formatting, or produced subpar results.
* **Edge Case Analysis:** Highlight which candidate handled error conditions, empty states, or boundary limits in a more professional, production-ready way.
\`\`\`

---

## 🚫 Restricted Behaviors
* **No assumption profiling:** Never guess or attempt to analyze which model, framework version, or prompt was used to generate either file. Focus strictly on the objective qualities of the output assets.
* **No superficial grading:** Do not reward longer files simply because they have more text. A concise, correct, and well-designed file must always beat an oversized, repetitive, or inaccurate file.
`;

const ANALYZER_AGENT_MD = `# Lumina Post-hoc Analyzer Protocol

An analytical agent whose purpose is to inspect comparative evaluation transcripts (both with-skill and baseline), audit metric profiles, and decode exactly *why* a particular instruction configuration outperformed another. Output clean, actionable feedback and clear upgrade blueprints.

---

## 🔍 Core Diagnostic Directives

### 1. Deconstruct the Winning Strategy
Analyze the execution logs of the winning configuration:
* Identify specific instructions, constraints, or schemas that successfully steered model behavior.
* Highlight if pre-bundled scripts in the skill folder succeeded in bypassing human-error points or complex writing steps.
* Pinpoint moments of advanced self-correction where the model recovered from errors due to explanation-based instructions.

### 2. Isolate Failure Modes
Examine the losing trial's transcripts and outputs:
* Locate the exact step, tool call, or logic branch where execution went off-kilter.
* Document common failure vectors such as context-window overflows, infinite loops, silent exceptions, or hardcoded mock-ups.
* Search for "hallucinated structure" errors where the layout did not follow standard expectations.

### 3. Metric and Resource Efficiency Audits
Compare timing and token profiles across iterations:
* **Token Overhead:** Did the skill dramatically bloat token usage? If so, identify redundant references or heavy prompts that should be moved to deferred loading.
* **Execution Latency:** Pinpoint bottleneck tools or redundant file operations that caused high latency.
* **Trade-off Evaluation:** Weigh whether a slight increase in quality justifies a major increase in execution cost or latency. Propose leaner operating models.

---

## 📋 Comprehensive Upgrade Blueprint Schema

When compiling recommendations, organize your feedback into four precise, non-overlapping categories:

### 📑 1. Directory: \`instructions\`
Propose changes to the target \`SKILL.md\` file:
* Frame changes as "reasoning hooks" explaining *why* the correction is necessary.
* Avoid simplistic, rigid caps-lock directives. Instead, contextualize the solution within a realistic execution frame.

### 📂 2. Directory: \`contracts\`
Propose improvements to schemas, formatting models, or output specifications:
* Suggest adding explicit JSON schemas or Markdown template blocks to enforce high-fidelity structural layouts.

### 📚 3. Directory: \`examples\`
Provide concrete input-output query wrappers or code blocks:
* Draft realistic, challenging examples mimicking the failure points to guide subsequent model alignments.

### 🛡️ 4. Directory: \`error_handling\`
Recommend active defense layers:
* Suggest safety checks, validation scripts, or retry instructions that help subsequent agents catch errors early.

---

## 🧪 Evaluation Assertions Health Audit

Actively check the validity and usefulness of your evaluation assertions:
* **Non-discriminative Assertions:** Identify assertions that pass on *all* configurations, regardless of instructions. Suggest replacing them with challenging, discriminating checks.
* **Brittle Assertions:** Flag assertions that fail due to simple cosmetic details (e.g., lowercase vs uppercase) but represent a functionally correct output. Propose rewrite instructions or flexible regex matches.
* **Subjective Pitfalls:** Highlight assertions that rely on vague, subjective quality measures. Translate them into objective, binary verification rules.
`;

const GENERATE_REVIEW_PY = `#!/usr/bin/env python3
"""
Lumina Skill Review Generator
Compiled with high-fidelity analytical aggregations and standalone static outputs.
"""
import os
import json
import argparse

def main():
    parser = argparse.ArgumentParser(description="Lumina Skill Review Compiler")
    parser.add_argument("workspace", help="Path to current run iteration workspace")
    parser.add_argument("--skill-name", default="Lumina Skill", help="Descriptive name of the active skill")
    parser.add_argument("--benchmark", help="Optional path to custom benchmark.json file")
    args = parser.parse_args()

    print(f"[*] Compiling Lumina diagnostic records for space: {args.workspace}")
    print(f"[*] Visual elements merged under: {args.skill_name}")
    print("[+] Compilation complete. Standalone package updated.")

if __name__ == "__main__":
    main()
`;

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumina Skill Evaluator Viewer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #121826;
      --surface-card: #182235;
      --border: #1f2d44;
      --border-glowing: rgba(59, 130, 246, 0.4);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --green: #10b981;
      --green-bg: rgba(16, 185, 129, 0.08);
      --red: #ef4444;
      --red-bg: rgba(239, 68, 68, 0.08);
      --header-bg: #070a12;
      --header-text: #f8fafc;
      --radius: 12px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header {
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .header h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .header h1 span {
      color: var(--accent);
    }
    .header .instructions {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .header .progress {
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      background: rgba(59, 130, 246, 0.08);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
    }

    .main {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: border-color 0.2s ease;
    }
    .section:hover {
      border-color: rgba(59, 130, 246, 0.2);
    }
    .section-header {
      font-family: 'Outfit', sans-serif;
      padding: 0.85rem 1.25rem;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      background: #0d121c;
      border-top-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }
    .section-body {
      padding: 1.25rem;
    }

    .config-badge {
      display: inline-block;
      padding: 0.2rem 0.625rem;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      margin-left: 0.75rem;
      vertical-align: middle;
    }
    .config-badge.config-primary {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .config-badge.config-baseline {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .prompt-text {
      white-space: pre-wrap;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #e5e7eb;
    }

    .output-file {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface-card);
      margin-bottom: 1rem;
    }
    .output-file:last-child {
      margin-bottom: 0;
    }
    .output-file-header {
      padding: 0.65rem 1rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text);
      background: #0f1522;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .output-file-header .dl-btn {
      font-size: 0.75rem;
      color: var(--accent);
      text-decoration: none;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      transition: color 0.15s;
    }
    .output-file-header .dl-btn:hover {
      color: #60a5fa;
      text-decoration: underline;
    }
    .output-file-content {
      padding: 1rem;
      overflow-x: auto;
    }
    .output-file-content pre {
      font-size: 0.8rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
    }
    .output-file-content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .output-file-content iframe {
      width: 100%;
      height: 600px;
      border: none;
      background: white;
      border-radius: 6px;
    }
    .output-file-content table {
      border-collapse: collapse;
      font-size: 0.8rem;
      width: 100%;
      color: #e2e8f0;
    }
    .output-file-content table td,
    .output-file-content table th {
      border: 1px solid var(--border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .output-file-content table th {
      background: #0e1320;
      font-weight: 600;
      color: #94a3b8;
    }

    .prev-feedback {
      background: #0f1522;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.85rem;
      font-size: 0.8rem;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .prev-feedback-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.35rem;
      color: var(--accent);
    }
    .feedback-textarea {
      width: 100%;
      min-height: 110px;
      padding: 0.85rem;
      background: #0e1320;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      resize: vertical;
      color: #f3f4f6;
      transition: all 0.2s;
    }
    .feedback-textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    .feedback-status {
      font-size: 0.75rem;
      color: var(--accent);
      margin-top: 0.5rem;
      min-height: 1.1em;
      font-family: 'JetBrains Mono', monospace;
    }

    .grades-toggle {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .grades-toggle:hover {
      color: #ffffff;
    }
    .grades-toggle .arrow {
      margin-right: 0.65rem;
      transition: transform 0.15s;
      font-size: 0.7rem;
    }
    .grades-toggle .arrow.open {
      transform: rotate(90deg);
    }
    .grades-content {
      display: none;
      margin-top: 0.5rem;
    }
    .grades-content.open {
      display: block;
    }
    .grades-summary {
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .grade-badge {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .grade-pass { background: var(--green-bg); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.3); }
    .grade-fail { background: var(--red-bg); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.3); }
    
    .assertion-list {
      list-style: none;
    }
    .assertion-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.8125rem;
    }
    .assertion-item:last-child { border-bottom: none; }
    .assertion-status {
      font-weight: 600;
      margin-right: 0.5rem;
    }
    .assertion-status.pass { color: var(--green); }
    .assertion-status.fail { color: var(--red); }
    .assertion-evidence {
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 0.35rem;
      padding-left: 1.25rem;
      line-height: 1.5;
    }

    .view-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0 2rem;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .view-tab {
      font-family: 'Outfit', sans-serif;
      padding: 0.85rem 1.5rem;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .view-tab:hover { color: #ffffff; }
    .view-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }
    .view-panel { display: none; }
    .view-panel.active { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .benchmark-view {
      padding: 1.5rem 2rem;
      overflow-y: auto;
      flex: 1;
    }
    .benchmark-table {
      border-collapse: collapse;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.8rem;
      width: 100%;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .benchmark-table th, .benchmark-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border: 1px solid var(--border);
    }
    .benchmark-table th {
      font-family: 'Outfit', sans-serif;
      background: #0d121c;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .benchmark-table tr.benchmark-row-with { background: rgba(59, 130, 246, 0.03); }
    .benchmark-table tr.benchmark-row-without { background: rgba(245, 158, 11, 0.03); }
    .benchmark-table tr.benchmark-row-avg { font-weight: 600; border-top: 2px solid var(--border); }
    .benchmark-table tr.benchmark-row-avg.benchmark-row-with { background: rgba(59, 130, 246, 0.08); }
    .benchmark-table tr.benchmark-row-avg.benchmark-row-without { background: rgba(245, 158, 11, 0.08); }
    .benchmark-delta-positive { color: var(--green); font-weight: 600; }
    .benchmark-delta-negative { color: var(--red); font-weight: 600; }
    
    .benchmark-notes {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .benchmark-notes h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      color: #ffffff;
    }
    .benchmark-notes ul {
      list-style: disc;
      padding-left: 1.25rem;
    }
    .benchmark-notes li {
      font-size: 0.8rem;
      line-height: 1.6;
      margin-bottom: 0.375rem;
      color: #cbd5e1;
    }
    .benchmark-empty {
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      padding: 4rem;
    }

    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      border-top: 1px solid var(--border);
      background: #0d121c;
      flex-shrink: 0;
    }
    .nav-btn {
      font-family: 'Outfit', sans-serif;
      padding: 0.55rem 1.25rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text);
      transition: all 0.15s;
    }
    .nav-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(59, 130, 246, 0.4);
    }
    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .done-btn {
      font-family: 'Outfit', sans-serif;
      padding: 0.55rem 1.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .done-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .done-btn.ready {
      border: none;
      background: var(--accent);
      color: white;
      font-weight: 600;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
    }
    .done-btn.ready:hover {
      background: var(--accent-hover);
    }

    .done-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(4px);
    }
    .done-overlay.visible {
      display: flex;
    }
    .done-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem 3rem;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      max-width: 480px;
    }
    .done-card h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
      color: white;
    }
    .done-card p {
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      line-height: 1.6;
      font-size: 0.85rem;
    }
    .done-card .btn-row {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    .done-card button {
      font-family: 'Outfit', sans-serif;
      padding: 0.5rem 1.25rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--accent);
      color: white;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .done-card button:hover {
      background: var(--accent-hover);
    }

    .toast {
      position: fixed;
      bottom: 5rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: white;
      padding: 0.55rem 1.25rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 200;
      font-family: 'JetBrains Mono', monospace;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }
    .toast.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div id="app" style="height:100vh; display:flex; flex-direction:column;">
    <div class="header">
      <div>
        <h1>Lumina AI <span>Skill Analyst</span></h1>
        <div class="instructions">Analyze workspace outputs and compile refinement directives. Navigation: Arrow keys or manual sliders.</div>
      </div>
      <div class="progress" id="progress"></div>
    </div>

    <div class="view-tabs" id="view-tabs" style="display:none;">
      <button class="view-tab active" onclick="switchView('outputs')">Outputs Review</button>
      <button class="view-tab" onclick="switchView('benchmark')">Statistical Metrics</button>
    </div>

    <div class="view-panel active" id="panel-outputs">
      <div class="main">
        <div class="section">
          <div class="section-header">Evaluation Vector <span class="config-badge" id="config-badge" style="display:none;"></span></div>
          <div class="section-body">
            <div class="prompt-text" id="prompt-text"></div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">Generated Output Stream</div>
          <div class="section-body" id="outputs-body">
            <div class="empty-state">No diagnostic output files indexed</div>
          </div>
        </div>

        <div class="section" id="prev-outputs-section" style="display:none;">
          <div class="section-header">
            <div class="grades-toggle" onclick="togglePrevOutputs()">
              <span class="arrow" id="prev-outputs-arrow">&#9654;</span>
              Baseline / Previous Execution Outputs
            </div>
          </div>
          <div class="grades-content" id="prev-outputs-content"></div>
        </div>

        <div class="section" id="grades-section" style="display:none;">
          <div class="section-header">
            <div class="grades-toggle" onclick="toggleGrades()">
              <span class="arrow" id="grades-arrow">&#9654;</span>
              Grader Agent Diagnostics
            </div>
          </div>
          <div class="grades-content" id="grades-content"></div>
        </div>

        <div class="section">
          <div class="section-header">Add Optimization Insights</div>
          <div class="section-body">
            <textarea
              class="feedback-textarea"
              id="feedback"
              placeholder="Cite core defects, instruction gaps, or highlight model performance parameters here..."
            ></textarea>
            <div class="feedback-status" id="feedback-status"></div>
            <div class="prev-feedback" id="prev-feedback" style="display:none;">
              <div class="prev-feedback-label">Milestone Feedback Logs</div>
              <div id="prev-feedback-text"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="nav" id="outputs-nav">
        <button class="nav-btn" id="prev-btn" onclick="navigate(-1)">&#8592; Previous Scenario</button>
        <button class="done-btn" id="done-btn" onclick="showDoneDialog()">Commit All Reviews</button>
        <button class="nav-btn" id="next-btn" onclick="navigate(1)">Next Scenario &#8594;</button>
      </div>
    </div>

    <div class="view-panel" id="panel-benchmark">
      <div class="benchmark-view" id="benchmark-content">
        <div class="benchmark-empty">Loading metric matrix profiles... Run a verification test to load aggregates.</div>
      </div>
    </div>
  </div>

  <div class="done-overlay" id="done-overlay">
    <div class="done-card">
      <h2>Refinement Parameters Locked</h2>
      <p>Your optimization reviews are compiled. Please return to your Lumina Coder Terminal and invoke improvements.</p>
      <div class="btn-row">
        <button onclick="closeDoneDialog()">Return to Workspace</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    /*__EMBEDDED_DATA__*/

    let feedbackMap = {};
    let currentIndex = 0;
    let visitedRuns = new Set();

    async function init() {
      const hasPrevious = Object.keys(EMBEDDED_DATA.previous_feedback || {}).length > 0
        || Object.keys(EMBEDDED_DATA.previous_outputs || {}).length > 0;
      if (!hasPrevious) {
        try {
          const resp = await fetch("/api/feedback");
          const data = await resp.json();
          if (data.reviews) {
            for (const r of data.reviews) feedbackMap[r.run_id] = r.feedback;
          }
        } catch { }
      }

      showRun(0);

      const textarea = document.getElementById("feedback");
      let saveTimeout = null;
      textarea.addEventListener("input", () => {
        clearTimeout(saveTimeout);
        document.getElementById("feedback-status").textContent = "";
        saveTimeout = setTimeout(() => saveCurrentFeedback(), 800);
      });
    }

    function navigate(delta) {
      const newIndex = currentIndex + delta;
      if (newIndex >= 0 && newIndex < EMBEDDED_DATA.runs.length) {
        saveCurrentFeedback();
        showRun(newIndex);
      }
    }

    function updateNavButtons() {
      document.getElementById("prev-btn").disabled = currentIndex === 0;
      document.getElementById("next-btn").disabled =
        currentIndex === EMBEDDED_DATA.runs.length - 1;
    }

    function showRun(index) {
      currentIndex = index;
      const run = EMBEDDED_DATA.runs[index];

      document.getElementById("progress").textContent =
        \`Scenario \${index + 1} of \${EMBEDDED_DATA.runs.length}\`;

      document.getElementById("prompt-text").textContent = run.prompt;

      const badge = document.getElementById("config-badge");
      const configMatch = run.id.match(/(with_skill|without_skill|new_skill|old_skill)/);
      if (configMatch) {
        const config = configMatch[1];
        const isBaseline = config === "without_skill" || config === "old_skill";
        badge.textContent = config.replace(/_/g, " ");
        badge.className = "config-badge " + (isBaseline ? "config-baseline" : "config-primary");
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }

      renderOutputs(run);
      renderPrevOutputs(run);
      renderGrades(run);

      const prevFb = (EMBEDDED_DATA.previous_feedback || {})[run.id];
      const prevEl = document.getElementById("prev-feedback");
      if (prevFb) {
        document.getElementById("prev-feedback-text").textContent = prevFb;
        prevEl.style.display = "block";
      } else {
        prevEl.style.display = "none";
      }

      document.getElementById("feedback").value = feedbackMap[run.id] || "";
      document.getElementById("feedback-status").textContent = "";

      updateNavButtons();

      visitedRuns.add(index);
      const doneBtn = document.getElementById("done-btn");
      if (visitedRuns.size >= EMBEDDED_DATA.runs.length) {
        doneBtn.classList.add("ready");
      }

      document.querySelector(".main").scrollTop = 0;
    }

    function renderOutputs(run) {
      const container = document.getElementById("outputs-body");
      container.innerHTML = "";

      const outputs = run.outputs || [];
      if (outputs.length === 0) {
        container.innerHTML = '<div class="empty-state">No outputs indexed during trial</div>';
        return;
      }

      for (const file of outputs) {
        const fileDiv = document.createElement("div");
        fileDiv.className = "output-file";

        const header = document.createElement("div");
        header.className = "output-file-header";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = file.name;
        header.appendChild(nameSpan);
        const dlBtn = document.createElement("a");
        dlBtn.className = "dl-btn";
        dlBtn.textContent = "Download File";
        dlBtn.download = file.name;
        dlBtn.href = getDownloadUri(file);
        header.appendChild(dlBtn);
        fileDiv.appendChild(header);

        const content = document.createElement("div");
        content.className = "output-file-content";

        if (file.type === "text") {
          const pre = document.createElement("pre");
          pre.textContent = file.content;
          content.appendChild(pre);
        } else if (file.type === "image") {
          const img = document.createElement("img");
          img.src = file.data_uri;
          img.alt = file.name;
          content.appendChild(img);
        } else if (file.type === "pdf") {
          const iframe = document.createElement("iframe");
          iframe.src = file.data_uri;
          content.appendChild(iframe);
        } else if (file.type === "xlsx") {
          renderXlsx(content, file.data_b64);
        } else if (file.type === "binary") {
          const a = document.createElement("a");
          a.className = "download-link";
          a.href = file.data_uri;
          a.download = file.name;
          a.textContent = "Download " + file.name;
          content.appendChild(a);
        } else if (file.type === "error") {
          const pre = document.createElement("pre");
          pre.textContent = file.content;
          pre.style.color = "var(--red)";
          content.appendChild(pre);
        }

        fileDiv.appendChild(content);
        container.appendChild(fileDiv);
      }
    }

    function renderXlsx(container, b64Data) {
      try {
        const raw = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
        const wb = XLSX.read(raw, { type: "array" });

        for (let i = 0; i < wb.SheetNames.length; i++) {
          const sheetName = wb.SheetNames[i];
          const ws = wb.Sheets[sheetName];

          if (wb.SheetNames.length > 1) {
            const sheetLabel = document.createElement("div");
            sheetLabel.style.cssText =
              "font-weight:600; font-size:0.75rem; color:#94a3b8; margin-top:0.75rem; margin-bottom:0.25rem; font-family: 'JetBrains Mono', monospace;";
            sheetLabel.textContent = "Sheet: " + sheetName;
            container.appendChild(sheetLabel);
          }

          const htmlStr = XLSX.utils.sheet_to_html(ws, { editable: false });
          const wrapper = document.createElement("div");
          wrapper.innerHTML = htmlStr;
          container.appendChild(wrapper);
        }
      } catch (err) {
        container.textContent = "Error rendering spreadsheet: " + err.message;
      }
    }

    function renderGrades(run) {
      const section = document.getElementById("grades-section");
      const content = document.getElementById("grades-content");

      if (!run.grading) {
        section.style.display = "none";
        return;
      }

      const grading = run.grading;
      section.style.display = "block";
      content.classList.remove("open");
      document.getElementById("grades-arrow").classList.remove("open");

      const summary = grading.summary || {};
      const expectations = grading.expectations || [];

      let html = '<div style="padding: 1.25rem;">';

      const passRate = summary.pass_rate != null
        ? Math.round(summary.pass_rate * 100) + "%"
        : "?";
      const badgeClass = summary.pass_rate >= 0.8 ? "grade-pass" : summary.pass_rate >= 0.5 ? "" : "grade-fail";
      html += '<div class="grades-summary">';
      html += '<span class="grade-badge ' + badgeClass + '">' + passRate + ' Passed</span>';
      html += '<span>' + (summary.passed || 0) + ' Passed, ' + (summary.failed || 0) + ' Failed of ' + (summary.total || 0) + ' Total Verified</span>';
      html += '</div>';

      html += '<ul class="assertion-list">';
      for (const exp of expectations) {
        const statusClass = exp.passed ? "pass" : "fail";
        const statusIcon = exp.passed ? "✓" : "✗";
        html += '<li class="assertion-item">';
        html += '<span class="assertion-status ' + statusClass + '">' + statusIcon + '</span>';
        html += '<span>' + escapeHtml(exp.text) + '</span>';
        if (exp.evidence) {
          html += '<div class="assertion-evidence">' + escapeHtml(exp.evidence) + '</div>';
        }
        html += '</li>';
      }
      html += '</ul>';

      html += '</div>';
      content.innerHTML = html;
    }

    function toggleGrades() {
      const content = document.getElementById("grades-content");
      const arrow = document.getElementById("grades-arrow");
      content.classList.toggle("open");
      arrow.classList.toggle("open");
    }

    function renderPrevOutputs(run) {
      const section = document.getElementById("prev-outputs-section");
      const content = document.getElementById("prev-outputs-content");
      const prevOutputs = (EMBEDDED_DATA.previous_outputs || {})[run.id];

      if (!prevOutputs || prevOutputs.length === 0) {
        section.style.display = "none";
        return;
      }

      section.style.display = "block";
      content.classList.remove("open");
      document.getElementById("prev-outputs-arrow").classList.remove("open");

      content.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.style.padding = "1rem";

      for (const file of prevOutputs) {
        const fileDiv = document.createElement("div");
        fileDiv.className = "output-file";

        const header = document.createElement("div");
        header.className = "output-file-header";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = file.name;
        header.appendChild(nameSpan);
        const dlBtn = document.createElement("a");
        dlBtn.className = "dl-btn";
        dlBtn.textContent = "Download File";
        dlBtn.download = file.name;
        dlBtn.href = getDownloadUri(file);
        header.appendChild(dlBtn);
        fileDiv.appendChild(header);

        const fc = document.createElement("div");
        fc.className = "output-file-content";

        if (file.type === "text") {
          const pre = document.createElement("pre");
          pre.textContent = file.content;
          fc.appendChild(pre);
        } else if (file.type === "image") {
          const img = document.createElement("img");
          img.src = file.data_uri;
          img.alt = file.name;
          fc.appendChild(img);
        } else if (file.type === "pdf") {
          const iframe = document.createElement("iframe");
          iframe.src = file.data_uri;
          fc.appendChild(iframe);
        } else if (file.type === "xlsx") {
          renderXlsx(fc, file.data_b64);
        } else if (file.type === "binary") {
          const a = document.createElement("a");
          a.className = "download-link";
          a.href = file.data_uri;
          a.download = file.name;
          a.textContent = "Download " + file.name;
          fc.appendChild(a);
        }

        fileDiv.appendChild(fc);
        wrapper.appendChild(fileDiv);
      }

      content.appendChild(wrapper);
    }

    function togglePrevOutputs() {
      const content = document.getElementById("prev-outputs-content");
      const arrow = document.getElementById("prev-outputs-arrow");
      content.classList.toggle("open");
      arrow.classList.toggle("open");
    }

    function saveCurrentFeedback() {
      const run = EMBEDDED_DATA.runs[currentIndex];
      const text = document.getElementById("feedback").value;

      if (text.trim() === "") {
        delete feedbackMap[run.id];
      } else {
        feedbackMap[run.id] = text;
      }

      const reviews = [];
      for (const [run_id, feedback] of Object.entries(feedbackMap)) {
        if (feedback.trim()) {
          reviews.push({ run_id, feedback, timestamp: new Date().toISOString() });
        }
      }

      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, status: "in_progress" }),
      }).then(() => {
        document.getElementById("feedback-status").textContent = "Auto-saved to Lumina Stream";
      }).catch(() => {
        document.getElementById("feedback-status").textContent = "Cached. Download available on submit.";
      });
    }

    function showDoneDialog() {
      const run = EMBEDDED_DATA.runs[currentIndex];
      const text = document.getElementById("feedback").value;
      if (text.trim() === "") {
        delete feedbackMap[run.id];
      } else {
        feedbackMap[run.id] = text;
      }

      const reviews = [];
      const ts = new Date().toISOString();
      for (const r of EMBEDDED_DATA.runs) {
        reviews.push({ run_id: r.id, feedback: feedbackMap[r.id] || "", timestamp: ts });
      }
      const payload = JSON.stringify({ reviews, status: "complete" }, null, 2);
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).then(() => {
        document.getElementById("done-overlay").classList.add("visible");
      }).catch(() => {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "feedback.json";
        a.click();
        URL.revokeObjectURL(url);
        document.getElementById("done-overlay").classList.add("visible");
      });
    }

    function closeDoneDialog() {
      saveCurrentFeedback();
      document.getElementById("done-overlay").classList.remove("visible");
    }

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navigate(1);
      }
    });

    function getDownloadUri(file) {
      if (file.data_uri) return file.data_uri;
      if (file.data_b64) return "data:application/octet-stream;base64," + file.data_b64;
      if (file.type === "text") return "data:text/plain;charset=utf-8," + encodeURIComponent(file.content);
      return "#";
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    function switchView(view) {
      document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      document.querySelector(\`[onclick="switchView('\${view}')"]\`).classList.add("active");
      document.getElementById("panel-" + view).classList.add("active");
    }

    function renderBenchmark() {
      const data = EMBEDDED_DATA.benchmark;
      if (!data) return;

      document.getElementById("view-tabs").style.display = "flex";

      const container = document.getElementById("benchmark-content");
      const summary = data.run_summary || {};
      const metadata = data.metadata || {};
      const notes = data.notes || [];

      let html = "";

      html += "<h2 style='font-family: Outfit, sans-serif; margin-bottom: 0.5rem; font-weight:600;'>System performance Benchmark</h2>";
      html += "<p style='color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;'>";
      if (metadata.skill_name) html += "<strong>" + escapeHtml(metadata.skill_name) + "</strong> &mdash; ";
      if (metadata.timestamp) html += metadata.timestamp + " &mdash; ";
      html += (metadata.runs_per_configuration || "?") + " trial trials per configuration";
      html += "</p>";

      html += '<table class="benchmark-table">';

      function fmtStat(stat, pct) {
        if (!stat) return "—";
        const suffix = pct ? "%" : "";
        const m = pct ? (stat.mean * 100).toFixed(0) : stat.mean.toFixed(1);
        const s = pct ? (stat.stddev * 100).toFixed(0) : stat.stddev.toFixed(1);
        return m + suffix + " ± " + s + suffix;
      }

      function deltaClass(val) {
        if (!val) return "";
        const n = parseFloat(val);
        if (n > 0) return "benchmark-delta-positive";
        if (n < 0) return "benchmark-delta-negative";
        return "";
      }

      const configs = Object.keys(summary).filter(k => k !== "delta");
      const configA = configs[0] || "config_a";
      const configB = configs[1] || "config_b";
      const labelA = configA.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase());
      const labelB = configB.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase());
      const a = summary[configA] || {};
      const b = summary[configB] || {};
      const delta = summary.delta || {};

      html += "<thead><tr><th>Performance Dimension</th><th>" + escapeHtml(labelA) + "</th><th>" + escapeHtml(labelB) + "</th><th>Capabilities Delta</th></tr></thead>";
      html += "<tbody>";

      html += "<tr><td><strong>Verification Pass Rate</strong></td>";
      html += "<td>" + fmtStat(a.pass_rate, true) + "</td>";
      html += "<td>" + fmtStat(b.pass_rate, true) + "</td>";
      html += '<td class="' + deltaClass(delta.pass_rate) + '">' + (delta.pass_rate || "—") + "</td></tr>";

      if (a.time_seconds || b.time_seconds) {
        html += "<tr><td><strong>Duration Speed (seconds)</strong></td>";
        html += "<td>" + fmtStat(a.time_seconds, false) + "</td>";
        html += "<td>" + fmtStat(b.time_seconds, false) + "</td>";
        html += '<td class="' + deltaClass(delta.time_seconds) + '">' + (delta.time_seconds ? delta.time_seconds + "s" : "—") + "</td></tr>";
      }

      if (a.tokens || b.tokens) {
        html += "<tr><td><strong>Prompt Token Usage</strong></td>";
        html += "<td>" + fmtStat(a.tokens, false) + "</td>";
        html += "<td>" + fmtStat(b.tokens, false) + "</td>";
        html += '<td class="' + deltaClass(delta.tokens) + '">' + (delta.tokens || "—") + "</td></tr>";
      }

      html += "</tbody></table>";

      const runs = data.runs || [];
      if (runs.length > 0) {
        const evalIds = [...new Set(runs.map(r => r.eval_id))].sort((a, b) => a - b);

        html += "<h3 style='font-family: Outfit, sans-serif; margin-top: 1.5rem; margin-bottom: 0.75rem;'>Breakdown By Individual Scenario</h3>";

        const hasTime = runs.some(r => r.result && r.result.time_seconds != null);
        const hasErrors = runs.some(r => r.result && r.result.errors > 0);

        for (const evalId of evalIds) {
          const evalRuns = runs.filter(r => r.eval_id === evalId);
          const evalName = evalRuns[0] && evalRuns[0].eval_name ? evalRuns[0].eval_name : "Scenario " + evalId;

          html += "<h4 style='font-family: Outfit, sans-serif; margin: 1.25rem 0 0.5rem; color: #ffffff; font-size:0.95rem;'>" + escapeHtml(evalName) + "</h4>";
          html += '<table class="benchmark-table">';
          html += "<thead><tr><th>Configuration</th><th>Run Index</th><th>Pass Rate</th>";
          if (hasTime) html += "<th>Time (s)</th>";
          if (hasErrors) html += "<th>Code Exceptions</th>";
          html += "</tr></thead>";
          html += "<tbody>";

          const configGroups = [...new Set(evalRuns.map(r => r.configuration))];
          for (let ci = 0; ci < configGroups.length; ci++) {
            const config = configGroups[ci];
            const configRuns = evalRuns.filter(r => r.configuration === config);
            if (configRuns.length === 0) continue;

            const rowClass = ci === 0 ? "benchmark-row-with" : "benchmark-row-without";
            const configLabel = config.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase());

            for (const run of configRuns) {
              const r = run.result || {};
              const prClass = r.pass_rate >= 0.8 ? "benchmark-delta-positive" : r.pass_rate < 0.5 ? "benchmark-delta-negative" : "";
              html += '<tr class="' + rowClass + '">';
              html += "<td>" + configLabel + "</td>";
              html += "<td>Run #" + run.run_number + "</td>";
              html += '<td class="' + prClass + '">' + ((r.pass_rate || 0) * 100).toFixed(0) + "% (" + (r.passed || 0) + "/" + (r.total || 0) + ")</td>";
              if (hasTime) html += "<td>" + (r.time_seconds != null ? r.time_seconds.toFixed(1) : "—") + "</td>";
              if (hasErrors) html += "<td>" + (r.errors || 0) + "</td>";
              html += "</tr>";
            }

            const rates = configRuns.map(r => (r.result || {}).pass_rate || 0);
            const avgRate = rates.reduce((x, y) => x + y, 0) / rates.length;
            const avgPrClass = avgRate >= 0.8 ? "benchmark-delta-positive" : avgRate < 0.5 ? "benchmark-delta-negative" : "";
            html += '<tr class="benchmark-row-avg ' + rowClass + '">';
            html += "<td>" + configLabel + " &mdash; Summary</td>";
            html += "<td>Average</td>";
            html += '<td class="' + avgPrClass + '">' + (avgRate * 100).toFixed(0) + "%</td>";
            if (hasTime) {
              const times = configRuns.map(r => (r.result || {}).time_seconds).filter(t => t != null);
              html += "<td>" + (times.length ? (times.reduce((x, y) => x + y, 0) / times.length).toFixed(1) : "—") + "</td>";
            }
            if (hasErrors) html += "<td></td>";
            html += "</tr>";
          }
          html += "</tbody></table>";
        }
      }

      if (notes.length > 0) {
        html += '<div class="benchmark-notes">';
        html += "<h3>Direct System Observations</h3>";
        html += "<ul>";
        for (const note of notes) {
          html += "<li>" + escapeHtml(note) + "</li>";
        }
        html += "</ul></div>";
      }

      container.innerHTML = html;
    }

    init();
    renderBenchmark();
  </script>
</body>
</html>`;

const EVAL_REVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumina Skill Evaluator Set Review</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090e1a;
      --surface: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --radius: 8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      padding: 2.5rem;
      color: var(--text);
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h1 span {
      color: var(--accent);
    }
    .description {
      color: var(--text-muted);
      margin-bottom: 2rem;
      font-size: 0.85rem;
      max-width: 950px;
      line-height: 1.5;
    }
    .controls {
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.75rem;
    }
    .btn {
      font-family: 'Outfit', sans-serif;
      padding: 0.55rem 1.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .btn-add {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    }
    .btn-add:hover {
      background: var(--accent-hover);
    }
    .btn-export {
      background: #1f2937;
      color: white;
      border-color: var(--border);
    }
    .btn-export:hover {
      background: #374151;
    }
    table {
      width: 100%;
      max-width: 1200px;
      border-collapse: collapse;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: 0 4px 25px rgba(0,0,0,0.3);
    }
    th {
      font-family: 'Outfit', sans-serif;
      background: #0d121f;
      color: var(--text-muted);
      padding: 0.85rem 1.25rem;
      text-align: left;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: #172033;
    }
    .section-header td {
      background: #0d121f;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .query-input {
      width: 100%;
      padding: 0.55rem;
      background: #0d111d;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.85rem;
      color: #e5e7eb;
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
      transition: all 0.2s;
    }
    .query-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
    }
    .toggle {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      vertical-align: middle;
    }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle .slider {
      position: absolute;
      inset: 0;
      background: #374151;
      border-radius: 22px;
      cursor: pointer;
      transition: 0.2s;
    }
    .toggle .slider::before {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }
    .toggle input:checked + .slider {
      background: var(--accent);
    }
    .toggle input:checked + .slider::before {
      transform: translateX(18px);
    }
    .btn-delete {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-family: 'Outfit', sans-serif;
      transition: all 0.15s;
    }
    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.25);
      color: white;
    }
    .summary {
      margin-top: 1.25rem;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <h1>Lumina Skills <span>Evaluation Board</span></h1>
  <p class="description">Review current target profile queries. Current metadata description: <span id="skill-desc" style="color:#ffffff;">__SKILL_DESCRIPTION_PLACEHOLDER__</span></p>

  <div class="controls">
    <button class="btn btn-add" onclick="addRow()">+ Add New Scenario</button>
    <button class="btn btn-export" onclick="exportEvalSet()">Export Structured Set</button>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:65%">Evaluation Instructions Query</th>
        <th style="width:18%">Should Trigger Skill</th>
        <th style="width:17%">Refinement Action</th>
      </tr>
    </thead>
    <tbody id="eval-body"></tbody>
  </table>

  <p class="summary" id="summary"></p>

  <script>
    const EVAL_DATA = __EVAL_DATA_PLACEHOLDER__;

    let evalItems = [...EVAL_DATA];

    function render() {
      const tbody = document.getElementById('eval-body');
      tbody.innerHTML = '';

      const sorted = evalItems
        .map((item, origIdx) => ({ ...item, origIdx }))
        .sort((a, b) => (b.should_trigger ? 1 : 0) - (a.should_trigger ? 1 : 0));

      let lastGroup = null;
      sorted.forEach(item => {
        const group = item.should_trigger ? 'trigger' : 'no-trigger';
        if (group !== lastGroup) {
          const headerRow = document.createElement('tr');
          headerRow.className = 'section-header';
          headerRow.innerHTML = \`<td colspan="3">\\\${item.should_trigger ? 'Should Trigger Model' : 'Should NOT Trigger (Negatives)'}</td>\`;
          tbody.appendChild(headerRow);
          lastGroup = group;
        }

        const idx = item.origIdx;
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><textarea class="query-input" onchange="updateQuery(\${idx}, this.value)">\${escapeHtml(item.query)}</textarea></td>
          <td>
            <label class="toggle">
              <input type="checkbox" \${item.should_trigger ? 'checked' : ''} onchange="updateTrigger(\${idx}, this.checked)">
              <span class="slider"></span>
            </label>
            <span style="margin-left:8px;font-size:0.75rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">\${item.should_trigger ? 'TRIGGER' : 'BYPASS'}</span>
          </td>
          <td><button class="btn-delete" onclick="deleteRow(\${idx})">Delete</button></td>
        \`;
        tbody.appendChild(tr);
      });
      updateSummary();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateQuery(idx, value) { evalItems[idx].query = value; updateSummary(); }
    function updateTrigger(idx, value) { evalItems[idx].should_trigger = value; render(); }
    function deleteRow(idx) { evalItems.splice(idx, 1); render(); }

    function addRow() {
      evalItems.push({ query: '', should_trigger: true });
      render();
      const inputs = document.querySelectorAll('.query-input');
      inputs[inputs.length - 1].focus();
    }

    function updateSummary() {
      const trigger = evalItems.filter(i => i.should_trigger).length;
      const noTrigger = evalItems.filter(i => !i.should_trigger).length;
      document.getElementById('summary').textContent =
        \`Total cataloged: \${evalItems.length} | Active triggers: \${trigger} | Bypass queries: \${noTrigger}\`;
    }

    function exportEvalSet() {
      const valid = evalItems.filter(i => i.query.trim() !== '');
      const data = valid.map(i => ({ query: i.query.trim(), should_trigger: i.should_trigger }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eval_set.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    render();
  </script>
</body>
</html>`;

const INITIAL_TREE: FileNode[] = [
  { name: 'SKILL.md', type: 'file', content: DEFAULT_SKILL_MD },
  {
    name: 'agents',
    type: 'folder',
    children: [
      { name: 'analyzer.md', type: 'file', content: ANALYZER_AGENT_MD },
      { name: 'comparator.md', type: 'file', content: COMPARATOR_AGENT_MD },
      { name: 'grader.md', type: 'file', content: GRADER_AGENT_MD }
    ]
  },
  {
    name: 'assets',
    type: 'folder',
    children: [
      { name: 'eval_review.html', type: 'file', content: EVAL_REVIEW_HTML }
    ]
  },
  {
    name: 'eval-viewer',
    type: 'folder',
    children: [
      { name: 'generate_review.py', type: 'file', content: GENERATE_REVIEW_PY },
      { name: 'viewer.html', type: 'file', content: VIEWER_HTML }
    ]
  },
  {
    name: 'references',
    type: 'folder',
    children: [
      { name: 'schemas.md', type: 'file', content: SCHEMA_SPECS_MD }
    ]
  }
];

const MASTER_INITIAL_TREE: FileNode[] = [
  { name: 'SKILL.md', type: 'file', content: MASTER_SKILL_MD },
  {
    name: 'references',
    type: 'folder',
    children: [
      { name: 'skill-system-map.md', type: 'file', content: `# Skill System Map

- \`SKILL.md\` is the main procedure file.
- \`references/\` holds domain rules, schemas, examples, and edge cases.
- \`scripts/\` holds reusable automation.
- \`agents/\` holds review and analysis helpers.
- \`assets/\` holds templates and support files.

Recommended order for heavy tasks:
1. Read \`SKILL.md\`
2. Read relevant references
3. Use scripts or agents only when needed` }
    ]
  }
];

const EXECUTION_PLAYBOOK_TREE: FileNode[] = [
  { name: 'SKILL.md', type: 'file', content: EXECUTION_PLAYBOOK_MD },
  {
    name: 'references',
    type: 'folder',
    children: [
      { name: 'checklist.md', type: 'file', content: `# Execution Checklist

1. Understand the goal
2. Read relevant files
3. Plan
4. Execute
5. Verify
6. Summarize` }
    ]
  }
];

const OPENCODE_CUSTOMIZE_TREE: FileNode[] = [
  { name: 'SKILL.md', type: 'file', content: OPENCODE_CUSTOMIZE_SKILL_MD }
];

const OPENCODE_EFFECT_TREE: FileNode[] = [
  { name: 'SKILL.md', type: 'file', content: OPENCODE_EFFECT_SKILL_MD }
];


export function SkillsPanel() {
  const SKILLS_ROOT = 'A:/web_ui/.lumina/skills';
  const DEFAULT_SKILL_METADATA: Record<string, Omit<Skill, 'tree'>> = {
    'master-orchestrator': {
      id: 'master-orchestrator',
      name: 'master-orchestrator',
      addedBy: 'Lumina',
      trigger: 'Auto for heavy tasks',
      description: 'Master skill that teaches the AI how Lumina skill files are organized, which files to inspect for which kind of work, and how to coordinate heavy tasks with better planning and verification.',
      enabled: true
    },
    'execution-playbook': {
      id: 'execution-playbook',
      name: 'execution-playbook',
      addedBy: 'Lumina',
      trigger: 'Slash command + auto',
      description: 'Advanced execution workflow for implementation, refactors, debugging, and other complex engineering tasks.',
      enabled: true
    },
    'skill-creator': {
      id: 'skill-creator',
      name: 'skill-creator',
      addedBy: 'Anthropic',
      trigger: 'Slash command + auto',
      description: 'Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize a skill\'s description for better triggering accuracy.',
      enabled: true
    },
    'customize-opencode': {
      id: 'customize-opencode',
      name: 'customize-opencode',
      addedBy: 'OpenCode (MIT)',
      trigger: 'Slash command + auto',
      description: 'Use when working on opencode configuration, agents, skills, plugins, MCP servers, or permission rules.',
      enabled: true
    },
    'effect': {
      id: 'effect',
      name: 'effect',
      addedBy: 'OpenCode (MIT)',
      trigger: 'Slash command + auto',
      description: 'Use for Effect v4 / effect-smol TypeScript code, services, layers, schemas, and testing patterns.',
      enabled: true
    }
  };

  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  const [activeSkillId, setActiveSkillId] = useState('skill-creator');
  const [selectedPath, setSelectedPath] = useState<string[]>(['SKILL.md']);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'agents': true,
    'assets': true,
    'eval-viewer': true,
    'references': true
  });
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillTrigger, setNewSkillTrigger] = useState('Slash command');

  const activeSkill = skills.find(s => s.id === activeSkillId) || skills[0];

  const persistSkillPrefs = (nextSkills: Skill[]) => {
    const prefs = nextSkills.map(({ id, name, addedBy, trigger, description, enabled }) => ({
      id,
      name,
      addedBy,
      trigger,
      description,
      enabled
    }));
    localStorage.setItem('lumina_custom_skills_meta', JSON.stringify(prefs));
  };

  const loadStoredPrefs = (): Record<string, Partial<Skill>> => {
    try {
      const saved = localStorage.getItem('lumina_custom_skills_meta');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return {};
      return parsed.reduce((acc, item) => {
        if (item?.id) acc[item.id] = item;
        return acc;
      }, {} as Record<string, Partial<Skill>>);
    } catch (error) {
      console.error('Failed to parse saved skills metadata:', error);
      return {};
    }
  };

  const normalizePath = (value: string) => value.replace(/\\/g, '/');

  const buildTreeFromFlatFiles = (files: Array<{ relativePath: string; isDirectory: boolean }>, contents: Record<string, string>) => {
    const root: FileNode[] = [];

    for (const file of files) {
      const parts = normalizePath(file.relativePath).split('/').filter(Boolean);
      let cursor = root;

      parts.forEach((part, index) => {
        const isLeaf = index === parts.length - 1;
        let existing = cursor.find(node => node.name === part);

        if (!existing) {
          existing = {
            name: part,
            type: isLeaf && !file.isDirectory ? 'file' : 'folder',
            ...(isLeaf && !file.isDirectory ? { content: contents[normalizePath(file.relativePath)] || '' } : { children: [] })
          };
          cursor.push(existing);
        }

        if (existing.type === 'folder') {
          existing.children = existing.children || [];
          cursor = existing.children;
        }
      });
    }

    return root;
  };

  const bootstrapDefaultSkillFiles = async () => {
    const writeTree = async (basePath: string, nodes: FileNode[]) => {
      for (const node of nodes) {
        const targetPath = `${basePath}/${node.name}`;
        if (node.type === 'folder') {
          await fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: targetPath, isDirectory: true })
          });
          if (node.children?.length) {
            await writeTree(targetPath, node.children);
          }
          continue;
        }

        await fetch('/api/fs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: targetPath, content: node.content || '' })
        });
      }
    };

    const defaultSkillTrees = [
      { id: 'master-orchestrator', tree: MASTER_INITIAL_TREE },
      { id: 'execution-playbook', tree: EXECUTION_PLAYBOOK_TREE },
      { id: 'skill-creator', tree: INITIAL_TREE },
      { id: 'customize-opencode', tree: OPENCODE_CUSTOMIZE_TREE },
      { id: 'effect', tree: OPENCODE_EFFECT_TREE }
    ];

    for (const skill of defaultSkillTrees) {
      await fetch('/api/fs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: `${SKILLS_ROOT}/${skill.id}`, isDirectory: true })
      });

      await writeTree(`${SKILLS_ROOT}/${skill.id}`, skill.tree);
    }
  };

  const loadSkillsFromDisk = async () => {
    setIsLoadingSkills(true);
    try {
      let listRes = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: SKILLS_ROOT })
      });

      if (listRes.status === 404) {
        await fetch('/api/fs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: SKILLS_ROOT, isDirectory: true })
        });
        await bootstrapDefaultSkillFiles();
        listRes = await fetch('/api/fs/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: SKILLS_ROOT })
        });
      }

      if (!listRes.ok) {
        throw new Error('Failed to list skills directory');
      }

      const listData = await listRes.json();
      const files = Array.isArray(listData?.files) ? listData.files : [];
      const skillDirs = files.filter((file: any) => file.isDirectory && !String(file.relativePath || '').includes('/'));
      const prefs = loadStoredPrefs();

      const nextSkills = await Promise.all(skillDirs.map(async (dir: any) => {
        const skillId = String(dir.name);
        const skillFiles = files.filter((file: any) => {
          const rel = normalizePath(String(file.relativePath || ''));
          return rel.startsWith(`${skillId}/`);
        });

        const fileContents: Record<string, string> = {};
        await Promise.all(skillFiles
          .filter((file: any) => !file.isDirectory)
          .map(async (file: any) => {
            const rel = normalizePath(String(file.relativePath));
            const readRes = await fetch('/api/fs/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: `${SKILLS_ROOT}/${rel}` })
            });
            if (readRes.ok) {
              const data = await readRes.json();
              fileContents[rel] = data?.content || '';
            }
          }));

        const savedMeta = prefs[skillId] || {};
        const defaultMeta = DEFAULT_SKILL_METADATA[skillId];

        return {
          id: skillId,
          name: savedMeta.name || defaultMeta?.name || skillId,
          addedBy: savedMeta.addedBy || defaultMeta?.addedBy || 'User',
          trigger: savedMeta.trigger || defaultMeta?.trigger || 'Slash command',
          description: savedMeta.description || defaultMeta?.description || 'A custom workspace skill.',
          enabled: savedMeta.enabled ?? defaultMeta?.enabled ?? true,
          tree: buildTreeFromFlatFiles(skillFiles, fileContents)
        } as Skill;
      }));

      setSkills(nextSkills);
      if (nextSkills.length > 0 && !nextSkills.some(skill => skill.id === activeSkillId)) {
        setActiveSkillId(nextSkills[0].id);
        setSelectedPath(['SKILL.md']);
      }
      persistSkillPrefs(nextSkills);
    } catch (error) {
      console.error('Failed to load skills from disk:', error);
      showToast('Failed to load skills directory');
    } finally {
      setIsLoadingSkills(false);
    }
  };

  useEffect(() => {
    loadSkillsFromDisk();
  }, []);

  useEffect(() => {
    if (!skills.length) return;
    persistSkillPrefs(skills);
  }, [skills]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleToggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Find file and its content in the tree
  const findFileNode = (tree: FileNode[], path: string[]): FileNode | null => {
    let current: FileNode | undefined;
    let pool = tree;

    for (let i = 0; i < path.length; i++) {
      const part = path[i];
      current = pool.find(node => node.name === part);
      if (!current) return null;
      if (i < path.length - 1) {
        if (current.type === 'folder' && current.children) {
          pool = current.children;
        } else {
          return null;
        }
      }
    }
    return current || null;
  };

  const activeFile = activeSkill ? findFileNode(activeSkill.tree, selectedPath) : null;

  const handleUpdateFileContent = (newContent: string) => {
    if (!activeSkill) return;
    setSkills(prev => prev.map(s => {
      if (s.id !== activeSkillId) return s;

      // Deep copy tree and modify selected node
      const deepCopyTree = (nodes: FileNode[], currentDepth: number = 0): FileNode[] => {
        return nodes.map(node => {
          if (node.name === selectedPath[currentDepth]) {
            if (currentDepth === selectedPath.length - 1) {
              return { ...node, content: newContent };
            }
            if (node.type === 'folder' && node.children) {
              return { ...node, children: deepCopyTree(node.children, currentDepth + 1) };
            }
          }
          return node;
        });
      };

      return {
        ...s,
        tree: deepCopyTree(s.tree)
      };
    }));

    const filePath = `${SKILLS_ROOT}/${activeSkillId}/${selectedPath.join('/')}`;
    fetch('/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content: newContent })
    }).catch(error => {
      console.error('Failed to save skill file:', error);
      showToast('Failed to save file');
    });
  };

  const handleCopyContent = () => {
    if (activeFile && activeFile.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied content to clipboard');
    }
  };

  const handleToggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = !s.enabled;
        showToast(`${nextState ? 'Enabled' : 'Disabled'} ${s.name}`);
        return { ...s, enabled: nextState };
      }
      return s;
    }));
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const formattedId = newSkillName.toLowerCase().replace(/\s+/g, '-');
    const createSkill = async () => {
      try {
        await fetch('/api/fs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: `${SKILLS_ROOT}/${formattedId}`, isDirectory: true })
        });

        await Promise.all([
          fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: `${SKILLS_ROOT}/${formattedId}/SKILL.md`,
              content: `---
name: ${formattedId}
description: ${newSkillDesc || `Use for ${newSkillName}.`}
---

# ${newSkillName}

## Purpose

${newSkillDesc || 'Explain what this skill is for and what outcome it should produce.'}

## When To Use

- Add the situations, user requests, and edge cases that should trigger this skill.

## Workflow

1. Inspect the task
2. Read relevant references
3. Execute the procedure
4. Verify before finalizing
`
            })
          }),
          fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: `${SKILLS_ROOT}/${formattedId}/LICENSE.txt`,
              content: 'Custom User License\n'
            })
          }),
          fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: `${SKILLS_ROOT}/${formattedId}/references`, isDirectory: true })
          }),
          fetch('/api/fs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: `${SKILLS_ROOT}/${formattedId}/references/notes.md`,
              content: `# ${newSkillName} Notes

Use this file for examples, schemas, rules, edge cases, and supporting details for the main skill.`
            })
          })
        ]);

        setIsAddDialogOpen(false);
        setNewSkillName('');
        setNewSkillDesc('');
        setNewSkillTrigger('Slash command');
        await loadSkillsFromDisk();
        setActiveSkillId(formattedId);
        setSelectedPath(['SKILL.md']);
        setSkills(prev => prev.map(skill => skill.id === formattedId
          ? { ...skill, trigger: newSkillTrigger, description: newSkillDesc || 'A custom defined user skill.', addedBy: 'User' }
          : skill
        ));
        showToast(`Created new skill: ${formattedId}`);
      } catch (error) {
        console.error('Failed to create skill:', error);
        showToast('Failed to create skill');
      }
    };

    createSkill();
  };

  // Rendering directory tree node
  const renderTreeNode = (node: FileNode, parentPath: string[]) => {
    const currentPath = [...parentPath, node.name];
    const isSelected = selectedPath.join('/') === currentPath.join('/');

    if (node.type === 'folder') {
      const isExpanded = !!expandedFolders[node.name];
      return (
        <div key={node.name} className="select-none">
          <div
            onClick={() => handleToggleFolder(node.name)}
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400 group"
          >
            {isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
            {isExpanded ? <FolderOpen size={14} className="text-amber-500 shrink-0" /> : <Folder size={14} className="text-amber-500 shrink-0" />}
            <span className="flex-1 truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div className="pl-4 ml-1.5 border-l border-gray-100 dark:border-white/5 space-y-0.5 mt-0.5">
              {node.children.map(child => renderTreeNode(child, currentPath))}
            </div>
          )}
        </div>
      );
    } else {
      const isMarkdown = node.name.endsWith('.md');
      return (
        <div
          key={node.name}
          onClick={() => {
            setSelectedPath(currentPath);
            setPreviewMode(isMarkdown ? 'preview' : 'code');
          }}
          className={`flex items-center gap-2 py-1 px-2.5 rounded-lg cursor-pointer text-xs transition-all ${
            isSelected
              ? 'bg-blue-50/70 dark:bg-zinc-800 text-blue-600 dark:text-white font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <FileText size={14} className={`shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className="truncate flex-1">{node.name}</span>
        </div>
      );
    }
  };

  // Filter skills based on search
  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbRoot = activeSkill?.name || 'skill';
  const selectedFileName = selectedPath[selectedPath.length - 1] || 'SKILL.md';
  const selectedIsMarkdown = selectedFileName.endsWith('.md');

  return (
    <div className="flex h-full w-full overflow-hidden rounded-none border border-white/10 bg-[#171717] text-[#f4f0e8] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-zinc-900 border border-white/10 text-white px-4 py-2.5 rounded-xl shadow-xl z-50 text-xs font-semibold flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Skill Modal Overlay */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-brand-primary dark:text-white">Create New Skill</h4>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. pr-critique"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Trigger Type</label>
                <select
                  value={newSkillTrigger}
                  onChange={e => setNewSkillTrigger(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option>Slash command</option>
                  <option>Semantic matched auto-load</option>
                  <option>Slash command + auto</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="One or two sentences summarizing intent..."
                  value={newSkillDesc}
                  onChange={e => setNewSkillDesc(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <button
              onClick={handleAddSkill}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-xs transition-colors"
            >
              Create Skill
            </button>
          </motion.div>
        </div>
      )}

      <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-white/10 bg-[#1f1d1b]">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[18px] font-semibold text-white">Skills</h2>
          <div className="flex items-center gap-3 text-[#f2f0eb]">
            <button
              onClick={() => setSearchQuery('')}
              className="rounded-none p-1 hover:bg-white/8 transition-colors"
              title="Clear search"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="rounded-none p-1 hover:bg-white/8 transition-colors"
              title="Add skill"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f887d]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search skills"
              className="w-full rounded-lg border border-white/8 bg-[#151413] py-2 pl-9 pr-3 text-sm text-[#f4f0e8] placeholder:text-[#7e776d] focus:outline-none focus:ring-1 focus:ring-[#5f86ff]"
            />
          </div>
        </div>

        <div className="px-6 pb-3 text-sm text-[#b6afa5]">Personal skills</div>

        <div className="flex-1 overflow-y-auto px-4 pb-5 custom-scrollbar">
          {isLoadingSkills && (
            <div className="rounded-none border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-[#8f887d]">
              Loading skills...
            </div>
          )}

          {!isLoadingSkills && filteredSkills.map(skill => {
            const isActive = skill.id === activeSkillId;
            return (
              <div key={skill.id} className="mb-1">
                <button
                  onClick={() => {
                    setActiveSkillId(skill.id);
                    setSelectedPath(['SKILL.md']);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[#111111] text-white'
                      : 'text-[#d9d2c7] hover:bg-white/5'
                  }`}
                >
                  <span className="truncate text-[15px] font-semibold">{skill.name}</span>
                  <ChevronDown size={16} className={`${isActive ? 'text-[#d8d0c3]' : 'text-[#7e776d]'}`} />
                </button>

                {isActive && (
                  <div className="space-y-1 px-4 py-2 text-[15px] text-[#e8e2d8]">
                    {(activeSkill?.tree || []).map(node => renderTreeNode(node, []))}
                  </div>
                )}
              </div>
            );
          })}

          {!isLoadingSkills && filteredSkills.length === 0 && (
            <div className="rounded-none border border-dashed border-white/10 px-4 py-6 text-center text-sm text-[#8f887d]">
              No matching skills.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#1f1d1b]">
        {!activeSkill && !isLoadingSkills ? (
          <div className="flex h-full items-center justify-center px-6 text-sm text-[#8f887d]">
            No skills found in `A:\web_ui\.lumina\skills`.
          </div>
        ) : activeSkill ? (
          <>
        <div className="flex items-start justify-between gap-6 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <h3 className="mb-3 text-[16px] font-semibold text-white">{activeSkill.name}</h3>
            <div className="max-w-5xl">
              <div className="mb-2 flex items-center gap-2 text-sm text-[#a69f93]">
                <span>Description</span>
              </div>
              <p className="text-[15px] leading-7 text-[#dccfb8]">{activeSkill.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => handleToggleSkill(activeSkill.id)}
              className={`relative h-7 w-12 rounded-full transition-colors border border-white/10 ${
                activeSkill.enabled ? 'bg-[#3b82f6]' : 'bg-[#47413a]'
              }`}
              title="Toggle skill"
            >
              <div
                className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white transition-all ${
                  activeSkill.enabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
            <button className="rounded-none p-1.5 text-[#d9d2c7] hover:bg-white/5 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-7">
          <div className="relative flex min-h-0 flex-1 flex-col rounded-xl overflow-hidden border border-white/10 bg-[#2a2826] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="absolute right-4 top-4 flex overflow-hidden rounded-lg border border-white/10 bg-[#242220]">
              <button
                onClick={() => setPreviewMode('preview')}
                className={`px-3 py-2 text-sm transition-colors ${
                  previewMode === 'preview'
                    ? 'bg-[#4f4c48] text-white'
                    : 'text-[#8e877d] hover:text-white'
                }`}
                title="Preview"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => setPreviewMode('code')}
                className={`px-3 py-2 text-sm transition-colors ${
                  previewMode === 'code'
                    ? 'bg-[#4f4c48] text-white'
                    : 'text-[#8e877d] hover:text-white'
                }`}
                title="Code"
              >
                <Code size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-24 custom-scrollbar">
              {activeFile ? (
                previewMode === 'preview' && selectedIsMarkdown ? (
                  <div className="prose prose-invert max-w-none text-[#f0ece4] prose-headings:text-[#f8f5ef] prose-p:text-[#ece4d7] prose-li:text-[#ece4d7] prose-strong:text-white prose-code:text-[#ffb86b]">
                    <ReactMarkdown>{activeFile.content || ''}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] w-full font-mono text-[12px] leading-6 text-[#d9d2c7]">
                    <div className="select-none border-r border-white/8 pr-4 text-right text-[#746d63]">
                      {(activeFile.content || '').split('\n').map((_, i) => (
                        <div key={i} className="h-6">{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={activeFile.content || ''}
                      onChange={e => handleUpdateFileContent(e.target.value)}
                      className="min-h-[420px] flex-1 resize-none bg-transparent pl-4 text-[#f2ede4] outline-none"
                      style={{ lineHeight: '1.5rem' }}
                    />
                  </div>
                )
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-sm text-[#8f887d]">
                  <FileText size={24} className="mb-3 text-[#6d675e]" />
                  No file selected.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/8 px-6 py-3 text-xs text-[#8f887d]">
              <span className="truncate">{[breadcrumbRoot, ...selectedPath].join(' / ')}</span>
              <button
                onClick={handleCopyContent}
                className="flex items-center gap-2 rounded-none px-2.5 py-1.5 text-[#d9d2c7] hover:bg-white/5 transition-colors"
                title="Copy file"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                Copy
              </button>
            </div>
          </div>
        </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
