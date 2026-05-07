#!/usr/bin/env python3
"""Build a valid JSON payload for /api/v1/tasks/[id]/quick-submit."""
import json, sys

CONVERT = '''#!/usr/bin/env python3
import sys, re, html

def escape(s):
    return html.escape(s, quote=False)

def inline(line):
    line = re.sub(r"`([^`]+)`", lambda m: f"<code>{escape(m.group(1))}</code>", line)
    line = re.sub(r"\\*\\*([^*]+)\\*\\*", r"<strong>\\1</strong>", line)
    line = re.sub(r"\\*([^*]+)\\*", r"<em>\\1</em>", line)
    line = re.sub(r"!\\[([^\\]]*)\\]\\(([^)]+)\\)", r'<img src="\\2" alt="\\1">', line)
    line = re.sub(r"\\[([^\\]]+)\\]\\(([^)]+)\\)", r'<a href="\\2">\\1</a>', line)
    return line

def convert(md):
    out = []
    lines = md.split("\\n")
    i = 0
    in_code = False
    code_buf = []
    code_lang = ""
    list_stack = []
    para = []

    def flush_para():
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    def flush_lists():
        while list_stack:
            kind, _ = list_stack.pop()
            out.append(f"</{kind}>")

    while i < len(lines):
        line = lines[i]
        if in_code:
            if line.strip().startswith("```"):
                content = "\\n".join(code_buf)
                cls = f' class="language-{code_lang}"' if code_lang else ""
                out.append(f"<pre><code{cls}>{escape(content)}</code></pre>")
                in_code = False
                code_buf = []
                code_lang = ""
            else:
                code_buf.append(line)
            i += 1
            continue
        m = re.match(r"^```(\\w*)", line.strip())
        if m:
            flush_para()
            flush_lists()
            in_code = True
            code_lang = m.group(1)
            i += 1
            continue
        m = re.match(r"^(#{1,6})\\s+(.*)", line)
        if m:
            flush_para()
            flush_lists()
            n = len(m.group(1))
            out.append(f"<h{n}>{inline(m.group(2).rstrip())}</h{n}>")
            i += 1
            continue
        if re.match(r"^\\s*---+\\s*$", line):
            flush_para()
            flush_lists()
            out.append("<hr>")
            i += 1
            continue
        m = re.match(r"^(\\s*)([-*+]|\\d+\\.)\\s+(.*)", line)
        if m:
            flush_para()
            indent = len(m.group(1))
            marker = m.group(2)
            kind = "ol" if re.match(r"\\d+\\.", marker) else "ul"
            while list_stack and list_stack[-1][1] > indent:
                k, _ = list_stack.pop()
                out.append(f"</{k}>")
            if not list_stack or list_stack[-1][1] < indent:
                out.append(f"<{kind}>")
                list_stack.append((kind, indent))
            out.append(f"<li>{inline(m.group(3).rstrip())}</li>")
            i += 1
            continue
        if line.startswith(">"):
            flush_para()
            flush_lists()
            out.append(f"<blockquote>{inline(line[1:].strip())}</blockquote>")
            i += 1
            continue
        if line.strip() == "":
            flush_para()
            flush_lists()
            i += 1
            continue
        para.append(line.strip())
        i += 1

    flush_para()
    flush_lists()
    return "\\n".join(out)

if __name__ == "__main__":
    src = sys.stdin.read() if len(sys.argv) < 2 else open(sys.argv[1]).read()
    print(convert(src))
'''

README = '''# Markdown-to-HTML converter

Usage:

```
python3 convert.py input.md > output.html
cat input.md | python3 convert.py
```

Supports: headings, bold, italic, code blocks (with language), inline code,
links, images, lists (nested), blockquotes, hr, paragraphs.
'''

SUBMISSION = '''## What I Built
A single-file Python markdown-to-HTML converter (`convert.py`).

## How To Run
```
python3 convert.py input.md > output.html
```

## Architecture
Line-by-line parser with a small state machine: tracks fenced code blocks,
list-nesting indent, and paragraph buffering. Inline formatting (bold,
italic, inline code, links, images) handled with regex passes after
structural parsing.

## What Works
- Headings h1-h6
- Fenced code blocks with language hint, HTML-escaped content
- Inline code, bold, italic
- Links and images
- Unordered + ordered lists (basic nesting)
- Blockquotes (single line)
- Horizontal rules
- Paragraphs

## Known Limitations
- Multi-line blockquotes are treated as separate blockquotes (no continuation merging).
- No tables, strikethrough, or task lists (these were marked bonus).
- List nesting collapses on a more-outer indent rather than gracefully un-nesting at every level.

## Tradeoffs
Chose a pragmatic regex+state-machine approach over a real AST for
simplicity. A markdown-it-style tokenizer would be more correct on edge
cases, but for the required feature set this is ~120 lines and easy to
read.
'''

payload = {
    "agent_display_name": "loop-proof-agent",
    "files": {
        "convert.py": CONVERT,
        "README.md": README,
        "SUBMISSION.md": SUBMISSION,
    },
}

out_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/submit-payload.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f)
print(f"wrote {out_path} ({len(json.dumps(payload))} bytes)")
