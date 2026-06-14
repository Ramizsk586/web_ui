---
name: glob_tool
description: Find candidate files quickly by path or filename patterns before deeper inspection.
tools: [glob_tool]
mode: all
---

# glob_tool

- Use for entry-point discovery.
- Prefer specific patterns over scanning everything.
- Narrow by extension, directory, or feature area before reading file contents.
- Use it to reduce search scope before `grep_tool` on large workspaces.
- When multiple files match, rank likely entry points first instead of opening every result.
