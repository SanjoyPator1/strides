# strides — planning

Working name, easy to change. Checked npm/GitHub: no exact "strides" (plural) collision in this space — a few unrelated `stride` (singular) packages exist (Atlassian chat SDK, a blockchain SDK, an array-iteration helper), and an unrelated bioinformatics tool `STRIDE`. Re-check before publishing.

## What this is

A framework for authoring interactive deep learning / LLM notes: markdown for prose, D3.js components dropped inline for diagrams (no ASCII art, no static images), and Python code cells that behave like Jupyter locally (real kernel, real PyTorch, real GPU) but freeze into saved output when published — the same way an `.ipynb` looks on GitHub once pushed: code + last-run output, not live.

Not a converter. The existing notes/notebooks in `WebDevLearning` (esp. `S06-Large Language Models/B00 - PyTorch Mastery for LLMs/` and `.../B01 - Build a Large Language Model from Scratch/code/ch03/solutions/ch03-code-explanation.md`) are **reference material only** — they show what topics and diagrams are worth building (tensor strides, view/transpose, attention heatmaps, causal masking, multi-head splits), and the exact hand-drawn ASCII versions to replace with real D3 visualizations. Content in `strides` gets authored fresh in MDX.

## Hard constraint

Pyodide (Python-in-browser via WASM) does not support PyTorch — GPU/CUDA kernels aren't available and heavy tensor libs aren't practical in-browser. So there is no "runs live on Vercel" tier for torch code. Execution model is local-only; publishing freezes state.

## Stack

Next.js + MDX, deployed to Vercel (static once snapshotted). KaTeX for math, standard syntax highlighting for code fences — both work in MDX out of the box.

## Repo shape (monorepo)

```
strides/
├── packages/viz/        ← D3 visualization components (the lego bricks)
├── packages/runtime/    ← Python cell system: kernel client + snapshot format
├── content/             ← chapters as plain .mdx, one folder per topic/bundle
└── apps/site/           ← Next.js app: sidebar nav (generated from content/), chapter pages, theme
```

New chapter = new folder under `content/` → shows up in the sidebar automatically.

## Python cells (`<PyCell>`)

- **Local dev**: `dev` command starts Next.js + a Jupyter kernel from the project's `.venv` together. Cells on a page share one kernel session and run top-to-bottom like a notebook — editable, re-runnable, full torch + GPU.
- **Publish**: `snapshot` command executes every cell on a page and writes outputs to a JSON file alongside the `.mdx`; both get committed. The deployed page renders code + frozen output, no server involved.

Workflow: write → run locally → snapshot → push.

## Visualization library

Inspired by 3blue1brown's [manim](https://github.com/3b1b/manim) *concept* (not code — manim renders video frames in Python; this is client-side SVG/D3 in the browser).

- **Primitives**: `Matrix`, `Tensor3D`, `Vector`, `Axis` — take real numbers as props, animate on value/position change.
- **`Scene`**: a manim-style sequence of named steps with a scrubber/next-prev control; each step declaratively transforms the primitives on screen. Reader drags through it instead of watching a video.
- **Composed scenes** (built from primitives, once those exist):
  - `AttentionHeatmap` — hover a cell/row, see real attention weights, confirm rows sum to 1.
  - `CausalMaskStepper` — steps a 6×6 score matrix through raw → bool mask → `-inf` fill → softmax.
  - `HeadSplitViz` — the hardest and most valuable one: animates `.view()` + `.transpose()` splitting `(batch, tokens, d_out)` into heads, proving no data moves (strides change, not memory).
  - `BroadcastViz`, `StridedStorage` — shape/stride/broadcast mechanics from B00 ch01.

## Build order

1. Scaffold: Next.js + MDX + KaTeX + syntax highlighting + sidebar generated from `content/`. One small test chapter to prove the pipe.
2. `<PyCell>`: local kernel connection, shared session, `snapshot` command — publish flow works end to end.
3. Viz primitives (`Matrix`, `Scene`) + first composed scene — `AttentionHeatmap` (simplest, highest payoff).
4. Remaining composed scenes + polish (dark mode, search, progress tracking) as real content gets authored.

## Open items

- Final project name (currently `strides`).
- GitHub remote / SSH config — deferred; GitHub profile is [SanjoyPator1](https://github.com/SanjoyPator1). Local git identity in this repo is already set to match (`SanjoyPator1` / `sanjoypator1@gmail.com`), no remote added yet.
- Whether to keep `WebDevLearning` linked as a read-only reference directory during authoring (via `/add-dir`) or just eyeball it occasionally.
