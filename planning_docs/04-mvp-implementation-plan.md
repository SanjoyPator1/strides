# 04 — MVP implementation plan

Status: **accepted** · Last updated: 2026-07-16

Phased build plan for the MVP defined in [03-mvp-spec](03-mvp-spec.md). Each phase ends in a verifiable state; do not start a phase until the previous phase's verification passes. Architecture context is in [02-architecture](02-architecture.md).

General rules:

- TypeScript strict everywhere; shared options in `tsconfig.base.json`, extended per package.
- Check latest stable versions when installing (Next.js App Router ≥ 15, React 19, MDX 3, `motion`, `@jupyterlab/services` ≥ 7). Prefer latest stable over pinning to this doc.
- Packages are consumed as TS source via `transpilePackages` — no package build step (see doc 02).
- Commits: short single-line messages, roughly one commit per completed task group.
- Testing: keep it light — vitest unit tests only where logic is easy to get subtly wrong (remark cell plugin, snapshot serialization, sidebar ordering). Everything else is covered by the per-phase manual verification checklists.

## Phase 0 — Workspace scaffold

**Tasks**

1. Root: `package.json` (private, workspace scripts), `pnpm-workspace.yaml` (`packages/*`, `examples/*`), `tsconfig.base.json` (strict, `moduleResolution: bundler`, React JSX), `.gitignore` (node_modules, .next, .venv, dist), MIT `LICENSE`, stub `README.md`.
2. Empty package skeletons for `packages/{theme,runtime,viz,viz-ml,cli}`: each with `package.json` (name `@strides/<name>`, `private` for now, `main`/`exports` pointing at `src/index.ts`), `tsconfig.json` extending base, `src/index.ts`.

**Verify**: `pnpm install` succeeds; `pnpm -r exec tsc --noEmit` passes.

## Phase 1 — Theme + example site (static content pipeline)

Goal: `examples/dl-notes` renders MDX chapters with sidebar, KaTeX, highlighting, dark mode. No cells, no viz yet.

**Tasks**

1. `@strides/theme` deps: `next-mdx-remote-client` (or direct `@mdx-js/mdx` if it fights RSC — see Risks), `remark-gfm remark-frontmatter remark-math rehype-katex`, shiki-based highlighter (`rehype-pretty-code`), `next-themes`, `gray-matter`, `katex`.
2. Content model (`src/content.ts`): scan `contentDir` → tree of sections/pages with slugs, titles (frontmatter > derived), ordering per spec §1. Export `getContentSlugs`, `getSidebarTree`, `loadPage(slug)` (raw MDX + frontmatter).
3. `StridesPage` (async server component): `loadPage` → compile MDX with plugin chain → render with component map (empty map for now). `StridesConfig` type + `withStrides` next-config helper (`transpilePackages`).
4. Layout: `StridesLayout` (header with title + theme toggle, sidebar from `getSidebarTree`, content column), `styles.css` with all CSS custom properties (light + dark values), responsive sidebar collapse.
5. `examples/dl-notes`: thin app per doc 02 anatomy — `strides.config.ts`, `next.config.mjs`, `app/layout.tsx`, `app/[[...slug]]/page.tsx` (uses `generateStaticParams` ← `getContentSlugs`), `content/getting-started/01-welcome.mdx` kitchen-sink page (spec §7, minus the cell and Matrix for now).
6. Unit tests: sidebar ordering + title derivation.

**Verify**: `pnpm --filter dl-notes dev` (plain `next dev` for now) renders the welcome page: sidebar, math, highlighted static code, working dark-mode toggle, responsive collapse. `next build` succeeds.

## Phase 2 — Runtime + CLI (cells end-to-end)

Goal: the full write → run → snapshot → frozen-publish loop works.

**Tasks**

1. `@strides/runtime` — remark cell plugin: ` ```python cell ` fences → `<PyCell code index />`; error on non-python `cell` fences. Unit-test with `@mdx-js/mdx` compile (fence with backticks inside, multiple cells, mixed static/cell fences).
2. Kernel client (`src/kernel.ts`): wrap `@jupyterlab/services` — connect to gateway URL, start/shutdown kernel, `execute(code, onOutput)` translating iopub messages to the spec §3 output model. Works in browser and Node (inject `ws` as the WebSocket impl in Node).
3. React pieces: `KernelProvider` (per-page session, lazy start, run-ordering guarantee: running cell N runs earlier un-run cells first; restart control), `SnapshotProvider` (page snapshot JSON), `PyCell` (server part: shiki-highlighted code; client part: state machine `idle/queued/running/ok/error`, controls in dev, frozen outputs + stale-hash badge otherwise — full behavior table in spec §3).
4. Snapshot executor (`src/snapshot.ts`, Node): per spec §4 — fresh kernel per page, env probe snippet, deterministic JSON serialization, image extraction to asset files, per-cell timeout, `hasErrors` handling. Unit-test serialization determinism.
5. `@strides/cli`: commander bin with `dev` (preflight → spawn gateway on free port with CORS → spawn `next dev` with `NEXT_PUBLIC_STRIDES_KERNEL_URL` → clean shutdown of both on exit; degrade gracefully if preflight fails), `snapshot [glob]`, `build`. Config loading via `jiti`.
6. Wire into theme + example: theme's `StridesPage` wraps content in `SnapshotProvider` (+ `KernelProvider` in dev), component map gains `PyCell`; example scripts become `strides dev|snapshot|build`; add the uv-managed `pyproject.toml` (+ committed `uv.lock`) and the trivial cell to the welcome page.

**Verify** (needs `uv sync` run in the example first): spec §8 steps 3–5 — live run with streaming output and auto-run-above; snapshot files + assets written and readable; production build renders frozen outputs with gateway stopped; stale badge appears after editing one cell.

## Phase 3 — Viz (Matrix, Scene, AttentionHeatmap) + real chapter

**Tasks**

1. `@strides/viz` deps: `motion`, `d3-scale`, `d3-interpolate`. Color utilities reading theme CSS variables; sequential + diverging scales.
2. `Matrix` per spec §6: SVG grid, labels, color scales, controlled `highlight`, `onCellHover`, animated value/color changes, `id` → `layoutId`.
3. `Scene`/`Step` per spec §6: `LayoutGroup` + `AnimatePresence`, step state, prev/next/dots/play-pause controls, captions, arrow-key support, `autoPlayMs`.
4. `@strides/viz-ml`: `AttentionHeatmap` on top of `Matrix` — row highlight on hover, value tooltip, row-sum display.
5. Register viz components in the theme component map. Author `content/attention/01-attention-weights.mdx` per spec §7 (torch cells + inline causal-mask `Scene` + `AttentionHeatmap`); run `strides snapshot` and commit snapshots.

**Verify**: spec §8 step 6 — smooth cross-step transitions (same-`id` matrices tween, not remount), play/pause behavior, hover interactions correct in both themes; page still builds statically with frozen outputs.

## Phase 4 — MVP hardening and wrap-up

**Tasks**

1. Error/edge states polish: gateway-down banner, kernel-died recovery (restart control), long-output collapse, image output sizing.
2. Root `README.md` (what strides is, monorepo map, how to run the example — no marketing) and `examples/dl-notes/README.md` (venv setup, the three commands).
3. Full acceptance pass: run spec §8 end-to-end from a fresh clone; fix what fails.
4. Optional if a Vercel account/remote is set up by then: deploy `examples/dl-notes` and confirm the static story on real hosting.

**Definition of done**: every step of spec §8 passes from a fresh clone.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `@jupyterlab/services` in the browser bundle (Next/webpack polyfill friction) | Import only in client components via dynamic import; keep kernel code out of server bundles. Known-workable — JupyterLite and gateway clients do this |
| Kernel gateway CORS/WebSocket handshake quirks | Set `allow_origin` explicitly to the dev origin; verify WS upgrade early in Phase 2 with a spike before building UI around it |
| MDX/RSC integration (async server components in the MDX component map) | If `next-mdx-remote-client` RSC mode fights async components, fall back to direct `@mdx-js/mdx` `compile`+`run` in the route, or make `PyCell` fully client-side with client shiki (`shiki/core`, two themes only) |
| Windows paths / venv layout (`Scripts/python.exe` vs `bin/python`) | Abstract python resolution in one CLI function; MVP targets macOS/Linux, keep the seam clean for Windows later |
| Snapshot nondeterminism (timestamps, memory addresses like `<object at 0x…>` in outputs) | Fresh kernel per page is the main lever; document that authors should seed RNGs; do not diff-normalize outputs in MVP |
| motion `layoutId` transitions across SVG elements misbehaving | Spike in Phase 3 task 3 before building `Scene`'s API around it; fallback is explicit tweening of positions with springs (same authoring API, more internal code) |

## Deferred (tracked in doc 01 roadmap)

`create-strides`, docs site, npm publish + changesets, data bridge (`strides.export`), remaining primitives and composed scenes, content extraction to its own repo, search, CI.
