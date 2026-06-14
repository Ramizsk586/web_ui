---
name: edit_file
description: Make narrow, high-confidence edits to existing files while preserving surrounding structure and style, even in very large files.
tools: [edit_file, write_file, create_file, rename_file, delete_file]
mode: all
---

# edit_file

- Prefer targeted replacement for existing files.
- In huge files, edit the smallest stable region possible instead of rewriting broad sections.
- Anchor edits on unique nearby code so the intended block is unambiguous.
- Re-read the target region before editing, then verify the surrounding context still matches.
- Use full rewrites only when the structure clearly needs it.
- Keep changes narrow, readable, and structurally consistent with adjacent code.
