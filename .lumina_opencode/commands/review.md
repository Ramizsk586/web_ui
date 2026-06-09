---
name: review
description: Review workflow for bug-finding, regressions, architectural drift, and missing tests inside Lumina Coder Mode.
tools: [read_file, glob_tool, grep_tool, run_command]
mode: all
---

# Review

Focus on findings first.

## Priorities

- Bugs and regressions
- Security or reliability risks
- Architectural inconsistencies
- Missing validation and missing tests

## Output rules

- Lead with findings ordered by severity.
- Use concrete file references.
- Keep summaries short after the findings.
