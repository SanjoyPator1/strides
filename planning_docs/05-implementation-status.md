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

### Phase 2 — Runtime + CLI — `not started`

- [ ] Remark cell plugin + unit tests
- [ ] Kernel client (browser + Node) — includes the gateway WebSocket spike
- [ ] `KernelProvider` / `SnapshotProvider` / `PyCell` (all three mode behaviors)
- [ ] Snapshot executor + deterministic serialization tests
- [ ] CLI: `dev` / `snapshot` / `build`
- [ ] Wire into theme + example (requirements.txt, first cell on welcome page)
- [ ] Verify: spec §8 steps 3–5 pass

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
