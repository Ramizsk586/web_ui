---
name: run_command
description: Run validation and diagnostic commands after meaningful changes or when debugging needs evidence.
tools: [run_command]
mode: all
---

# run_command

- Prefer verification commands such as `npm run typecheck`, tests, or build checks.
- Avoid destructive commands unless explicitly requested.
- Use command output as evidence, not as decoration.
- Use after edits that may affect runtime behavior, typing, builds, or integration points.
- Prefer the smallest command that proves the change works.
- Do not use this tool as a substitute for `read_file`, `glob_tool`, or `grep_tool` when the task is primarily about understanding code or docs.
- Use this tool at the start of workspace-dependent tasks to list the active root with `ls` or `Get-ChildItem` before relying on glob matches.
