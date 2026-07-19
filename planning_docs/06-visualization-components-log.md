# 06 — Visualization component library: implementation log

Status: **living document** — update as work continues · Started: 2026-07-16

Tracks the visualization component work that followed Phase 3 (see
[05-implementation-status](05-implementation-status.md)). This work is deliberately running
*ahead of* Phase 4 (READMEs, hardening) — the diagrams and their APIs were expected to churn
as more visualization variety got built, so polish/docs were pushed later rather than chasing
a moving target. It also pulls forward parts of [01-project-overview](01-project-overview.md)'s
roadmap item 4 ("viz growth") earlier than originally sequenced, plus adds a component family
(architecture-diagram primitives) not called out explicitly in that roadmap.

Unlike doc 05, this doc isn't tracking a pre-written task list — it's a build log: what got
added, in what order, what broke, and how it was fixed. Component API details live in the
components' own source/tests, not here.

## Component inventory

### `@strides/viz` (domain-agnostic SVG primitives)

| Component | Purpose |
|---|---|
| `Matrix` | Grid of values as colored cells (`sequential`/`diverging`/`highlight` scales); optional row/col `groups` (colored brackets), symbolic `cellLabels`, `anchorPrefix` (per-cell arrow anchors), `getLayoutId` override. `getMatrixSize` exported for callers that need to reserve layout space. |
| `Scene` / `Step` | Stepped/playable scene shell (prev/next/dots/keyboard/autoplay); same-`id` children tween via shared `layoutId`s instead of remounting. |
| `useColorScale` | Sequential/diverging scale hook, resolves the theme's `--strides-viz-*` CSS variables. |
| `useAnimatedNumber` | Tweened numeric value hook. |
| `ArrowOverlay`, `Anchor`, `useAnchorRef`, `Arrow` | Anchor-based connector system — arrows connect named anchors anywhere in the tree, at any relative position. `Arrow` supports `path`: `straight` / `curved` / `elbow`, and `dashed`. |
| `TensorSlices` | A 3D tensor as a row or offset stack of 2D `Matrix` slices; click-to-focus brings a slice to the front. |
| `TensorExplorer` | Recursive click-to-drill viewer for an arbitrary-depth tensor (e.g. batch → token → head → head_dim); first path auto-expands, siblings collapse independently. |
| `Tabs` | Plain tab strip; `onChange` is optional so it's safe to use directly from server-rendered MDX. |
| `Node` | A labeled, shaped box (`rect` / `pill` / `hexagon` / `trapezoid` / `circle`), anchor-aware. |
| `Group` | Colored background region clustering nodes; optional `label`; optional `repeat` (renders a brace + "× N" for a block that's stacked N times). |
| `Flow` | Auto-connecting vertical/horizontal pipeline — one arrow per gap; `extraArrows` for skip/residual connections, routed around intervening nodes. |
| `Detail`, `DetailRail`, `DetailRailProvider` | Click-to-expand connected detail panel — clicking a node's summary reveals a sub-diagram, connected by an auto-drawn dashed arrow. With a `DetailRailProvider`/`DetailRail` pair, the panel portals out to expand *beside* the main diagram instead of stacking underneath its trigger. |

### `@strides/viz-ml` (ML-specific compositions)

| Component | Purpose |
|---|---|
| `AttentionHeatmap` | Hover-to-inspect attention weight heatmap (Phase 3). |
| `HeadSplitViz` | Animated reshape from one wide `(tokens, d_model)` matrix into per-head slices, via a two-step `Scene`. |

## Build log

**2026-07-16 — tensor-shape visualization.** Built `TensorSlices` and `TensorExplorer` for
showing multi-dimensional attention tensors (batch/sequence/head/head_dim) — the original
prompt for this track. Added `Tabs` and `HeadSplitViz`, wired gallery examples for all of the
above, and added an attention-page section reshaping the page's real `Q` matrix through
`HeadSplitViz` and `TensorExplorer`. `TensorExplorer` was built click-to-drill and
depth-colored per the "batch/token/head/head_dim, color the background, click to expand" brief.

**2026-07-16 — four standing bugs fixed and committed.** Found via live browser testing
while the above was in progress (see the deviation log in
[05-implementation-status](05-implementation-status.md) for the Run-button/Context bug and the
CORS/port hardening from the same pass): dark-mode-by-default reverted to light per explicit
preference, stale "Phase 3" copy in the welcome kitchen-sink table corrected, and `PyCell`
output styling flattened to stop reading as a card nested in a card.

**2026-07-16 — architecture-diagram primitives.** A second visualization family, requested
separately from the tensor-shape work above: labeled/shaped/colored operation boxes connected
by arrows (including right-angle routing for residual connections, and dashed lines for
"zoomed detail" callouts), grouped into colored background regions — the standard look of a
transformer/GPT architecture diagram. Built `Node`, `Group`, `Flow`, and extended `Arrow` with
a `path` prop (`straight`/`curved`/`elbow`) and `dashed`, replacing the earlier `curved`
boolean. Gallery examples added for all of it, including a `Flow`-built transformer-block
reconstruction with two residual `extraArrows`, and a dashed "zoomed detail" two-panel demo.

**2026-07-19 — full GPT model diagram + interactive detail panels.** Added a complete,
end-to-end GPT model diagram to the attention page (token/positional embedding → repeated
transformer block → final LayerNorm → output), reproducing a reference architecture diagram
in full rather than just the single-block excerpt built the prior session. This surfaced the
elbow-routing bug below. Follow-up request asked for the detail-callout panels to be
click-to-expand rather than always-shown, plus a "repeats N times" annotation and text
callouts pointing at specific sections with an arrow — added `Detail`/`DetailRail`/
`DetailRailProvider`, `Group`'s `repeat` prop, and a small annotation column (plain text +
curved `Arrow`, no new component needed) demonstrating all three on the GPT diagram and in the
gallery.

## Bugs found and fixed

Every fix below shipped with a jsdom + `@testing-library/react` test proving it — several
explicitly verified to fail against the pre-fix code first. No browser-automation tool is
available in this environment (same limitation noted in doc 05's Phase 2/3 entries), so this
test-first discipline is the main safety net between visualization changes and the user's own
live browser testing, which is what actually surfaced most of the bugs below.

| Date | Component | Bug | Fix |
|------|-----------|-----|-----|
| 2026-07-16 | `Matrix` | Framer Motion console warning ("animate fill from undefined") on mount | Added `initial={{ fill: color }}` alongside `animate` on the cell's `motion.rect` |
| 2026-07-16 | `color-scale.ts` | Hydration mismatch: `useVizColors`'s `useState(readCssVars)` lazy initializer branched on `typeof window`, producing different values on the server's first render vs. the client's | Initial state is now a fixed `FALLBACK_COLORS` literal; the real `getComputedStyle` read moved into a client-only `useLayoutEffect` |
| 2026-07-16 | `TensorSlices` (stack layout) | Cards overlapped following page content — `position: absolute` children don't contribute to a parent's layout size, and `paddingBottom`/`paddingRight` doesn't reserve space for them either | Container `width`/`height` now computed explicitly via the extracted `getMatrixSize()` helper |
| 2026-07-16 | `TensorSlices` (focus) | Clicking a card stacked behind others didn't bring it forward — an inline `style={{ zIndex: index }}` always wins over the CSS `.strides-tensor-slice--focused { z-index: 5 }` rule, making that rule permanently dead | `zIndex` is now computed inline (`isFocused ? slices.length : index`), plus a lift/shadow for the stack layout specifically |
| 2026-07-16 | Gallery content | Stacked `TensorSlices` demo wasn't clickable | Content-only bug — that one demo was missing the `focusable` prop the sibling row-layout demo already had |
| 2026-07-16 | `Tabs` | Crashed with "Event handlers cannot be passed to Client Component props" when used directly from MDX | MDX is server-rendered and can't pass an inline closure to a `'use client'` component; made `onChange` optional and dropped the closure from the MDX usage |
| 2026-07-16 | `Arrow`/`Anchor` | "Maximum update depth exceeded" infinite render loop | `Anchor`'s inline `ref={(el) => ...}` callback got a new identity every render, so React detached/reattached the ref every render, which re-measured, which re-rendered, forever. Stabilized via `useCallback` keyed on the anchor-registration function (itself stable) and the anchor name — not the whole context value, which changes whenever any anchor's rect changes |
| 2026-07-16 | `Arrow` | Arrows invisible, console errors ("the tag `<path>` is unrecognized") after a Fast Refresh | `ArrowOverlay` separated "arrow children" from "content children" via a `child.type === Arrow` reference check, which breaks once Fast Refresh gives `Arrow` a new function reference | Redesigned around `createPortal`: `Arrow` always portals its SVG markup into a shared `<g>` layer regardless of where it sits in the tree, removing the reference-equality requirement entirely |
| 2026-07-19 | `Arrow` (`path="elbow"`) | A residual/skip connection's bend was pinned to the *target* anchor's own edge, so it cut straight through wider boxes positioned between the two connected anchors (e.g. a "+" node's shortcut line running straight through the middle of a wide "Masked Multi-Head Attention" box) | The single right-angle bend became a 3-segment dogleg: a shared "gutter" coordinate is computed that clears every anchor actually positioned between the two endpoints (not just the endpoints themselves), and the path runs alongside that gutter before turning in |
| 2026-07-19 | `Detail` | Expanded panel silently never rendered — no error — whenever a `DetailRail` was present | `AnimatePresence` clones its direct children to track enter/exit; a `createPortal()` result isn't a plain element, so the clone silently failed and the content was dropped | Portal the whole `<AnimatePresence>` wrapper (kept mounted consistently across renders) instead of portaling what's inside it, so `AnimatePresence`'s direct child is always a plain element |

## Current state

- Not yet committed as of this doc — held per an explicit decision to batch the whole
  visualization-library track into one commit once the API/visual design settles, rather than
  committing an API that's still actively changing.
- Phase 4 (READMEs, full acceptance pass, optional deploy) remains not started, deliberately,
  until this track is done.
- Open/possible follow-ups noted during the work, not yet requested: visual polish on the
  annotation-callout layout (arrow endpoints line up correctly today, but exact vertical
  alignment with each callout's target row hasn't been checked in a live browser); no manual
  click-through yet of `Detail`'s expand/collapse or the elbow-routing fix beyond jsdom
  assertions and structural (`curl`) checks, for the same no-browser-automation reason logged
  throughout doc 05.
