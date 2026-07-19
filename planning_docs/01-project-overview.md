# 01 — Project overview

Status: **accepted** · Last updated: 2026-07-16

## What strides is

**strides** is a framework for authoring and publishing interactive technical notes. A note combines three things on one page:

1. **Prose** — MDX (markdown + components), with LaTeX math and syntax-highlighted code.
2. **Interactive diagrams** — React/SVG components dropped inline: matrices, heatmaps, and stepped "scenes" the reader plays or steps through (next/prev/play), in the spirit of 3blue1brown's animations but reader-paced and hoverable.
3. **Executable code cells** — Python cells that run against the author's real local environment (real PyTorch, real GPU) during authoring, then **freeze into committed outputs** when published — the way an `.ipynb` renders on GitHub: code plus last-run output, not live.

strides is a framework, not a website: the repo contains no one's actual notes. It ships as `@strides/*` packages plus a scaffolder; each set of notes is its own thin repo consuming the packages. The target end-user experience:

```
npx create-strides my-notes    # scaffold a thin notes repo
strides dev                    # local site + Jupyter kernel; cells run live
strides snapshot               # execute all cells, freeze outputs to JSON
git push                       # static site deploys (e.g. Vercel) — no servers
```

The first consumer is a set of deep-learning/LLM notes (attention, tensor internals, transformer mechanics), which doubles as the dogfood content while the framework stabilizes.

## Why it exists

- **Jupyter notebooks** publish poorly: no prose-first layout, no custom interactive diagrams, ugly diffs, no site structure.
- **Static blogs / docs sites** can't execute code and show real outputs from real hardware.
- **In-browser Python (Pyodide)** cannot run PyTorch — no GPU/CUDA, heavy tensor libs impractical in WASM. So "live on the server/browser" is off the table for the target content anyway.

strides embraces that constraint: **execution is local-only, publishing freezes state.** Published sites are fully static — real GPU outputs in the published page, zero hosting cost, no execution security surface.

## Product principles

- **Author in your editor.** Content is `.mdx` files edited in a normal editor with hot reload — there is no in-browser cell editor. The browser is for reading, running, and interacting.
- **Git is the database.** Content, snapshots, and assets are plain files with reviewable diffs. Collaboration is pull requests.
- **Published output is static.** No runtime servers, no kernels in production, ever.
- **The framework is domain-agnostic; domain knowledge lives in packs.** Core primitives (matrix, scene) serve any technical subject; ML-specific components ship as a separate package.

## Decision log

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-07-16 | Framework, not site — framework code and content in separate repos (Docusaurus/Nextra model) | Reusable across many works and by other people |
| 2 | 2026-07-16 | Consumption model: **thin Next.js app** — scaffold generates a minimal app importing from `@strides/theme` | Less machinery than a CLI-owned app; free escape hatches; upgrades are version bumps |
| 3 | 2026-07-16 | Foundation: **raw Next.js + MDX**, not Nextra | Cell hydration and snapshot-aware builds are unusual; owning the MDX pipeline is worth owning sidebar/theme |
| 4 | 2026-07-16 | Dogfood content lives **inside the monorepo** (`examples/dl-notes`), extracted to its own repo after packages publish | Instant iteration while APIs churn; constant real-world validation |
| 5 | 2026-07-16 | Viz rendering: **React-rendered SVG** — not three.js, not canvas, not D3-managed DOM | See "Rendering choice" in [02-architecture](02-architecture.md); interactions, text, theming, and SSR all live on the DOM |
| 6 | 2026-07-16 | Interaction model: **stepped/playable scenes** (next/prev/play), no free-orbit 3D | Multi-dimensional tensors are shown as animated isometric 2D drawings; understanding comes from transitions, not camera control |
| 7 | 2026-07-16 | No in-browser cell editing | Authors edit MDX in their editor; hot reload covers iteration. Removes an entire editor subsystem from scope |
| 8 | 2026-07-16 | Snapshot format: one JSON per page, deterministic ordering, images as separate files, env metadata embedded | Reviewable diffs; "works on my machine" is diagnosable |
| 9 | 2026-07-16 | Python environments managed with **uv** (`pyproject.toml` + committed `uv.lock`); the framework itself depends only on a venv path (default `.venv`) | Frozen outputs are only reproducible with locked deps; uv creates `.venv` by default, so CLI python resolution stays package-manager-agnostic |
| 10 | 2026-07-19 | Reverses #7 — **in-browser cell editing added** (`updateCellCode` on `KernelContextValue`; `PyCellClient` renders an editable `<textarea>` instead of the static Shiki-highlighted view whenever a kernel is connected) | Requested explicitly for the `lets-build-an-llm` series so viewers/authors can experiment against a live kernel without touching the `.mdx` file. Scope kept deliberately small: plain textarea, no syntax highlighting while editing, no write-back to the source file — edits are session-only against the live kernel. Published (no-kernel) pages are unaffected and stay fully static |

## Non-goals (v1)

Search, authentication, progress tracking, quizzes/spaced repetition, comments, plugin registries, multi-language kernels, live in-browser execution, mobile authoring. Some are "later," some are "never."

## Roadmap

1. **MVP** (spec: [03-mvp-spec](03-mvp-spec.md)) — monorepo with theme, runtime (cells + snapshots), CLI, viz core (`Matrix`, `Scene`) and first ML component (`AttentionHeatmap`), proven by real dogfood content, deployable as a static site.
2. **Framework-ification** — `create-strides` scaffolder, `apps/docs` documentation site (built with strides itself), npm publish, versioning via changesets, extract dogfood content to its own repo.
3. **Data bridge** — export values from Python cells into snapshot JSON (e.g. `strides.export("weights", tensor)`) so viz components can consume real computed data instead of hand-copied props.
4. **Viz growth** — `Vector`, `Axis`, `TensorSlices` primitives; composed scenes: `HeadSplitViz` (`.view()` + `.transpose()` with stride semantics), `BroadcastViz`, `StridedStorage`, dedicated `CausalMaskStepper`.
5. **Polish** — search, richer theme options, per-page kernel controls.

## Naming

Working name `strides` (after tensor strides). No exact npm/GitHub collision found in this space as of 2026-07; a few unrelated `stride` (singular) packages exist. Re-verify the npm package/scope availability immediately before first publish (publish is post-MVP).

## Reference material

`../WebDevLearning` (sibling directory) holds prior handwritten notes — especially `S06-Large Language Models/B00 - PyTorch Mastery for LLMs/` and `B01 - Build a Large Language Model from Scratch/code/ch03/solutions/ch03-code-explanation.md`. These are **reference only**: they indicate which topics and diagrams are worth building and which hand-drawn ASCII diagrams to replace with real interactive components. All strides content is authored fresh in MDX.
