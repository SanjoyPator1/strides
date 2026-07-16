# 02 — Architecture

Status: **accepted** · Last updated: 2026-07-16

## Monorepo layout

pnpm workspaces. No build orchestrator (turborepo etc.) for now — plain `pnpm --filter` is enough at this size.

```
strides/
├── package.json               # workspace root, shared scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json         # strict TS, shared compiler options
├── LICENSE                    # MIT
├── README.md
├── planning_docs/
├── packages/
│   ├── theme/                 # @strides/theme    — layout, sidebar, MDX pipeline, styles
│   ├── runtime/               # @strides/runtime  — cell system: kernel client, snapshot format/executor
│   ├── viz/                   # @strides/viz      — domain-agnostic primitives (Matrix, Scene, …)
│   ├── viz-ml/                # @strides/viz-ml   — ML-specific components (AttentionHeatmap, …)
│   └── cli/                   # @strides/cli      — `strides dev | snapshot | build`
└── examples/
    └── dl-notes/              # dogfood content: a real consumer app (thin Next.js app)
```

Post-MVP additions (not built yet): `packages/create-strides` (scaffolder), `apps/docs` (documentation site built with strides).

### Package responsibilities and dependencies

| Package | Responsibility | Depends on |
|---|---|---|
| `@strides/theme` | `StridesLayout`, sidebar generation from the content directory, MDX compile/render helpers (`getContentSlugs`, `StridesPage`), KaTeX, code highlighting, dark mode, base CSS | `@strides/runtime` (renders cells), MDX/remark/rehype toolchain |
| `@strides/runtime` | Remark plugin turning marked code fences into cells; `PyCell` component (live + frozen modes); kernel client; snapshot executor + format; `SnapshotProvider`/`KernelProvider` | `@jupyterlab/services` |
| `@strides/viz` | `Matrix`, `Scene`/`Step`, color-scale utilities. No ML knowledge | `motion`, `d3-scale`, `d3-interpolate` |
| `@strides/viz-ml` | `AttentionHeatmap` (more later) | `@strides/viz` |
| `@strides/cli` | Process orchestration: spawn kernel gateway + Next dev; run snapshot executor; wrap `next build` | `@strides/runtime` (executor) |

Dependency direction is one-way: `viz-ml → viz`, `theme → runtime`, `cli → runtime`. `viz` and `runtime` are independent of each other.

### Packages are consumed as TypeScript source (MVP)

No package build step. The consumer app's `next.config` uses `transpilePackages: ['@strides/theme', '@strides/runtime', '@strides/viz', '@strides/viz-ml']` so Next compiles workspace sources directly. Real builds (tsup, exports maps, `.d.ts`) arrive with npm publishing, post-MVP.

## Consumer repo anatomy (what a "notes site" is)

`examples/dl-notes` is the canonical instance — the scaffolder will later generate exactly this shape:

```
my-notes/
├── strides.config.ts     # site title, content dir, python env settings
├── next.config.mjs       # ~3 lines: export default withStrides({})
├── package.json          # deps: next, react, @strides/* ; scripts call the strides CLI
├── app/
│   ├── layout.tsx        # ~10 lines: <StridesLayout config={…}>{children}</StridesLayout>
│   └── [[...slug]]/
│       └── page.tsx      # ~10 lines: delegates to theme's StridesPage + getContentSlugs
├── content/              # chapters: folders → sidebar sections, .mdx files → pages
├── snapshots/            # frozen cell outputs (committed), mirrors content/ structure
│   └── assets/           # image outputs referenced by snapshot JSON
├── pyproject.toml        # python deps for cells (torch, ipykernel, jupyter_kernel_gateway, …)
├── uv.lock               # committed — reproducible cell environments
└── .venv/                # gitignored; created by `uv sync`
```

The app files are deliberately trivial — all real logic lives in `@strides/theme` so framework upgrades are version bumps.

## Tech stack

| Concern | Choice | Rationale |
|---|---|---|
| Site framework | Next.js (App Router), React 19 | SSG for the static publish story; RSC lets MDX render server-side with client islands for cells/viz. Use latest stable versions at install time |
| Content | MDX 3, compiled at build/request time in the catch-all route (not file-based `app/` routing) | Content lives in `content/` outside `app/`; the route reads, compiles, and statically generates pages |
| MDX plugins | `remark-gfm`, `remark-frontmatter`, `remark-math`, `rehype-katex`, shiki-based highlighting for static fences | Standard, well-maintained |
| Math | KaTeX | Fast, static-friendly |
| Cell execution | Jupyter Kernel Gateway (`jupyter_kernel_gateway` in the notes repo's venv) + `@jupyterlab/services` as the client — in the browser (dev) and in Node (snapshot executor) | Official protocol client; one execution code path for both live and snapshot runs; kernel protocol is language-agnostic, keeping the door open beyond Python |
| Viz rendering | React-rendered SVG | See below |
| Animation | `motion` (Framer Motion) — hidden inside `Scene`, never exposed in authoring APIs | Cross-step transitions via `layoutId` layout animation; swappable later (e.g. GSAP) without touching content |
| Viz math | `d3-scale`, `d3-interpolate` only — never `d3-selection`/`d3-transition` | React owns the DOM; D3 is used as a math library |
| Styling | Plain CSS with custom properties, shipped by `@strides/theme`; `next-themes` for dark mode | No Tailwind: avoids imposing build config on consumers; CSS variables make diagrams theme-aware for free |
| Package manager | pnpm workspaces | Standard for this shape of monorepo |

### Rendering choice: SVG (not canvas, not WebGL/three.js, not D3-DOM)

The visual content is text-heavy 2D linear algebra with dense per-element interaction. That decides the renderer:

- **Hover is the core interaction** (hover a heatmap cell → highlight row → show value). SVG elements are DOM nodes: `onMouseEnter` per cell, browser does hit-testing. Canvas/WebGL require manual hit-testing against a bitmap; three.js requires raycasting.
- **Text everywhere** — labels, indices, math symbols. SVG text is vector-crisp at any zoom/DPI and can mix with KaTeX. Canvas text is rasterized; WebGL text needs sprite/SDF workarounds.
- **Theming** — SVG fills can reference CSS custom properties, so dark mode flips diagrams instantly. Canvas bakes colors into pixels.
- **Static rendering** — SVG server-renders; diagrams exist in the HTML before hydration. Canvas is blank until JS runs — wrong fit for a static-publish framework.
- **Scale bound** is the one canvas advantage: SVG degrades past a few thousand animated nodes. Pedagogical matrices are 6×6–64×64 (36–4,096 cells) — inside budget. If a huge heatmap is ever needed, `Matrix` can switch to canvas internally above a size threshold without changing its props.
- **No free-orbit 3D** in the product (decision #6): multi-dimensional tensors render as isometric stacked slices in SVG, animated between scene steps. If a single component someday truly needs a camera, react-three-fiber can power that one island.

## Execution architecture

### Dev mode (`strides dev`)

```
strides dev
 ├─ preflight: resolve python from strides.config (default .venv), verify
 │             ipykernel + jupyter_kernel_gateway importable
 ├─ spawn: jupyter kernel gateway on a free port (CORS allowing the site origin)
 └─ spawn: next dev, with NEXT_PUBLIC_STRIDES_KERNEL_URL=<gateway url>

browser page
 └─ KernelProvider (theme layout, dev only)
     └─ one kernel session per page (lazy: started on first Run)
         └─ PyCell "Run" → execute_request over WebSocket → iopub outputs stream into the cell
```

Cells on a page share one kernel session and are guaranteed top-to-bottom order: running cell N first runs any earlier cells that haven't run this session. A per-page "Restart kernel" control resets the session.

### Snapshot mode (`strides snapshot`)

```
strides snapshot [glob]
 ├─ spawn kernel gateway (as above)
 └─ for each content page (fresh kernel per page, for determinism):
     ├─ extract cells from MDX in document order
     ├─ execute sequentially via @jupyterlab/services (Node), per-cell timeout
     ├─ collect outputs; write images to snapshots/assets/<page>/…
     ├─ probe env metadata (python/torch versions, platform, GPU) via a probe snippet
     └─ write snapshots/<page>.json (deterministic key order)
```

Exit code is non-zero if any cell errored (errors are still recorded in the snapshot, notebook-style).

### Published mode (`strides build` → static hosting)

No kernel, no gateway, no env vars. The page route loads the page's snapshot JSON server-side and wraps the MDX render in `SnapshotProvider`. `PyCell` finds no kernel context and renders code + frozen outputs. A content-hash mismatch between the fence and its snapshot entry renders a "stale output" badge. Cells with no snapshot entry render code with a "never run" note.

## Configuration

`strides.config.ts` (consumer repo), imported directly by the app files and read by the CLI (via a TS-capable loader such as `jiti`):

```ts
import type { StridesConfig } from '@strides/theme'

const config: StridesConfig = {
  title: 'DL Notes',
  description: 'Interactive deep learning notes',   // optional
  contentDir: 'content',                            // default
  snapshotDir: 'snapshots',                         // default
  python: {
    venv: '.venv',                                  // default; resolved relative to repo root
  },
}
export default config
```

Keep the surface minimal; grow it only when a real need appears.
