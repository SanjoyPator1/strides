# POC 01 — "interactive web-Manim": SVG stage + beat timeline

**Idea under test:** a visualization is a *program of beats* on a stage, not a styled DOM
widget. One fixed dark viewport, free x/y positioning, an animated camera, objects that
persist and travel between representations, and hover interactivity that works at any
point in the timeline — the thing video tools (Manim, Motion Canvas) can't give.

Single dependency-free HTML file: the engine is ~180 lines (tween core, state↔SVG
bindings, deterministic timeline), the rest is the scene.

## Run

```bash
python3 -m http.server 4173 -d poc/01_poc_svg_stage_timeline
# open http://localhost:4173
```

(Any static server works; there is no build step.)

## The scene

"Your journey starts with one step" (real GPT-2 BPE ids, the ch03 toy embeddings):

1. **Tokenize** — words glide out of the sentence and become colored chips; BPE's leading
   space appears as `␣`.
2. **Token IDs** — an id badge pops out beneath each chip.
3. **Embedding lookup** — each badge emits its 3 cells, which fly into a stacking
   (6 × 3) matrix; token-colored row labels follow.
4. **Camera zoom** — into the "␣journey" row; the cells pulse.
5. **Batch tease** — zoom out, a ghost second sentence stacks behind: shape (2, 6, 3).

Controls: ⏮ ▶ ⏭, clickable beat dots, ←/→/space keys. Hover any token at any beat —
its word, chip, badge, cells, and row label glow together (page-wide color identity).

## What to judge

- Does beat-based choreography *feel* 3b1b-like (things travel, nothing teleports)?
- Is the camera move convincing in SVG (viewBox animation)?
- Is glow/atmosphere good enough in SVG filters, or do we need canvas/WebGL?
- Is "engine ~180 lines we own" the right call vs adopting Motion Canvas/GSAP?
- Timeline model: beats replayed-instantly-on-jump gives deterministic prev/jump — good
  enough, or do we need a true scrubbing playhead (per-frame sampling)?
