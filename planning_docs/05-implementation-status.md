# 05 — Implementation status

Status: **living document** — update as work completes · Started: 2026-07-16

Tracks progress against [04-mvp-implementation-plan](04-mvp-implementation-plan.md). Task details and verification gates live there; this doc only records state. Check items off as they are completed, and log every deviation from the plan/spec in the table at the bottom.

## Phase progress

### Phase 0 — Workspace scaffold — `not started`

- [ ] Root workspace files (package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, LICENSE, README stub)
- [ ] Package skeletons for theme / runtime / viz / viz-ml / cli
- [ ] Verify: `pnpm install` + `pnpm -r exec tsc --noEmit` pass

### Phase 1 — Theme + example site — `not started`

- [ ] Theme deps + MDX plugin chain
- [ ] Content model (scan, slugs, titles, ordering) + unit tests
- [ ] `StridesPage`, `StridesConfig`, `withStrides`
- [ ] `StridesLayout`, styles (CSS variables, light/dark), responsive sidebar
- [ ] `examples/dl-notes` thin app + welcome kitchen-sink page
- [ ] Verify: dev render checklist + `next build` pass

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
| — | — | — |
