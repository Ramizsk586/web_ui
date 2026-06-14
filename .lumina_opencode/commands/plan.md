---
name: plan
description: Read-first planning workflow for Lumina Coder Mode. Use for architecture, walkthroughs, codebase analysis, and low-risk planning before edits.
tools: [read_file, glob_tool, grep_tool]
mode: primary
---

# Plan

Use this workflow when the user wants analysis, planning, code review, or a walkthrough before implementation.

## Rules

- Do not start changing files unless the user explicitly moves from planning to execution.
- Ground the plan in real files, modules, and discovered dependencies.
- Prefer concise phases with clear validation steps.
- Ask only when ambiguity is truly blocking.
- If the user asks a normal product or code question and local docs may contain the answer, use `glob_tool` and `grep_tool` to locate those docs before responding.

## Output shape

1. Current state
2. Risks and constraints
3. Proposed phases
4. Verification strategy
