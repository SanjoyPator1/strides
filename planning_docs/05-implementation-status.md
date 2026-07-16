# 05 — Implementation status

Status: **living document** — update as work completes · Started: 2026-07-16

Tracks progress against [04-mvp-implementation-plan](04-mvp-implementation-plan.md). Task details and verification gates live there; this doc only records state. Check items off as they are completed, and log every deviation from the plan/spec in the table at the bottom.

## Phase progress

### Phase 0 — Workspace scaffold — `done`

- [x] Root workspace files (package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, LICENSE, README stub)
- [x] Package skeletons for theme / runtime / viz / viz-ml / cli
- [x] Verify: `pnpm install` + `pnpm -r exec tsc --noEmit` pass

### Phase 1 — Theme + example site — `done`

- [x] Theme deps + MDX plugin chain
- [x] Content model (scan, slugs, titles, ordering) + unit tests
- [x] `StridesPage`, `StridesConfig`, `withStrides`
- [x] `StridesLayout`, styles (CSS variables, light/dark), responsive sidebar
- [x] `examples/dl-notes` thin app + welcome kitchen-sink page
- [x] Verify: dev render checklist + `next build` pass

### Phase 2 — Runtime + CLI — `done`

- [x] Remark cell plugin + unit tests
- [x] Kernel client (browser + Node) — includes the gateway WebSocket spike
- [x] `KernelProvider` / `SnapshotProvider` / `PyCell` (all three mode behaviors)
- [x] Snapshot executor + deterministic serialization tests
- [x] CLI: `dev` / `snapshot` / `build`
- [x] Wire into theme + example (pyproject.toml/uv.lock, first cell on welcome page)
- [x] Verify: spec §8 steps 3–5 pass

### Phase 3 — Viz + real chapter — `not started`

- [ ] Color utilities + scales
- [ ] `Matrix`
- [ ] `Scene` / `Step` — includes the `layoutId`-across-SVG spike
- [ ] `AttentionHeatmap`
- [ ] Attention chapter authored, snapshotted, committed
- [ ] Verify: spec §8 step 6 passes

### Phase 4 — Hardening + wrap-up — `not started`

- [ ] Error/edge-state polish
- [ ] READMEs (root + example)
- [ ] Full acceptance pass from fresh clone (spec §8, all steps)
- [ ] Optional: Vercel deploy of the example

## Deviation / decision log

Record anything done differently from docs 02–04, with reasoning. Blocked items go here too.

| Date | Phase | What changed and why |
|------|-------|----------------------|
| 2026-07-16 | 0 | pnpm wasn't preinstalled; enabled via `corepack enable pnpm` (Node ships corepack). No plan change, noted for fresh-clone reproducibility. |
| 2026-07-16 | 0 | `typescript` pinned to `^7.0.2` (npm `latest` tag) per doc 04's "prefer latest stable" rule — this is TypeScript's native/Go-ported major version, a bigger jump than the 5.x line the docs were written against. Flagging in case later phases hit ecosystem tooling (ts-node, ESLint plugins, etc.) that hasn't caught up yet. |
| 2026-07-16 | 1 | The TS 7.0.2 risk above materialized: `next dev` didn't recognize it as a valid TypeScript install and keeps re-triggering its "installing missing TypeScript" flow. Downgraded `typescript` to `^5.9.3` (latest 5.x, what Next.js 16.2.10's tooling is actually built against) repo-wide. Revisit once Next's TS integration supports TS 7. |
| 2026-07-16 | 1 | Chose direct `@mdx-js/mdx`-based compilation via `next-mdx-remote-client/rsc`'s `MDXRemote` (doc 04 task 1's first-listed option) since Phase 1's component map is empty — no async-RSC friction yet. Revisit if Phase 2/3's `PyCell`/viz components fight this (documented fallback: direct `@mdx-js/mdx` compile+run). |
| 2026-07-16 | 1 | `next.config.mjs` is loaded directly by Node, not bundled — importing `@strides/theme`'s barrel (`.`) from it pulled in React/JSX/CSS-laden components Node can't execute raw. Fixed by giving `@strides/theme` a second, dependency-free subpath export (`@strides/theme/config` → `src/config.ts`) for `withStrides`/`StridesConfig`, used only from `next.config.mjs`. |
| 2026-07-16 | 1 | Internal relative imports across `@strides/theme` use extensionless specifiers (e.g. `from './content'`), not the NodeNext-style `.js` suffix — confirmed by testing that Turbopack resolves the former but not the latter for `.ts` sources under `moduleResolution: "bundler"`. |
| 2026-07-16 | 2 | Preflight/gateway spawn check `import ipykernel, kernel_gateway`, not `jupyter_kernel_gateway` as spec §5 literally states — the pip package `jupyter-kernel-gateway` installs a module actually named `kernel_gateway` (verified via its RECORD/entry_points). Same intent (confirm both are importable), corrected module name. |
| 2026-07-16 | 2 | `%matplotlib inline` is executed silently (not shown as a cell) on kernel start/restart — without it, `plt.show()` only prints a "non-GUI backend" warning and never emits a `display_data`/image output at all. Confirmed via a live spike against the gateway before wiring `KernelProvider`/the snapshot executor around it. |
| 2026-07-16 | 2 | Frozen image assets: doc 02's consumer anatomy doesn't say how `snapshots/assets/**` images reach the browser. `strides dev`/`strides build` now mirror `snapshotDir/assets` into `<app>/public/_strides/assets` (gitignored build artifact, not a second source of truth) before invoking Next, so images are plain static files at `/_strides/assets/...`. Not yet exercised end-to-end (no image-producing cell until Phase 3's attention chapter) — revisit then. |
| 2026-07-16 | 2 | `SnapshotProvider` is a plain function `(components, snapshot) => components`, not a React context — MDX invokes components from the static component map by name at each fence site, arbitrarily deep in the tree, so binding the page's snapshot into `PyCell` at component-map-construction time (server-side, in `StridesPage`) is the only place per-page data can reach it; a client Context would work for `PyCellClient` but not for `PyCell`'s server-side shiki-highlight/stale-hash step. Documented in the code. |
| 2026-07-16 | 2 | `@strides/cli`'s `bin` entry (`src/bin.mjs`) is a tiny bootstrap that loads the real CLI (`src/cli.ts`) via `jiti`, rather than a shebang pointing straight at a `.ts` file. The CLI is a plain Node process (never bundled by Turbopack/webpack), and Node's native TS type-stripping does not resolve extensionless or `.js`-suffixed relative specifiers to `.ts` files the way Turbopack does — confirmed by testing. `jiti` (already a dependency for `strides.config.ts` loading) resolves extensionless TS imports natively, letting the CLI's own source use the same import convention as the rest of the monorepo. |
| 2026-07-16 | 2 | `@strides/runtime` gained a second subpath export, `@strides/runtime/node` (content-scan/snapshot/kernel-client utilities, no React), for the same reason as `@strides/theme/config` in Phase 1: `@strides/cli` loads modules directly via `jiti` (never bundled), and importing the full barrel pulled in `.tsx` component files whose JSX `jiti`'s loader couldn't parse in that context. |
| 2026-07-16 | 2 | Snapshot executor: on a per-cell timeout it records a synthetic `TimeoutError` output for that cell, marks the page `hasErrors`, and stops running further cells on that page (the kernel may be wedged) rather than interrupting the kernel and continuing. A deliberate MVP-scope simplification; not specified either way by spec §4. |
| 2026-07-16 | 2 | No browser-automation tool (Playwright, screenshots, etc.) is available in this environment, so the live "Dev, kernel reachable" Run/Restart interaction (spec §8 step 3) wasn't clicked through in an actual browser. Verified instead by: (a) a Node script running the welcome page's exact cell code through `StridesKernelClient` against the same gateway `strides dev` spawned, confirming outputs match the output model; (b) inspecting server-rendered HTML/CSS for all three `PyCell` modes (published, dev-with-snapshot, stale-badge-after-edit); (c) confirming `strides dev`'s SIGTERM cleanup kills both child processes. The client-side state-machine transitions (queued→running→ok, live streaming, restart button) are implemented and code-reviewed but not interactively verified — recommend a manual click-through before relying on it. |
