# 03 — MVP specification

Status: **accepted** · Last updated: 2026-07-16

This doc defines exactly what the first MVP does and how it behaves. The build order is in [04-mvp-implementation-plan](04-mvp-implementation-plan.md).

## Scope

| In | Out (post-MVP or never) |
|---|---|
| Monorepo with `theme`, `runtime`, `viz`, `viz-ml`, `cli` packages | `create-strides` scaffolder, `apps/docs`, npm publishing |
| `examples/dl-notes` thin app rendering MDX chapters with auto sidebar, KaTeX, highlighted code, dark mode | Search, progress tracking, quizzes, comments |
| Python cells: live execution in dev, `strides snapshot` freeze, frozen render in production build | In-browser cell editing; Python→viz data bridge (`strides.export`) |
| Viz: `Matrix`, `Scene`/`Step`, `AttentionHeatmap` | `Vector`, `Axis`, `TensorSlices`, `HeadSplitViz`, `BroadcastViz`, `StridedStorage` |
| One real dogfood chapter exercising everything | Extracting content to its own repo |
| Statically deployable example (verified via `next build` + local serve) | CI, release tooling |

## 1. Content authoring format

### Files and structure

- Pages are `.mdx` files under `contentDir` (default `content/`).
- Folders are sidebar sections; files are pages. Nesting depth: 2 levels (section/page) for MVP.
- Ordering: numeric filename/folder prefix (`01-`, `02-`, …), then alphabetical. Prefixes are **kept** in URLs for MVP (slug = path minus extension).
- Frontmatter (all optional):

```yaml
---
title: Attention weights        # sidebar + <h1>; default: filename, prefix stripped, kebab→Title Case
description: One-line summary   # meta description
---
```

### Code

- ` ```python ` (or any language) → static highlighted code block. Never executed.
- ` ```python cell ` → an executable cell. Cells are ordered top-to-bottom per page; that order is the execution order everywhere (dev and snapshot).
- Implementation: a remark plugin (in `@strides/runtime`) transforms fences whose meta string is `cell` into `<PyCell code={…} index={…} />` MDX elements. Only `python cell` is supported in MVP; the plugin errors on `cell` fences with other languages.

### Math and components

- `$inline$` and `$$block$$` math via remark-math + rehype-katex.
- Viz components are used directly in MDX (registered in the theme's component map): `<Matrix values={[[1,2],[3,4]]} />`, `<Scene>…</Scene>`, `<AttentionHeatmap … />`. Props are authored by hand in MVP (no data bridge yet).

## 2. Theme behavior

- **Layout**: header (site title, dark-mode toggle) · left sidebar (sections/pages, current page highlighted) · main content column (comfortable reading width ~72ch) . Responsive: sidebar collapses behind a toggle under ~768px.
- **Sidebar** is generated at build time by scanning `contentDir` (server-side `fs`), applying the ordering/title rules above.
- **Dark mode**: `next-themes`, class strategy, defaulting to system. All colors — including diagram colors — go through CSS custom properties defined once in the theme stylesheet, so viz components inherit the theme with no JS.
- **Code highlighting**: shiki with a light and a dark theme (dual-theme CSS variables approach) for static fences and for cell code.
- **Theme exports**: `StridesLayout`, `StridesPage` (async server component: load MDX → compile with plugin chain → render with component map, wrapped in `SnapshotProvider` and, in dev, `KernelProvider`), `getContentSlugs` (for `generateStaticParams`), `withStrides` (next.config helper setting `transpilePackages` and any required externals), `StridesConfig` type.

## 3. Python cells

### Component anatomy

`PyCell` renders: the code (highlighted, read-only) · a status strip (state + controls in dev) · an output area. Split as a server part (highlighting) and client part (execution state, outputs).

### States and behavior

| Context | Behavior |
|---|---|
| **Dev, kernel reachable** | Controls: ▶ Run (this cell, after auto-running any earlier un-run cells), Restart kernel (per page). Outputs stream live (stdout as it arrives). Cell states: `idle → queued → running → ok | error`. Before first run, shows the frozen snapshot output (if any) marked "from snapshot". |
| **Dev, gateway down** | Non-blocking banner on the page: "Kernel not available — cells are read-only." Cells render like published mode. |
| **Published (no kernel context)** | Code + frozen outputs from the page snapshot, matched by cell index. If the stored `codeHash` ≠ hash of current code → small "output may be stale — re-run `strides snapshot`" badge. No snapshot entry → "not yet run" note. No buttons. |

No in-browser editing in any mode (decision #7 in doc 01).

### Output rendering

Modeled on Jupyter output types: `stream` (stdout/stderr, monospace; ANSI codes stripped in MVP), `execute_result` / `display_data` (`text/plain` always; `image/png` rendered as `<img>`), `error` (ename/evalue + traceback, ANSI stripped, collapsed beyond ~20 lines).

## 4. Snapshot format

One JSON file per page at `snapshotDir/<slug>.json`, plus binary assets under `snapshotDir/assets/<slug>/`.

```jsonc
{
  "version": 1,
  "page": "attention/01-attention-weights",
  "generatedAt": "2026-07-16T10:00:00Z",
  "environment": {
    "python": "3.12.4",
    "platform": "macOS-15.5-arm64",
    "gpu": "Apple M3 Max (mps)",          // or CUDA device name, or null
    "packages": { "torch": "2.7.1" }       // torch only for MVP; extensible
  },
  "hasErrors": false,
  "cells": [
    {
      "index": 0,
      "codeHash": "sha256:ab12…",           // hash of exact fence source
      "durationMs": 342,
      "outputs": [
        { "type": "stream", "name": "stdout", "text": "tensor([0.1, 0.9])\n" },
        { "type": "execute_result", "data": { "text/plain": "torch.Size([6, 6])" } },
        { "type": "display_data", "data": { "image/png": "assets/attention/01-attention-weights/0-0.png" } },
        { "type": "error", "ename": "ValueError", "evalue": "…", "traceback": ["…"] }
      ]
    }
  ]
}
```

Rules:

- Deterministic key order and stable formatting (2-space indent) → reviewable diffs.
- Images are **files**, referenced by relative path — never base64 in JSON. Asset filenames: `<cellIndex>-<outputIndex>.png`. The executor clears a page's asset dir before writing.
- Fresh kernel per page; cells executed in document order; default per-cell timeout 120 s.
- Env metadata gathered by running a probe snippet in the same kernel before cell 0.
- Errors are recorded (notebook-style) and execution of that page continues; the CLI exits non-zero if any page `hasErrors`.

## 5. CLI

Node CLI (commander), exposed as the `strides` bin from `@strides/cli`; consumer `package.json` scripts call it (`"dev": "strides dev"` etc.). All commands run from the notes-repo root and read `strides.config.ts`.

| Command | Behavior |
|---|---|
| `strides dev` | Preflight python env (see below) → spawn kernel gateway on a free port with CORS for the dev origin → spawn `next dev` with `NEXT_PUBLIC_STRIDES_KERNEL_URL` set → print both URLs. SIGINT/SIGTERM kills both children. If preflight fails, print the fix (`uv sync`) and continue with Next only (cells read-only). |
| `strides snapshot [glob]` | Execute cells per §4 for all pages (or pages matching glob relative to `contentDir`). Prints per-page summary (cells run, duration, errors). Exit 1 if any errors. |
| `strides build` | Runs `next build`. (Deploy is the host's job — e.g. Vercel builds the example with this.) |

Python preflight: resolve `<venv>/bin/python` from config; check `import ipykernel, jupyter_kernel_gateway` succeeds; friendly error otherwise.

## 6. Viz components

All SVG. All colors via theme CSS variables. Animation only through `motion`, encapsulated — authors never import an animation library.

### `Matrix` (`@strides/viz`)

```ts
interface MatrixProps {
  values: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  colorScale?: 'none' | 'sequential' | 'diverging'   // default 'none'; d3-scale under the hood
  precision?: number            // displayed decimals, default 2
  cellSize?: number             // px, default 44
  highlight?: { row?: number; col?: number; cell?: [number, number] }   // controlled highlight
  onCellHover?: (cell: { row: number; col: number; value: number } | null) => void
  id?: string                   // scene identity — see Scene
}
```

Renders a grid of `<rect>` + `<text>`; value changes animate (color/number tween). Hover highlights the cell (and calls back so composers can highlight rows etc.).

### `Scene` / `Step` (`@strides/viz`)

```mdx
<Scene autoPlayMs={2500}>
  <Step caption="Raw attention scores — every token sees every token">
    <Matrix id="A" values={raw} colorScale="sequential" />
  </Step>
  <Step caption="Causal mask: future positions set to −∞">
    <Matrix id="A" values={masked} colorScale="sequential" />
  </Step>
</Scene>
```

- `Scene` renders the current step's children inside a shared motion `LayoutGroup`; elements with the same `id` (mapped to `layoutId`) animate position/size/values across steps automatically.
- Controls: prev/next buttons, step dots, play/pause (advance every `autoPlayMs`, pause on any manual interaction), caption display. Left/right arrow keys work when the scene has focus.
- `Step` props: `caption?: string`.

### `AttentionHeatmap` (`@strides/viz-ml`)

```ts
interface AttentionHeatmapProps {
  weights: number[][]           // rows should sum to 1
  tokens: string[]              // axis labels, len === weights.length
  precision?: number
}
```

Built on `Matrix` (sequential color scale). Hover a cell → highlight the full row, tooltip with `P(query → key) = value`, and the row-sum displayed (demonstrating softmax rows sum to 1).

## 7. Dogfood content deliverable

- `content/getting-started/01-welcome.mdx` — kitchen sink: headings, table, inline + block math, static code fence, one trivial `python cell`, one small `<Matrix>`.
- `content/attention/01-attention-weights.mdx` — real chapter: computes a small (6-token) attention example in torch cells (embeddings → scores → softmax), a `<Scene>` stepping the causal mask (raw → mask → −∞ fill → softmax) authored inline from `Matrix` steps, and an `<AttentionHeatmap>` of the final weights. Values in viz props are hand-copied from cell outputs (data bridge is post-MVP).
- Python env: uv-managed `pyproject.toml` with `torch`, `ipykernel`, `jupyter_kernel_gateway`, `matplotlib`; `uv.lock` committed. `uv sync` creates `.venv`.

## 8. MVP acceptance criteria (demo script)

From a fresh clone on a machine with Node ≥ 20, pnpm, and uv:

1. `pnpm install`; then `uv sync` inside `examples/dl-notes` (creates `.venv` from `pyproject.toml` + `uv.lock`).
2. `pnpm --filter dl-notes dev` → site on localhost; sidebar shows both chapters; dark mode toggles everything including diagrams; KaTeX and highlighted code render.
3. On the attention page, press ▶ on the last cell → earlier cells auto-run first, outputs stream in, states visible; restart-kernel works.
4. `pnpm --filter dl-notes snapshot` → `snapshots/**.json` + `snapshots/assets/**` written; JSON diff is readable; env metadata present.
5. Stop everything. `pnpm --filter dl-notes build` then serve the build → cells show frozen outputs with no kernel; edit one cell's code in the MDX → rebuilt page shows the stale badge on that cell only.
6. Scene: prev/next/play through the causal-mask steps with smooth transitions; `AttentionHeatmap` hover shows row highlight, value tooltip, row sum ≈ 1.
