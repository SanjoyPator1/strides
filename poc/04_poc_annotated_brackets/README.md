# POC 04 — annotated bracket notation

**Idea under test:** the ch03 notes' most information-dense diagrams are the annotated
nested-list ASCII blocks (`queries = [ [ [[a], [b]], … ] ]` with `← Batch 0` arrows).
Instead of replacing them, make the bracket notation itself a first-class interactive
diagram — typeset live, colored, and annotatable like teacher markup on a whiteboard.

Four ideas working together:

1. **Brackets are colored by the dimension they open.** The shape header renders
   `(2, 6, 2, 1)` as colored chips (violet batch, aqua tokens, orange heads, magenta
   head_dim — a validated 4-color set), and every bracket in the body wears its
   dimension's color. Hover a chip → all of that dimension's brackets light up, the
   rest fades. "Which bracket is the tokens dimension?" stops being a question.
2. **Hand-drawn teacher markup, declaratively.** Seeded-jitter rough ellipses and
   curved arrows (Excalidraw feel, deterministic render): a graphite ellipse around
   `[[a], [b]]` ("one token = 2 heads × 1 value"), an orange lasso around the head-0
   column a/c/e/g/i/k ("`.transpose(1,2)` gathers these") — annotations anchor to the
   text registry, not to pixel positions, so they survive layout changes.
3. **Index tracing.** The notes' "Indexing is now:" lines are rendered at the bottom
   with each digit on its dimension-colored chip. Hover `queries[0, 1, 0, 0] = c` and
   a hand-drawn arrow traces to the exact letter `c` in the structure while the
   bracket path lights up. Reverse works too: hover any letter and its enclosing
   brackets (its path — one bracket per dimension) stay lit while everything else fades.
4. **Same identity language as POC 01–03:** margin notes carry token-colored ● dots,
   letters stay ink-bold for contrast, text wears ink everywhere.

## Run

```bash
python3 -m http.server 4173 -d poc
# open http://localhost:4173/04_poc_annotated_brackets/
```

## What to judge

- Does "colored brackets = dimensions" finally make nested 4D lists readable?
- Do the rough scribbles read as helpful teacher markup or as noise?
- Is hover-an-index-line → arrow-to-the-value the right way to teach indexing?
- The annotation layer is declarative (anchored to registry keys like `L:0.1.0` and
  path prefixes like `b0.t0`) — is this the authoring model the real framework wants
  for "arrows and words and scribbles" on any diagram, not just brackets?
