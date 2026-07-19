# poc/

Throwaway proof-of-concept experiments for the next-generation visualization engine.
Each POC is a numbered folder (`01_poc_<title>`, `02_poc_<title>`, …) containing a small
runnable demo. The goal is to build several, view them side by side, and *then* decide
what the real engine looks like. Nothing in here is production code; nothing in here is
imported by `packages/*`.

Run all POCs from one server:

```bash
python3 -m http.server 4173 -d poc
# then open http://localhost:4173/<poc-folder>/
```

| # | POC | Idea being tested |
|---|-----|-------------------|
| 01 | [01_poc_svg_stage_timeline](01_poc_svg_stage_timeline/) | "Interactive web-Manim": dark cinematic stage, beat-based timeline (play/step/jump), identity-preserving morphs, animated camera, hover interactivity at any point in time. Dependency-free SVG + vanilla JS. |
| 02 | [02_poc_4d_regrouping](02_poc_4d_regrouping/) | Showing a 4D tensor `(batch, tokens, heads, head_dim)` without nested ASCII: two color channels per cell (token hue + head border), `.view()` = boxes appear around unmoved data, `.transpose(1,2)` = cells fly between grouping hierarchies, an invariant memory strip with live stride annotations, batch as ghost frames. |
| 03 | [03_poc_semantic_zoom](03_poc_semantic_zoom/) | The click-to-expand sketch upgraded to one continuous world: the tensor rendered as true nested containment, click = camera dives inside (batch → token → head → value), level-of-detail labels fade in per zoom band, breadcrumbs + a live `queries[·, ·, ·, ·]` index bar that fills in as you dive — each click chooses one index of one dimension. |
| 04 | [04_poc_annotated_brackets](04_poc_annotated_brackets/) | The notes' nested-list ASCII as a live diagram: brackets colored by dimension (validated 4-color set, chips in the shape header), hand-drawn teacher markup (seeded rough ellipses/lassos/arrows anchored to a text registry), margin notes with token dots, and index tracing — hover `queries[0, 1, 0, 0] = c` and an arrow finds the letter while its bracket path lights up. |

Candidate future POCs (build after reviewing 01/02):

- Canvas-2D version of the same scene — glow/perf headroom, DOM-free stage.
- three.js flythrough — true 3D camera over a tensor stack (Bbycroft style).
- Motion Canvas embed — reuse an existing choreography engine instead of owning one.
- Full MHA pipeline scrubber — chain POC 01 + 02 beats through all 9 shape steps.
