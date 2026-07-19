# 07 — Productize POC 3 & POC 4 into `@strides/viz`: implementation handoff

Status: **done** · Created: 2026-07-19 · Completed: 2026-07-19

This doc is a complete, self-contained work order. It was written mid-implementation so
a different engineer/model can finish the job without any other context. Read it fully
before writing code. Where this doc conflicts with older docs, this doc wins.

---

## 1. Background and goal

The visualization track (doc 06) explored four throwaway POCs under `poc/` (plain HTML,
no build step — run `python3 -m http.server 4173 -d poc` and open
`http://localhost:4173/<folder>/`). The user picked two to productize as real, reusable
React components in `@strides/viz`, showcased in the gallery page:

- **POC 3** (`poc/03_poc_semantic_zoom/`) → new component **`TensorDive`**: a tensor
  rendered as true nested containment (batches contain token boxes contain head boxes
  contain value leaves); clicking dives the camera inside one level at a time; Esc /
  clicking empty space rises; breadcrumbs + a live `name[·, ·, ·, ·]` index bar fill in
  as you dive; labels fade in/out per zoom band (level-of-detail).
- **POC 4** (`poc/04_poc_annotated_brackets/`) → new component **`BracketDiagram`**: the
  notes' nested-list bracket ASCII typeset live as SVG; brackets colored by dimension;
  margin notes with identity dots; hand-drawn "teacher scribble" ellipses + arrows
  anchored to index constraints; an "Indexing:" block whose lines trace an arrow to the
  exact value on hover.

**Open the two POCs in a browser first** — they are the visual spec. The React
components must look and behave like them (POC 3 was restyled to light/professional;
POC 4 got its spacing fixed — both current versions are the reference).

Design constraints that shaped everything:

- **Light professional style.** No glow filters. Colors come from a validated palette
  (see §3). Text always wears theme ink colors, never series colors; identity is carried
  by marks (borders, fills, ● dots).
- **MDX compatibility.** Components are `'use client'` but are used from server-rendered
  MDX — so ALL props must be serializable data (no functions, no JSX props).
- **SSR/hydration safety.** All layout is deterministic and computed in render (pure
  functions). The hand-drawn scribbles use a seeded PRNG so server and client render
  identical paths. `Math.random()` is forbidden.
- **Domain-agnostic.** Both components live in `@strides/viz` (not viz-ml): they take
  generic `levels`/`values` props and know nothing about tokens or attention.

## 2. What is ALREADY DONE (do not redo — verify, then continue)

All in `packages/viz/src/`, written this session, **not yet committed**:

| File | State |
|---|---|
| `palette.ts` | DONE. Exports `CATEGORICAL` (8 validated hex colors), `DIM_COLORS` (4-color subset for dimensions), `tint(hex, alpha)`. |
| `rough.ts` | DONE. Exports `seededRandom(seed)`, `roughEllipsePaths(cx,cy,rx,ry,seed) → string[]` (2 passes), `roughArrowPaths(x1,y1,x2,y2,seed) → {curve, head}`. |
| `TensorDive.tsx` | DONE and **tested — 10/10 passing** (`pnpm vitest run packages/viz/src/TensorDive.test.tsx`). Exports component + pure helpers `buildDiveTree`, `fitCamera`, `drillTargetPath`, `zoomLadder`, types `DiveTree`, `TensorDiveLevel`, `TensorDiveProps`, `DiveNode`. |
| `TensorDive.test.tsx` | DONE, passing. |
| `BracketDiagram.tsx` | WRITTEN but **never typechecked, never tested, never rendered**. Treat as a draft: read it fully, expect bugs (§5 lists known risk spots). Exports component + `layoutBracket`, `runOpacity`, `matchPath`, types `BracketDiagramProps`, `BracketAnnotation`, `BracketRun`, `BracketLayout`, `BracketHover`. |

Also done earlier in the session (already committed or in working tree — don't touch):
`TokenJourney` in viz-ml, the four POCs under `poc/`, the tokenization content page.

## 3. Color system (already encoded in `palette.ts`)

- `CATEGORICAL` = `['#2a78d6','#1baf7a','#eda100','#008300','#4a3aa7','#e34948','#e87ba4','#eb6834']`
  — identity colors (e.g. one per token), assigned by index in fixed order, never cycled.
- `DIM_COLORS` = `['#4a3aa7','#1baf7a','#eb6834','#e87ba4']` — one per tensor dimension
  (batch/tokens/heads/head_dim). Both sets were run through a CVD validator and pass.
- Chrome/ink: use the theme CSS variables — `var(--strides-color-fg)`,
  `var(--strides-color-fg-muted, #898781)` (this var does NOT exist in the theme, the
  fallback is load-bearing), `var(--strides-color-border)`, `var(--strides-color-surface)`,
  `var(--strides-color-bg)`. SVG `fill`/`stroke` attributes accept `var(...)`.

## 4. Component specs

### 4.1 `TensorDive` (done — spec here for review/reference)

```tsx
<TensorDive
  name="queries"
  levels={[
    { name: 'batch' },
    { name: 'tokens', indexLabels: ['Your', '␣journey', '␣starts', '␣with', '␣one', '␣step'] },
    { name: 'heads' },
    { name: 'head_dim' },
  ]}
  values={/* nested arrays, depth 4, leaves are strings */}
  colorDim={1}   // optional; which dim's index picks the color (default 1)
  dashDim={2}    // optional; dim whose index picks border dash (identity w/o a hue)
  palette={...}  // optional; defaults to CATEGORICAL
/>
```

Behavior (all implemented): fixed 1200×675 viewBox; recursive grid layout with an 0.82
"breathing" shrink so each dive level magnifies ≈2–4×; camera animates via rAF (state
updates per frame; falls back to instant when rAF is unavailable — that's what keeps
jsdom tests green); click dives ONE level toward the click (`drillTargetPath`), clicking
focus/outside rises one; Escape rises (wrapper div has `tabIndex={0}` + `onKeyDown`);
breadcrumb buttons jump to any ancestor; shape bar shows chosen indices
(`strides-dive-dim--done`) and the dim being chosen (`strides-dive-dim--now`); label
opacity is a trapezoid band derived from `zoomLadder` medians. Hit/test hooks:
`data-strides-dive-node="0.1"`, `data-strides-dive-leaf="0.1.0.0"`,
`data-strides-dive-shapebar`.

### 4.2 `BracketDiagram` (draft — finish this)

```tsx
<BracketDiagram
  name="queries"
  levels={[...same shape as TensorDive...]}
  values={/* nested arrays; leaves are letters/strings */}
  dimColors={...}          // optional; defaults to DIM_COLORS
  palette={...}            // optional; identity dots/washes; defaults to CATEGORICAL
  condenseAfterFirst       // optional; default true for 3+ dims: dim-0 siblings after
                           // the first render as condensed inline chunks (like the
                           // notes' "Batch 1 (identical)")
  annotations={[
    { target: [0, 0, null, null], label: 'one token = 2 heads × (1 value each)', side: 'above' },
    { target: [0, null, 0, null], label: 'head 0’s slots — .transpose(1, 2) gathers these', side: 'left', color: '#eb6834' },
  ]}
  indexExamples={[[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,1,1,0]]}
/>
```

Architecture (as drafted):

- `layoutBracket(props) → { runs, chips, indexLines, scribbles, height }` is a PURE
  function (exported, unit-testable without DOM). It ports POC 4's character-grid
  typesetter: constants `FS=20, CW=12, LH=36, HX=70` (header/index left edge),
  `X0=230` (body indent → left gutter for 'left' annotations), `Y0=190` (annotation
  band above body), `MARGIN_X = X0 + 26*CW`, `VIEW_W=1200`.
- Every text piece is a `BracketRun { x, y, text, fs, fill, weight?, role, dim?, path?, leafIdx? }`
  with `role ∈ 'plain'|'bracket'|'letter'|'margin'|'index'|'title'`.
- **Line-breaking rule**: `breakDim = max(1, D-2)`. Brackets of dims `< breakDim` get
  own lines; subtrees rooted at bracket dim `breakDim` render inline, one per line
  ("rows", e.g. `[[a], [b]],`). `rowDim = breakDim - 1` is the dim whose index picks
  identity colors (tokens).
- Bracket color = `dimColors[dim]`; bracket `path` = its index-prefix joined with `.`
  (root `''`, batch `'0'`, row `'0.1'`, inner `'0.1.0'`). Letter `path` = full index
  `'0.1.0.0'`, plus `leafIdx: number[]`.
- Margin notes auto-generate: dim-0 open → `"<dim0> dim — holds N"`; block open →
  `"<label> — holds N <childDimName>"`; rows → palette dot + `"<indexLabel>"`;
  block close → `"end <label>"`.
- Header: `name.shape = (2, 6, 2, 1)` with per-dim colored chips (rects in `chips`,
  first D chips are ALSO the dim hover hit-areas — order matters), then a legend line
  `(● batch, ● tokens, …)` in muted ink.
- Indexing block (if `indexExamples`): starts at `bodyEnd + 78`; each line
  `queries[0, 1, 0, 0] = c ← batch 0 · "␣journey" · head 0` with digits on dim-colored
  chip rects; `indexLines` records `{idx, y, endX}` for hover tracing.
- Annotations resolve to `Scribble` geometry: bounds of all letter runs whose `leafIdx`
  matches the target constraints (null = wildcard); `side:'left'` wraps the label into
  ~18-char lines in the gutter (x=56) with a short horizontal arrow into the lasso's
  left side; `side:'above'` puts a single-line label in the band (y≈128) with an arrow
  to the bounds' right. Seeds are derived from the annotation index (deterministic).
- Hover model: `BracketHover = {kind:'path', path} | {kind:'dim', dim} | null`;
  `runOpacity(run, hover)` is pure: path-hover keeps matching brackets/letter at 1,
  dims others to 0.18, margin/plain 0.35, index/title 0.9; dim-hover keeps that dim's
  brackets at 1, others 0.15.
- Component renders: chip washes → hovered-letter wash (tint of
  `palette[leafIdx[rowDim]]`) → text runs (opacity from `runOpacity`) → scribbles
  (rough paths) → index-trace arrow (`data-strides-bracket-trace`, drawn when hovering
  an index line: `arrowFrom` state + hovered letter) → transparent hit rects with
  `data-strides-bracket-letter="<path>"`, `data-strides-bracket-dim="<d>"`,
  `data-strides-bracket-index="<idx dotted>"`; below the SVG a
  `.strides-bracket-readout` div (identity dot + `queries[0, 1, 0, 0] = c · …`).
- Layout is computed once via `useState(() => layoutBracket(props))`.

## 5. Known risk spots in the `BracketDiagram.tsx` draft (check these first)

1. **Never typechecked.** Run `pnpm typecheck` first and fix what falls out.
2. Header chip x-advance arithmetic (the loop placing `queries.shape = (2, 6, 2, 1)`)
   was error-prone in the POC; verify chips don't overlap the commas/paren (render it!).
3. `emitBlock`'s condensed branch (dim-0 siblings after the first): chunking is
   `Math.ceil(items.length / 2)` per line, indent 4 chars, `', '` separators between
   row groups. Verify trailing separators look right vs the POC.
4. The sibling comma after a closing `]` is passed via `isLast` — verify batch 0's
   close line renders `],` and batch 1's renders `]`.
5. `layout.chips.slice(0, D)` assumes the first D chips are the header dims — true only
   while the header is emitted before the index block. Keep that ordering.
6. `matchesTarget` compares `leafIdx[d] === undefined` as a pass — intended so shorter
   targets still match; sanity-check with the two gallery annotations.
7. Multi-line 'above' annotations: only single-line labels are supported there; the
   'left' side wraps. Fine for the gallery examples.
8. jsdom + React: use `fireEvent.pointerEnter(el)` / `fireEvent.pointerLeave(el)` on
   the `data-strides-bracket-*` hit rects (this pattern is proven in the repo's other
   tests — see `TokenJourney.test.tsx` for conventions, `// @vitest-environment jsdom`
   header line included).

## 6. Remaining work, in order

1. **Finish `BracketDiagram`**: typecheck, then write
   `packages/viz/src/BracketDiagram.test.tsx` (jsdom + @testing-library/react,
   `afterEach(cleanup)`), covering at least:
   - `layoutBracket` pure: with the (2,6,2,1) letters example — 24 letter runs;
     bracket runs = 2 (dim0) + 4 (dim1 open/close ×2 batches) + row/inner counts;
     head-0 letters in batch 0 all share the same x (column alignment — required by
     the lasso annotation); no NaN in any run position; `height` is finite and > body.
   - `matchPath('0.1','0.1.0.0')` true; `('0.0','0.1.0.0')` false; `('','anything')` true.
   - `runOpacity`: bracket on path → 1, off path → 0.18; index runs 0.9 during path hover.
   - Component: renders; hovering `[data-strides-bracket-index="0.1.0.0"]` renders the
     trace arrow group (`[data-strides-bracket-trace]`) and highlights letter path;
     hovering a `[data-strides-bracket-dim="2"]` dims non-dim-2 brackets (check
     opacity attributes); readout div updates.
   - Scribbles: with the two gallery annotations, exactly 2 scribble groups render
     (`.strides-bracket-scribble`), each with 2 ellipse passes + arrow paths; and the
     SAME seed input → identical `d` strings across two renders (determinism).
2. **CSS** — append to `packages/theme/src/styles.css` (match existing naming/vars):
   - `.strides-tensor-dive` (margin, focus outline none), `.strides-dive-shapebar`
     (mono font `var(--strides-font-mono)`, 0.9rem, muted color),
     `.strides-dive-dim--done { color: #006300; }`,
     `.strides-dive-dim--now { color: #1c5cab; font-weight: 700; }`,
     `.strides-dive-stage` (display block, width 100%, height auto, border
     `1px solid var(--strides-color-border)`, border-radius 12px,
     background `var(--strides-color-bg)`),
     `.strides-dive-crumbs` (flex, gap .45rem, margin-top .6rem, align center),
     `.strides-dive-crumb` (button reset: background `var(--strides-color-surface)`,
     `1px solid var(--strides-color-border)`, radius 8px, padding .25rem .6rem, mono,
     0.85rem, pointer; `--here` variant border/color accent
     `var(--strides-color-accent)`), `.strides-dive-crumb-sep` (muted, margin 0 .2rem),
     `.strides-dive-text` (font-family `var(--strides-font-mono)`, fill
     `var(--strides-color-fg)`; `--title` variant fill muted; `--value` variant
     weight 600). NOTE: `.strides-dive-text` are SVG `<text>` — set `fill`, not `color`.
   - `.strides-bracket-diagram` (margin block), its `svg` (width 100%, height auto),
     `.strides-bracket-text { font-family: var(--strides-font-mono); }`,
     `.strides-bracket-note { font-family: inherit; }`,
     `.strides-bracket-readout` (mono, 0.82rem, muted, min-height 1.3em, margin-top .4rem).
   - Both components must look right in the theme's dark mode too — the theme flips
     `--strides-color-*` vars, and all chrome uses vars; the fixed hex palettes stay
     as-is (they're mid-lightness; acceptable).
3. **Exports**: append to `packages/viz/src/index.ts` (follow the existing
   export-component-then-types pattern):
   `TensorDive` (+ `TensorDiveProps`, `TensorDiveLevel`, `DiveTree`),
   `BracketDiagram` (+ `BracketDiagramProps`, `BracketAnnotation`),
   `CATEGORICAL`, `DIM_COLORS`, `tint` from `./palette`,
   and rough utils from `./rough` (future annotation layers will want them).
4. **MDX registration**: add `TensorDive` and `BracketDiagram` to the import and the
   `defaultComponents` map in `packages/theme/src/default-components.ts`.
5. **Gallery examples**: append two sections to
   `examples/dl-notes/content/gallery/01-visualization-components.mdx`, following the
   file's format exactly (## heading, one-paragraph description, ```jsx code block
   showing the EXACT snippet, then the live component with the same props). Use the
   shared example everywhere (it matches the ch03 notes and POCs):
   - values (depth 4): batches × 6 tokens × 2 heads × 1 letter, letters a–l row-major,
     batch 1 identical to batch 0:
     `[[[['a'],['b']],[['c'],['d']],[['e'],['f']],[['g'],['h']],[['i'],['j']],[['k'],['l']]], <same again>]`
   - levels: batch / tokens (indexLabels `['Your','␣journey','␣starts','␣with','␣one','␣step']`) / heads / head_dim.
   - `TensorDive` section: mention click-to-dive, Esc to rise, the index bar; props:
     name="queries", levels, values, colorDim={1}, dashDim={2}.
   - `BracketDiagram` section: props as the §4.2 snippet (both annotations + the four
     indexExamples). Mention hover tracing and dim-chip hover.
   - MDX gotcha: no inline functions/closures in props (server-rendered) — all props
     above are pure data, keep it that way. `␣` and `’` unicode are fine.
6. **Verify**: `pnpm typecheck` clean; `pnpm test` all green (was 17 files / 98 tests
   before this session's additions; TensorDive adds 10); then
   `cd examples/dl-notes && pnpm dev` and check
   `http://localhost:3000/gallery/01-visualization-components` returns 200 and contains
   `strides-tensor-dive` and `strides-bracket-diagram` markup (curl is fine; also
   eyeball in a real browser — layout collisions don't show up in jsdom. The user does
   live browser testing, but do the curl-level sanity first). Kill any leftover server
   on port 4173/3000 first if ports clash (POC server may still be running:
   `pkill -f "http.server 4173"`).
7. **Docs**: update `planning_docs/06-visualization-components-log.md` — add both
   components to the `@strides/viz` inventory table and a dated build-log entry (this
   doc 07 exists; reference it). Then update THIS doc's status line to **done** and
   check off §6.
8. **Do not commit** — the whole visualization track is deliberately batched into one
   commit later (standing decision, see doc 06 "Current state").

## 7. Conventions cheat-sheet (repo-specific)

- Tests: `// @vitest-environment jsdom` first line; `afterEach(() => cleanup())`;
  run one file with `pnpm vitest run <path>`; whole suite `pnpm test` from repo root.
- Components: `'use client'` first line; import types explicitly
  (`import { useState, type ReactNode } from 'react'`) — do NOT use the `React.`
  namespace (not imported; `jsx: react-jsx`).
- Strict TS is on; no unused-vars checking. `motion/react` is the Framer Motion import
  (NOT needed for these two components — they animate via rAF/state).
- CSS lives ONLY in `packages/theme/src/styles.css` (`strides-*` class prefix).
- The dogfood app: `examples/dl-notes` — `pnpm dev` runs `strides dev` (Next + optional
  Jupyter kernel; kernel warning about missing `.venv` is expected noise).
- Python-computed real data is out of scope (roadmap item 3); hand-authored values in
  MDX are correct for now.

## 8. Acceptance checklist

- [x] `pnpm typecheck` clean
- [x] `pnpm test` fully green, including new `BracketDiagram.test.tsx` (19 files / 131
      tests total: 98 baseline + 10 `TensorDive` + 23 `BracketDiagram`)
- [x] Gallery page renders both components (curl-verified: HTTP 200,
      `strides-tensor-dive`, `strides-bracket-diagram`, `strides-dive-shapebar`,
      `strides-dive-crumbs`, `strides-bracket-readout` all present with real computed
      text, e.g. `queries.shape`; dev server left running at
      `http://localhost:3000/gallery/01-visualization-components` for the user's own
      live-browser pass — jsdom/curl can't catch layout collisions)
- [x] `TensorDive`: click batch → dives; Esc → rises; breadcrumbs jump; shape bar fills
      (all covered by `TensorDive.test.tsx`, pre-existing, still green)
- [x] `BracketDiagram`: dim-chip hover isolates a dimension's brackets; letter hover
      lights its bracket path; index-line hover draws the trace arrow; two scribbles
      render without overlapping text — verified via `BracketDiagram.test.tsx` (chip
      non-overlap assertion, column-alignment assertion for the lasso target, scribble
      count/geometry, determinism across renders) plus manual trace of the layout math
      for all 8 risk spots in §5 (all confirmed correct, no bugs found)
- [x] doc 06 inventory + build log updated; this doc marked done
- [x] Nothing committed (verified: `git status` still shows only untracked/modified
      working-tree changes, no new commits created during this session)

## 9. Deviations and notes from the actual implementation

- `BracketDiagram.tsx` typechecked clean on the very first `tsc --noEmit` run — none of
  the anticipated fixes in §5 item 1 were needed.
- §5 item 8 claimed the `fireEvent.pointerEnter`/`pointerLeave` pattern was "proven" by
  `TokenJourney.test.tsx`. That was checked and found **false** — no existing test in
  the repo exercised pointer events (`TokenJourney`'s tests only use clicks). Before
  relying on this pattern for the whole `BracketDiagram` hover test suite, a throwaway
  probe test confirmed `fireEvent.pointerEnter`/`pointerLeave` do correctly trigger
  React's synthetic `onPointerEnter`/`onPointerLeave` handlers in jsdom (React
  synthesizes them from native `pointerover`/`pointerout`, which jsdom's `fireEvent`
  dispatches). The probe was deleted after confirming; the real test suite uses the
  pattern throughout.
- All other risk spots in §5 were resolved by manually tracing `emitBlock`/`emitInline`
  against the shared `(2, 6, 2, 1)` letters example (confirming bracket colors, comma
  placement, and condensed-batch line-chunking match the POC exactly) and then
  encoding those traces as permanent regression tests rather than one-off checks —
  see `BracketDiagram.test.tsx` for the column-alignment, chip-non-overlap, and
  chunk-restart-alignment assertions in particular.
- One test-authoring bug was caught and fixed along the way: an early assertion
  expected the 24 letter runs to sort to `"abcdefghijkl"`, which is wrong — the tensor
  has 2 identical batches, so each of the 12 letters appears twice (24 runs total,
  each letter with count 2). Fixed before the suite was considered done.
