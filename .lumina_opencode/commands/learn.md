---
name: learn
description: Workspace learning workflow. Use when you need to understand an unfamiliar code path, subsystem, or feature before making changes.
tools: [read_file, glob_tool, grep_tool]
mode: all
---

# Learn

Use this to map unfamiliar code safely.

## Workflow

1. Find entry points with `glob_tool`.
2. Narrow to exact symbols and references with `grep_tool`.
3. Read only the relevant sections with `read_file`.
4. Trace imports, state, and side effects.
5. Summarize the actual behavior.
6. Identify the smallest safe change surface.
