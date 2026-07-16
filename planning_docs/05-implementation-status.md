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

### Phase 3 — Viz + real chapter — `done`

- [x] Color utilities + scales
- [x] `Matrix`
- [x] `Scene` / `Step` — includes the `layoutId`-across-SVG spike
- [x] `AttentionHeatmap`
- [x] Attention chapter authored, snapshotted, committed
- [x] Verify: spec §8 step 6 passes

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
| 2026-07-16 | 3 | Color scale (`useColorScale`): resolves the theme's `--strides-viz-*` CSS custom properties via `getComputedStyle` + a `MutationObserver` on `<html>`'s class attribute, then feeds the resolved hex strings into `d3.scaleSequential`/`d3.scaleDiverging` (`d3-interpolate`'s `interpolateRgb`/`piecewise`). This is a small amount of bridging JS, not the literal "no JS" wording in doc 02/03 — but architecture doc 02 explicitly mandates d3-scale/d3-interpolate as viz's math tools, which need actual resolved color values, not CSS `var()` references. A pure-CSS `color-mix()` alternative was considered and rejected as needlessly clever for MVP. |
| 2026-07-16 | 3 | `Matrix`'s `layoutId` (from its `id` prop) is applied **per cell** (`${id}-cell-{row}-{col}`), not once on the whole matrix — needed so that when Scene swaps one mounted `<Matrix id="A">` for a different one with the same id, each cell's *fill color* crossfades via Framer Motion's shared-layout mechanism, not just its position. Matches the Phase 3 verify line "same-id matrices tween, not remount." |
| 2026-07-16 | 3 | No browser-automation tool was available to click through Scene's prev/next/dots/keyboard/autoplay or AttentionHeatmap's hover, same limitation as Phase 2. Added real `jsdom` + `@testing-library/react` behavioral tests (not just code review) covering: step advance/wraparound, dot navigation, arrow-key handling, autoplay-then-pause-on-interaction (`Scene.test.tsx`, 6 tests), and hover → tooltip/row-sum/row-highlight (`AttentionHeatmap.test.tsx`, 3 tests). Visual smoothness of the actual tween animation still wasn't observed — recommend a manual look before relying on it. |
| 2026-07-16 | 3 | The attention chapter's toy example uses `torch.randn(...) * 0.3` (scaled-down) projections with `torch.manual_seed(7)`, not raw unscaled `randn`. An unscaled version produced a near one-hot attention distribution (all weight on a single token per row) — technically correct but a poor illustration of "soft" attention. Scaling down is a standard toy-example technique for a legible distribution; noted since spec §7 doesn't specify exact numbers, only the shape of the computation. |
| 2026-07-16 | 3 | Closed out Phase 2's open item: added a `matplotlib` cell (`imshow` of the attention weights) to the attention chapter specifically to exercise the image-output pipeline end-to-end for the first time. Confirmed working: PNG written to `snapshots/assets/attention/01-attention-weights/5-0.png`, mirrored to `public/_strides/assets/...` by `strides build`, and served with `Content-Type: image/png` in a production `next start`. |
| 2026-07-16 | 3 | Found and fixed a real `.gitignore` bug while verifying the above: `public/_strides/` is anchored to the repo root by git's ignore-pattern rules (any pattern containing a non-trailing `/` is anchored to the `.gitignore`'s location), so it silently failed to match `examples/dl-notes/public/_strides/` and the generated PNG copy showed up as untracked. Fixed to `**/public/_strides/`. Worth double-checking any other nested-package gitignore patterns added later for the same anchoring mistake. |
| 2026-07-16 | 3→4 | User manual browser testing (the thing no automated tool here could do) surfaced a real bug immediately: `KernelProvider`'s context `value` was `useMemo`'d with `status` exposed via a `get status()` getter, deps `[gatewayUrl]` only. Calling `forceRender()` after the health check resolved re-rendered the provider but returned the *same cached object reference* (deps unchanged), so React Context never propagated the change to consumers — `PyCellClient`/`KernelStatusBar` stayed frozen at the mount-time `'checking'` status forever, regardless of whether the gateway was actually reachable. Not a CORS/network issue (verified separately that CORS itself works correctly when origins match) — a pure React Context stale-reference bug, 100% reproducible. Fixed by making `status` a plain property and adding a version counter to `useMemo`'s deps so a fresh object is produced whenever `forceRender()` fires. Added `KernelProvider.test.tsx` (mocks `fetch`, asserts a consumer actually observes `checking → ready`/`unavailable`) — confirmed it fails against the old code and passes against the fix. |
| 2026-07-16 | 3→4 | Also tightened `strides dev`: binds `next dev` to `--hostname localhost` (was the Next default `0.0.0.0`, which also prints a LAN "Network" URL). If a browser is pointed at the Network URL instead of `localhost`, its `Origin` header won't match the exact string passed as `KG_ALLOW_ORIGIN`, and the kernel gateway will 404 the request (verified this directly — mismatched origin gets a bare 404, not just a missing CORS header). Binding to `localhost` only removes that footgun; this was a secondary hardening fix, not the root cause of the bug above. |
| 2026-07-16 | 3→4 | Small course-corrections from user feedback ahead of formal Phase 4: (a) welcome page was still missing spec §7's "one small `<Matrix>`" — added, and fixed the kitchen-sink table's stale "Interactive diagrams: coming in Phase 3" row; (b) `next-themes` `defaultTheme` changed from `"system"` (spec 03 §2's literal wording) to `"light"` per explicit user preference — noted as an intentional deviation from the spec's default; (c) `PyCell` outputs were rendering inside the same boxed/padded `<pre>` styling meant for static code fences, reading as a "card nested in a card" instead of plain Jupyter-style output text — scoped a more specific override so outputs render as flat text under the code. |
