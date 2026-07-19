# POC 03 — semantic zoom: dive into a 4D tensor

**Idea under test:** the user's Excalidraw sketch — click-to-expand screens for
batch → tokens → heads → head_dim — upgraded from four separate screens into **one
continuous world**. The whole tensor is rendered as true nested containment (batches
physically contain token boxes, which contain head boxes, which contain value circles),
and clicking flies the camera *inside* the box. Nothing switches screens; you just get
closer, like Google Maps for a tensor.

Key mechanics beyond the sketch:

1. **Camera dive, not page swap.** Click = one smooth zoom into the next level toward
   whatever you clicked. Click empty space (or Esc) to rise back out one level.
   Spatial continuity means you always know where you are.
2. **Level-of-detail labels.** Every label has a zoom band: batch names are visible from
   afar, token labels fade in as you approach, head labels and value letters only appear
   deep in. So no level is cluttered by another level's text (the fix for "the deep
   layers are unreadably tiny / the outer labels are uselessly huge").
3. **Live index bar.** As you dive, `queries[·, ·, ·, ·]` fills in: chosen dims turn
   green, the dim you're currently choosing glows yellow — `queries[0, 1, ·, ·] —
   (batch ✓, tokens ✓, heads ← choose, head_dim)`. Diving IS indexing: each click
   chooses one index of one dimension. That's the deep lesson this navigation teaches.
4. **Breadcrumbs** (`queries › batch 0 › ␣journey › head 0 › c`) — clickable to jump
   back to any ancestor.
5. **Same identity system as POC 01/02:** token hue fill, head border color (cyan /
   amber), letters a–l, hover shows the full index + meaning of any box at any depth.

## Run

```bash
python3 -m http.server 4173 -d poc
# open http://localhost:4173/03_poc_semantic_zoom/
```

## What to judge

- Does dive-in navigation beat side-by-side screens (the sketch) and beat POC 02's
  flat everything-at-once layout for *first-time* understanding of 4D nesting?
- Is "click = choose an index" (the shapebar filling in) the aha moment it should be?
- LOD tuning: do labels appear/disappear at the right distances?
- Combine with POC 02? (e.g., dive into a head, then trigger the transpose animation
  from *inside* — the two idioms are complementary: 02 explains *ops*, 03 explains *shape*.)
