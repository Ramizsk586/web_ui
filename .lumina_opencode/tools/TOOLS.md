---
name: tools
description: Reference guide for the local OpenCode-style tool surface used in Lumina Coder Mode.
tools: [read_file, glob_tool, grep_tool, edit_file, run_command]
mode: all
---

# Tools Reference

Lumina Coder Mode uses a focused local toolset for code understanding and implementation.

## Available tools

- `read_file`: Read exact file contents. Use targeted ranges and chunked reads for huge files.
- `glob_tool`: Find candidate files by filename or path patterns before opening them.
- `grep_tool`: Find symbols, strings, selectors, config keys, and exact code anchors across the workspace.
- `edit_file`: Make precise, minimal edits to existing files while preserving local structure and style.
- `run_command`: Run verification and diagnostic commands after meaningful changes.

## Expected behavior

- Read before editing.
- Use `glob_tool` to narrow where to look.
- Use `grep_tool` to jump to the exact section or symbol.
- Use `read_file` to inspect only the relevant context, especially in large files.
- Use `edit_file` for surgical changes instead of broad rewrites.
- Use `run_command` to verify risky or meaningful changes.

## Default build behavior

- If the user asks to build something and does not specify a language, framework, or runtime, default to plain `HTML`, `CSS`, and `JavaScript` unless the workspace clearly establishes a different stack.

## Normal question behavior

- If the user sends a normal message but the answer depends on local docs or code, first use `glob_tool` and `grep_tool` to locate the relevant files, then use `read_file` before answering.
