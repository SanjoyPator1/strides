# POC 02 — 4D tensor: `.view()` / `.transpose()` as regrouping

**Idea under test:** how to show a 4-dimensional tensor — `(batch, tokens, heads,
head_dim)` — better than nested ASCII brackets. The answer this POC proposes:

1. **Two color channels per cell.** Every cell carries its token identity (fill hue —
   same golden-angle colors as POC 01) *and* its head identity (border color, cyan/amber).
   Nested brackets can only show one hierarchy at a time; two color channels show both
   simultaneously, so when the hierarchy flips you can still see everything.
2. **Grouping boxes are the dimensions.** `.view()` doesn't move data — so the animation
   draws *new boxes* around unmoved cells. `.transpose(1, 2)` flips ownership — so the
   *cells fly* from token-groups into head-panels while their colors prove nothing about
   their identity changed.
3. **The memory strip is the invariant.** A flat 12-cell strip at the bottom (letters a–l,
   memory offsets 0–11) never moves through the whole scene. Stride annotations update:
   `(12, 2, 1)` → `(12, 2, 1, 1)` (view is free) → `(12, 1, 2, 1)` non-contiguous. This is
   the literal "strides" lesson the project is named after.
4. **Batch shown as ghost, not duplicate.** Batch 1 is identical in the notes' example, so
   it's a dashed ghost frame that follows the real cells — depth without 2× clutter.

The data is exactly Section 10 of `rough/code/ch03/solutions/ch03-code-explanation.md`:
letters a–l, `b=2, n=6, d_out=2, heads=2, head_dim=1`, "each token owns both heads" →
"each head owns all tokens".

## Run

```bash
python3 -m http.server 4173 -d poc
# open http://localhost:4173/02_poc_4d_regrouping/
```

## The beats

1. `.view(2, 6, 2, 1)` — token boxes + head borders fade in around **unmoved** cells.
2. The problem — head 0's cells (a, c, e, g, i, k) glow, interleaved stride-2 in the strip.
3. `.transpose(1, 2)` — cells fly from token-groups into head-panels; strip doesn't move.
4. Payoff — ghost batch panels join: 4 independent (6, 1) matrices, one batched matmul.

Hover any cell (grid or strip) at any beat: readout shows its letter, its **beat-aware
index** — `queries[0, i, h, 0]` before the transpose, `queries[0, h, i, 0]` after — plus
token, head, and memory offset. Hovering highlights the cell in both grid and strip.

## What to judge

- Is "boxes appear (view) vs cells fly (transpose)" the right mental model on screen?
- Does the two-channel coloring (token hue + head border) stay readable?
- Is the unmoving memory strip the thing that finally makes strides click?
- Does this scale in your head to (2, 6, 12, 64) — i.e., real GPT-2 small — with
  "…" elision, or does the approach only work for toy sizes?
