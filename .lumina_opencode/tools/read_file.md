---
name: read_file
description: Read exact file contents with chunked or targeted ranges before editing, especially in very large files.
tools: [read_file]
mode: all
---

# read_file

- Use before edits when the target file is not already fully known.
- Prefer targeted reads first: nearby symbols, line ranges, or small surrounding windows.
- For huge files, read in chunks and continue only where the next relevant section is likely to be.
- Re-read the exact region you plan to edit immediately before editing if the file is long or busy.
- Preserve surrounding formatting, indentation, and local conventions from the file itself.
- Quote or summarize only the relevant sections in reasoning.
