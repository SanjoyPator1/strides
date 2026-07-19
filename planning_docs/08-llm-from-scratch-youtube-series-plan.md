# 08 — "Let's Build an LLM" YouTube series plan

Status: **draft — awaiting review** · Created: 2026-07-19 · Revised: 2026-07-19

The plan for **"Let's Build an LLM"** — a YouTube series that teaches building a large
language model completely from scratch, in Python and PyTorch, based on the study materials
in `rough/` (worked through from Raschka's *Build a Large Language Model From Scratch*).
Every episode's visuals are a strides MDX page. The series is both a way to share what was
learned and a rewatchable reference for relearning later.

**This doc is a content plan, not a script.** For each episode it lists *what to teach* — the
concepts, the order, the source material, and the visualization ideas — not narration or
dialogue. The presenter explains each idea in their own words and builds the page's
visualizations themselves; this doc exists so that work has a clear outline to build from
and nothing important gets missed or misordered.

This doc covers: the teaching philosophy and why the path differs from the book's chapter
order, the full episode-by-episode content outline (with source material, viz ideas, and code
per episode), the companion-site file layout in `examples/dl-notes`, the viz component gaps
to fill, the production workflow, and a suggested build order.

---

## 1. Goals and constraints

**Goals**

1. **Share the learning** — a public YouTube series that teaches GPT-from-scratch to someone
   who knows Python but has never built a transformer.
2. **Rewatchable reference** — each episode must stand alone well enough that future-you can
   jump straight to "the multi-head episode" or "the loss episode" and relearn just that.
3. **Dogfood strides** — every episode's visuals are a strides MDX page, screen-recorded.
   The pages double as a public companion site viewers can open and play with. This is
   exactly the "first consumer" role [01-project-overview](01-project-overview.md) assigns
   to `examples/dl-notes`.
4. **Built on our own, visibly** — the standing promise of the series is that nothing is a
   black box: every tokenizer, every attention mechanism, every layer is written and
   explained on screen before it's used. The one deliberate exception (loading real OpenAI
   GPT-2 weights in E13) is framed as a milestone earned by having built the matching
   architecture ourselves, not a shortcut.

**Constraints**

- All content already exists in `rough/` — code, notebooks, and ~15,000 lines of prose
  explanation (`*-code-explanation.md` per chapter). The series is a *re-sequencing and
  visualization* of known material, not new research. Each episode's content notes below are
  distilled from those explanation docs, which already contain the numerical dry-runs and
  gotcha call-outs worth keeping.
- Live code demos run on the real hardware (MacBook Pro — CPU/MPS, no CUDA GPU) via
  strides Python cells; published pages carry frozen snapshots, so the companion site
  stays static. This caps what "live training" can mean (see E11) and rules out loading
  the larger GPT-2 checkpoints comfortably (see E13) — the series is scoped around that
  constraint rather than assuming a GPU that isn't there anymore.
- Some episodes want viz components that don't exist yet (the "3b1b track" from
  [06-visualization-components-log](06-visualization-components-log.md)). The plan marks
  these explicitly; every episode also has a fallback using only existing components.

---

## 2. Why not the book's chapter order

The book's path (and `rough/`'s folder structure) is bottom-up: PyTorch → text data →
attention → model → pretraining → finetuning. That's the right order for a *reader doing
exercises*, but it has three problems as a *video series*:

1. **The payoff is six chapters away.** A viewer doesn't see a model do anything until
   chapter 5. On YouTube that's fatal — the first episode must show the finished thing
   working.
2. **PyTorch-first front-loads the least interesting material.** A full PyTorch episode
   before any LLM content filters out exactly the audience we want. PyTorch should arrive
   *just in time*, in the episode that needs it, with an appendix track for depth.
3. **The data-loading chapter is motivated by training, which the book hasn't reached yet.**
   Sliding windows, strides, and target-shifting only make sense once you know the model
   predicts the next token and needs (input, target) pairs. In the book this is chapter 2;
   we move it to the training act, where it answers a question the viewer already has.

**The replacement spine: follow one prompt.** The whole series is organized around a single
narrative device — one sentence enters a GPT and we follow it all the way to generated text.
Act 1 is the forward pass (what happens to the prompt). Act 2 is training (how the weights
got good). Act 3 is finetuning (how a text-completer becomes a tool). This matches the viz
library's strengths exactly: `TokenJourney` *is* "follow the prompt," and the doc-06 "3b1b
track" (lineage hover, `MatMulViz`, `ReshapeViz`, `PipelineScrubber`) was designed for
precisely this story.

**The recurring motif: the map lights up.** The full GPT architecture diagram already built
on the attention page (`Flow`/`Node`/`Group`/`Detail`, 12× transformer block) becomes the
series map. Every episode opens with it: boxes we've built are colored, today's box is
highlighted, everything else is grey. By the finale the whole diagram is lit. This gives
viewers persistent orientation ("where am I in the machine?") and gives the series a visual
identity. It needs no new components — `Node`/`Group` already take color props; the page
just passes different colors per episode.

**The other recurring motif: matrices are how we see everything.** From episode 0 onward,
matrices — colored, labeled, hoverable grids of numbers — are the shared visual language for
every concept in the series: embeddings, attention scores, gradients, logits, all of it is
"a matrix, visualized." Establishing that early (with a fun, low-stakes demo) pays off in
every later episode, because by the time a real one shows up (attention weights, loss
values) the viewer already knows how to read it.

---

## 3. Series map

Four acts, 17 numbered episodes, plus a 3-part just-in-time PyTorch appendix track.
Target length ~15–25 min per episode (E00 shorter, ~8–10 min; E11 and E16 may run longer).

| Ep | Act | Title (working) | One-line promise |
|----|-----|-----------------|------------------|
| E00 | Welcome | *Let's Build an LLM* | What we're building, why it's all built by hand, a taste of the visualization style, and the target architecture |
| E01 | I — Forward pass | *Text becomes numbers* | Tokenization: naive → vocab → special tokens → BPE |
| E02 | I | *Numbers become vectors* | Token embeddings as lookup + positional embeddings |
| E03 | I | *The problem attention solves* | Context, dot products as similarity, softmax, context vectors — no trainable weights yet |
| E04 | I | *Queries, Keys, Values* | Trainable self-attention and the √d scaling |
| E05 | I | *Don't look ahead* | Causal masking (two ways) + attention dropout |
| E06 | I | *Many heads, one matmul* | Multi-head attention: view/transpose/contiguous — the strides episode |
| E07 | I | *The supporting cast* | LayerNorm, GELU, FeedForward, residual connections |
| E08 | I | *Assembling GPT* | TransformerBlock → GPTModel, 124M params, first (gibberish) generation |
| E09 | II — Training | *What does it mean to be wrong?* | The loss chain: logits → cross-entropy → perplexity |
| E10 | II | *Feeding the model* | Sliding-window dataset, stride vs shift, dataloaders, train/val split |
| E11 | II | *The training loop* | Train it live on CPU/MPS (small model, tiny corpus); loss curves; checkpointing + auto-resume |
| E12 | II | *Taming the randomness* | Greedy vs sampling, temperature, top-k |
| E13 | II | *Our skeleton, their brain* | Load OpenAI's GPT-2 weights into our model — the big payoff |
| E14 | III — Finetuning | *From generator to classifier* | Spam classification: head swap, freezing, last-token logits |
| E15 | III | *Batching instructions* | Alpaca format + the collate function in three drafts (`-100` masking) |
| E16 | III | *Teaching it to obey* | Instruction finetuning + LLM-as-judge evaluation with Ollama |
| E17 | Epilogue | *The whole thing in one file* | Guided speedrun of `gpt_from_scratch.ipynb` — the rewatch artifact |
| P1–P3 | Appendix | *PyTorch in strides* (tensors & shapes / autograd / `nn.Module` patterns) | Just-in-time prerequisites, linked from episodes that need them |

Book-chapter coverage (nothing is dropped, only re-sequenced):

| Book chapter | Episodes |
|---|---|
| ch01 PyTorch fundamentals | P1–P3 (appendix), inline inserts in E02/E04/E07/E11 |
| ch01.01 module patterns | P3, inline in E04/E07 |
| ch02 text data | E01–E02 (tokenize/embed) + **E10** (dataloader, deliberately moved) |
| ch03 attention | E03–E06 |
| ch04 GPT model | E07–E08 |
| ch05 pretraining | E09, E11–E13 |
| ch06 classification finetune | E14 |
| ch07 instruction finetune | E15–E16 |
| `gpt_from_scratch.ipynb` | E17 (plus its checkpoint/resume extras in E11) |

---

## 4. Episode details

Format for each episode below — **Opening idea**: the concept or question the episode opens
on (a content note describing the angle, for the presenter to explain in their own words —
not a script). **Teach**: the concept sequence to cover, in order. **Viz**: strides
components to build the visuals around (⚠ marks components not yet built; each has a
fallback). **Code**: what runs live in Python cells. **Source**: exact `rough/` material this
content is distilled from. **Page**: companion MDX file (see §5 for layout).

### Act 0 — Welcome

**E00 — *Let's Build an LLM*** (~8–10 min)

The pilot episode. No code walkthrough yet — its job is to set expectations and make the
series' style tangible in the first few minutes.

- **Teach**:
  1. **The promise.** Over this series we build a real, working large language model
     completely on our own: our own tokenizer, our own attention mechanism, our own
     transformer block, our own training loop. Python and PyTorch, nothing pretrained
     borrowed early. State plainly that this is a from-scratch build, not a "call an API"
     tutorial.
  2. **What "our own" means, concretely, and where the one exception is.** Later in the
     series (Act II's finale) we deliberately load real OpenAI GPT-2 weights into the exact
     model we built by hand — not as a shortcut, but as proof: if our architecture is right,
     someone else's trained weights should just drop in and work.
  3. **The destination, previewed.** Show the full GPT architecture diagram (the series
     map) in its all-grey state — text goes in, flows through repeated blocks, a prediction
     comes out — without explaining internals yet, purely to orient. State the promise
     explicitly: by the last main episode, every box in this diagram will be something the
     viewer understands and built.
  4. **The teaching style: visualization first.** This series is not slides-and-code —
     nearly every concept gets a real, interactive, hoverable visualization instead of a
     wall of numbers. Demonstrate this claim immediately rather than just asserting it (see
     Viz below) — a small, fun matrix demo that has nothing to teach yet except "this is how
     we're going to *see* things all series."
  5. **The roadmap.** Three acts, briefly: build the forward pass (how a prompt becomes a
     prediction), train it (how the weights get good), then finetune it (how a
     text-completer becomes a tool — a classifier, an instruction-follower).
  6. **The stack.** Python + PyTorch, real code, a real (small-scale) training run on
     ordinary laptop hardware — no supercomputer or GPU cluster required to follow along.
  7. **Close.** Invite viewers to follow along and to explore the companion site — every
     diagram shown in the video is a live, interactive page they can open and play with
     themselves.
- **Viz**: the star of this episode is the **matrix visualization teaser** — a standalone,
  playful demo, deliberately simple and disconnected from any real ML concept yet:
  - A small `Matrix` (e.g. 4×4 or 5×5) with `colorScale="sequential"`, so viewers immediately
    see "a grid of numbers" become "a grid of color" — call out that color intensity *is*
    the number, so at a glance you can spot patterns numbers alone hide.
  - A `Scene`/`Step` sequence (2–3 steps) where the same matrix (shared `id`) changes values
    and the cells visibly tween/animate between steps — a concrete, fun preview of "we don't
    just show you a number changed, you'll watch it change."
  - Optionally, hover interactivity (`onCellHover`) on one cell to show "and you can inspect
    any value yourself" — planting the idea that the companion site isn't just a video
    recording, it's explorable.
  - Then cut to the **series map**: the existing full GPT model diagram from the attention
    page (`Flow`/`Node`/`Group`, 12× transformer block), all in its neutral/grey styling —
    "this whole thing is boxes, and every box is secretly built out of matrices exactly like
    the one you just saw. That's what we're doing for the rest of the series."
- **Code**: none required. If a short live cell is wanted for texture, the lightest option
  is creating and printing the tiny demo matrix used in the viz above (`torch.tensor(...)`)
  — not a trained-model demo, since nothing has been earned yet and that's the point.
- **Source**: the series-map diagram already exists in
  `examples/dl-notes/content/attention/01-attention-weights.mdx` ("Where this fits"
  section); the matrix teaser is new content, built directly from `@strides/viz`'s `Matrix`
  and `Scene`/`Step` (see the gallery page for usage patterns,
  `content/gallery/01-visualization-components.mdx`).
- **Page**: `series/00-lets-build-an-llm.mdx`

### Act I — The forward pass (follow one prompt)

**E01 — *Text becomes numbers***

- **Opening idea**: neural networks only multiply and add — so raise the question of what
  number represents a word, and what happens with a word the model has never seen before
  (motivates the tokenizer progression that follows).
- **Teach**: whitespace split → regex tokenizer → vocabulary and `SimpleTokenizerV1` →
  the unknown-word failure → `<|unk|>` / `<|endoftext|>` → why subwords fix this → BPE
  intuition → tiktoken in practice (`␣` leading spaces, weird splits, round-tripping).
- **Viz**: `TokenJourney` stages 1–3 (text → token chips → ids) with real GPT-2 BPE ids —
  this is exactly what the tokenization page already does; token identity colors
  (`tokenColor`) established here and reused all series.
- **Code**: build `SimpleTokenizerV1`/`V2` live on `the-verdict.txt`, break it on an unseen
  word, fix with special tokens, then `tiktoken` comparison.
- **Source**: `rough/code/ch02/ch02.ipynb` §2.2–2.5;
  `rough/code/ch02/solutions/ch02-code-explanation.md` (tokenizer progression + gotchas);
  existing page `content/tokenization/01-from-text-to-tensors.mdx` is the seed.
- **Page**: `series/01-text-becomes-numbers.mdx`

**E02 — *Numbers become vectors***

- **Opening idea**: token IDs are just index labels with no numeric relationship to each
  other — neighboring IDs can mean completely unrelated things — motivating why we need a
  learned, geometric representation instead.
- **Teach**: embeddings as learned lookup table (trace one row by hand); `nn.Embedding` is
  indexing, not matmul; why 768 dimensions; positional embeddings — why order must be
  injected; broadcasting the position matrix over the batch; final input shape
  `(batch, seq, d_model)`.
- **Viz**: `TokenJourney` full journey (…→ embedding row); `Matrix` with `cellLabels` for
  the lookup trace; `BracketDiagram` making its series debut on the `(batch, seq, d)`
  shape — establish the bracket notation that recurs in E06/E10.
- **Code**: tiny `nn.Embedding(6, 3)` traced by hand, then the real GPT-2-sized ones;
  `tok_emb + pos_emb` with shapes printed.
- **PyTorch just-in-time**: tensor creation, indexing, shapes (link P1).
- **Source**: `ch02.ipynb` §2.7–2.8; `ch02-code-explanation.md` (embedding-as-lookup dry
  run, broadcasting section); `ch01` explanation's embedding + broadcasting sections.
- **Page**: `series/02-numbers-become-vectors.mdx`

**E03 — *The problem attention solves***

- **Opening idea**: a reader resolves what a pronoun refers to instantly using context, but
  a fixed per-word embedding can't do that — every word is still an island — motivating
  attention.
- **Teach**: why fixed embeddings aren't enough (context); attention with *no trainable
  weights*: dot product as similarity → scores for one query token → softmax (why not just
  normalize?) → weighted sum = context vector → generalize to all tokens at once (one
  matmul).
- **Viz**: `Scene`-stepped `Matrix` derivation (scores → softmax → context) — the attention
  page already stages exactly this; `AttentionHeatmap` with hover row-sum check.
  ⚠ `MatMulViz` (animated dot-product sweep, 3b1b-track piece 3) would elevate the
  "one matmul does all tokens" beat — fallback: `Scene` steps with `highlight` props.
- **Code**: the 6-token toy example, every intermediate printed.
- **Source**: `ch03.ipynb` §3.1–3.3; `ch03-code-explanation.md` (deepest doc in the set —
  its numerical dry-runs become the on-screen numbers);
  existing `content/attention/01-attention-weights.mdx`.
- **Page**: `series/03-the-problem-attention-solves.mdx`

**E04 — *Queries, Keys, Values***

- **Opening idea**: comparing tokens using their raw embeddings only lets each token judge
  others "as-is" — motivating learned projections so the model can learn *what to look for*
  rather than comparing tokens at face value.
- **Teach**: the retrieval analogy (query/key/value); three projection matrices; recompute
  E03's example with projections; the √d_k scaling and *why* (softmax saturation — show a
  before/after); `SelfAttention_v1` (raw `nn.Parameter`) vs `v2` (`nn.Linear`) and why
  Linear's init wins.
- **Viz**: `Scene` tracking x → Q/K/V with shared-`id` `Matrix` tweening; `Arrow` anchors
  labeling which weight matrix produced what. ⚠ lineage-hover (3b1b-track piece 2: hover a
  context-vector cell → the attention row and V column that made it glow) — fallback:
  controlled `highlight` + captions.
- **Code**: `SelfAttention_v1` and `v2` live, seeded, outputs compared.
- **PyTorch just-in-time**: `nn.Parameter` vs `nn.Linear`, what `nn.Module` registers
  (link P3).
- **Source**: `ch03.ipynb` §3.4; `ch03-code-explanation.md` (√d_k section, v1-vs-v2);
  `ch01.01-pytorch-module-patterns-explanation.md` (manual Linear).
- **Page**: `series/04-queries-keys-values.mdx`

**E05 — *Don't look ahead***

- **Opening idea**: during training the model sees a whole sentence at once, including the
  words it's supposed to predict — motivating a mechanism that blocks it from "cheating" by
  looking ahead.
- **Teach**: why generation forces causality; naive masking (zero out + renormalize) vs the
  right way (`-inf` before softmax, and why they're equivalent — prove it); `masked_fill_`
  and the trailing-underscore in-place rule; `register_buffer` (why the mask isn't a
  parameter but must move devices); dropout *on attention weights* and the 1/(1-p) rescale;
  `CausalAttention` handling batches.
- **Viz**: `AttentionHeatmap` with the mask sweeping over it via `Scene` steps (upper
  triangle dying to grey) — the "CausalMaskStepper" idea from doc-01's roadmap, buildable
  as a page-level `Scene` composition without a new component.
- **Code**: both masking implementations, equality check, dropout demo with seed.
- **Source**: `ch03.ipynb` §3.5; `ch03-code-explanation.md` (masking two ways,
  register_buffer, batching).
- **Page**: `series/05-dont-look-ahead.mdx`

**E06 — *Many heads, one matmul*** — the signature episode

- **Opening idea**: a single attention head can track one kind of relationship at a time,
  but sentences have many — the naive fix (loop over several heads) works but wastes
  compute, motivating a reshape-based trick that gets all heads from one matmul.
- **Teach**: `MultiHeadAttentionWrapper` (the honest loop) → why it's slow → the trick:
  project once, *reshape* into heads → `.view()` changes the bracketing, not the memory →
  `.transpose(1,2)` changes strides, not the memory → why `.contiguous()` is needed before
  the final `.view()` → reassemble → output projection. The tensor is `(b, tokens, heads,
  head_dim)` and the viewer must be able to *see* all four dimensions.
- **Viz**: this is the episode the library was built for — `HeadSplitViz` (wide matrix
  splits into heads), `BracketDiagram` (bracket recoloring under `.view()`, with teacher
  scribbles on the head dimension), `TensorDive` (fly into `(2, 6, 2, 1)` — the exact
  gallery example), `TensorExplorer` for compare-across-heads. ⚠ `ReshapeViz` with the
  flat-memory strip (3b1b-track piece 4, prototyped as POC 02) is the one truly missing piece —
  fallback: `BracketDiagram` before/after pairs + a hand-narrated memory strip using
  `Matrix` with `anchorPrefix` arrows.
- **Code**: wrapper vs efficient `MultiHeadAttention`, shapes printed at all 9 pipeline
  steps, output equality check.
- **Source**: `ch03.ipynb` §3.6; `ch03/multihead-attention.ipynb` (variants A/B);
  `ch03-code-explanation.md` (shape-transformation story, `.view()` vs `.reshape()`).
- **Page**: `series/06-many-heads-one-matmul.mdx`
- **Note**: the framework is literally named after this episode's core idea. If any episode
  becomes a standalone "watch this one" showpiece, it's this one.

**E07 — *The supporting cast***

- **Opening idea**: attention gets all the fame, but it's only a third of a transformer
  block — motivating a look at LayerNorm, GELU, FeedForward, and residual connections, the
  parts that make a deep stack actually trainable.
- **Teach**: LayerNorm — normalize *per token* (which axis, and why not per batch), mean/var
  by hand, scale & shift; GELU — smooth gate vs ReLU's hard zero (plot both); FeedForward —
  expand 4× then contract (768→3072→768), where most parameters live; residual connections
  — the vanishing-gradient demo (`print_gradients` with/without shortcuts, the numbers make
  the argument); assemble the `TransformerBlock` and confirm shape-in == shape-out.
- **Viz**: `Matrix` row-wise normalization trace; matplotlib GELU/ReLU comparison via
  snapshot cell; the map motif zooms in — the transformer-block `Group` from the GPT diagram
  with today's `Node`s lighting up one by one; `Flow` with `extraArrows` for the two
  residual paths (already demoed in the gallery).
- **Code**: LayerNorm by hand then as class; `ExampleDeepNeuralNetwork` gradient demo;
  `TransformerBlock` forward with shapes.
- **PyTorch just-in-time**: `nn.Sequential`/`ModuleList` and the hidden-parameters
  registration bug (link P3).
- **Source**: `ch04.ipynb` §4.2–4.5; `ch04-code-explanation.md`;
  `ch01.01` explanation (shortcut exercise, containers).
- **Page**: `series/07-the-supporting-cast.mdx`

**E08 — *Assembling GPT*** — Act I finale

- **Opening idea**: with every part built, it's time to stack the blocks into a full GPT
  and check that it runs end to end — even though, untrained, it can only produce
  gibberish.
- **Teach**: the config dict (what each of the 7 numbers controls); embeddings → 12×
  TransformerBlock → final LayerNorm → output head; parameter counting (why 163M raw),
  weight tying (why the paper says 124M), model size in MB; `generate_text_simple` (greedy
  argmax loop, context cropping); run it untrained → confident gibberish → frame this
  honestly as "the architecture is done; what's missing is *training*. That's Act II."
- **Viz**: the map motif pays off — full GPT diagram now fully lit except a grey "trained
  weights" annotation; `TensorDive` into the `(batch, seq, vocab)` logits tensor;
  `TokenJourney` extended conceptually to the full circle (text → … → logits → next token
  → append → repeat).
- **Code**: `GPTModel` assembled from parts, param count, greedy generation on "Hello, I
  am" producing nonsense.
- **Source**: `ch04.ipynb` §4.1, 4.6–4.7; `rough/code/ch04/gpt.py` (the clean end-of-act
  artifact — worth showing on screen as "everything from episodes 1–8 in 277 lines");
  `ch04-code-explanation.md` (config, param counting, weight tying).
- **Page**: `series/08-assembling-gpt.mdx`

### Act II — Training (how the numbers got good)

**E09 — *What does it mean to be wrong?***

- **Opening idea**: the model outputs a huge probability distribution at every position —
  we need one number that captures how wrong a given prediction was, so we have something
  to push downhill.
- **Teach**: the loss chain, step by step with a tiny example: logits → softmax → pick out
  the target token's probability (fancy indexing) → log → mean → negate; why log
  (multiplication→addition, punishing confident wrongness); `torch.nn.functional
  .cross_entropy` does the whole chain (and why it wants logits, not probabilities);
  perplexity as "effective branching factor" — an interpretable number.
- **Viz**: a `Scene`-stepped loss-chain trace — one `Matrix` per stage with shared-`id`
  tweening and the target cells highlighted; this is a page-level composition of existing
  primitives, no new component.
- **Code**: the chain by hand, then `cross_entropy`, equality check; perplexity of the
  untrained E08 model on real text (huge number — the "before" measurement).
- **Source**: `ch05.ipynb` §5.1; `ch05-code-explanation.md` (loss-chain dry run — the
  richest single section in the doc set for this).
- **Page**: `series/09-what-does-wrong-mean.mdx`

**E10 — *Feeding the model*** — the deliberately relocated chapter-2 material

- **Opening idea**: training needs millions of (input, correct-next-token) pairs, but
  nobody hand-labels them — plain text becomes self-labeling once you slide a window
  across it.
- **Teach**: next-token prediction makes any text self-labeling; the sliding window;
  **stride vs target-shift are different axes** (the classic confusion, and the explanation
  doc already untangles it); `GPTDatasetV1`; `create_dataloader_v1`; batch shape; train/val
  split and why we watch the gap between the two losses.
- **Viz**: a sliding-window stepper — token strip as a 1×N `Matrix` with a highlighted
  window advancing via `Scene`, input row and target row shown shifted; `BracketDiagram`
  on the resulting `(batch, seq)` batches.
- **Code**: dataset on `the-verdict.txt`, first three windows printed for stride=1 vs
  stride=4; loader batch inspected.
- **Source**: `ch02.ipynb` §2.6; `ch02/dataloader.ipynb`;
  `ch02/dataloader_explanation.md` + `ch02-code-explanation.md` (stride-vs-shift dry runs);
  `ch05.ipynb` §5.1 (train/val split).
- **Page**: `series/10-feeding-the-model.mdx`

**E11 — *The training loop*** (may run ~30 min; could split at checkpointing)

- **Opening idea**: with a model, a loss, and data pipeline all in place, only the training
  loop remains — and it's a short, repeatable recipe.
- **Teach**: the canonical loop (zero grad → forward → loss → backward → step) and why
  `zero_grad` placement matters; `calc_loss_batch`/`calc_loss_loader`/`evaluate_model`;
  device selection ladder (`cuda` → `mps` → `cpu` — on the MacBook Pro this resolves to
  `mps`, and the episode says so honestly rather than pretending CUDA); run the real
  10-epoch training live — the small `GPT_CONFIG_124M`-scale model on the tiny
  `the-verdict.txt` corpus, chosen specifically because it finishes in a few minutes on a
  laptop; read the loss curves (overfitting on a tiny corpus — expected, discussed); sample
  generations at epoch 0/3/10 (the money shot: gibberish → almost-English → memorized
  Verdict); save/load `state_dict`, optimizer state, then the production extras from
  `gpt_from_scratch.ipynb`: rotating checkpoints + auto-resume.
- **Viz**: `PyCell` live outputs are the star; loss-curve matplotlib snapshot; the map
  motif's "trained weights" annotation turns green.
- **Code**: `train_model_simple` end to end; kill-and-resume demo for checkpointing.
- **PyTorch just-in-time**: autograd — `.backward()`, accumulation, `no_grad` (link P2).
- **Source**: `ch05.ipynb` §5.2, 5.4; `rough/code/ch05/gpt_train.py`;
  `ch05-code-explanation.md` (loop internals, twiny plot);
  `rough/code/gpt_from_scratch.ipynb` (checkpoint rotation + `find_latest_checkpoint`).
- **Page**: `series/11-the-training-loop.mdx`

**E12 — *Taming the randomness***

- **Opening idea**: greedy decoding always gives the same answer to the same prompt —
  deterministic but repetitive — motivating temperature and top-k as dials that trade
  determinism for variety.
- **Teach**: greedy argmax recap → `torch.multinomial` sampling → temperature scaling
  (divide logits by T; dry-run the softmax at T=0.1/1/5 and *watch the distribution
  sharpen/flatten*) → top-k filtering (`-inf` masking, reusing the E05 trick) → the final
  `generate()` with eos handling.
- **Viz**: a probability-bar `Matrix` (1×k) morphing under temperature via `Scene` — the
  same distribution at three temperatures with shared-`id` tweening; top-k as cells dying
  to grey (visual rhyme with the causal mask).
- **Code**: same prompt at several (T, k) combos, the `gpt_from_scratch.ipynb` comparison
  cell reproduced.
- **Source**: `ch05.ipynb` §5.3; `ch05-code-explanation.md` (temperature/top-k dry runs);
  `gpt_from_scratch.ipynb` final section.
- **Page**: `series/12-taming-the-randomness.mdx`

**E13 — *Our skeleton, their brain*** — Act II finale, closes E00's promise

- **Opening idea**: our architecture is identical to GPT-2's, so instead of training from
  scratch for thousands of GPU-hours, OpenAI's published weights can be loaded directly
  into the model we built ourselves — the payoff for having built it right.
- **Teach**: download and parse the TF checkpoint; the mapping walkthrough — embeddings,
  splitting the combined QKV weights (a payoff of E06: you understand *why* they're
  combined), transpose conventions, FFN, LayerNorms, weight tying again; `assign` shape
  checks; generate — coherent English from our own code, for the first time. Load 124M and
  355M live (comfortable on laptop RAM); mention 774M/1558M exist and show a
  pre-recorded/screenshot generation from them rather than loading live — unified memory can
  hold them, but there's no reason to make a viewer watch a multi-minute CPU/MPS load on
  screen for a scale demo.
- **Viz**: the map motif with an `Arrow`-annotated weight-mapping diagram (our `Node`s ↔
  checkpoint tensor names, dashed arrows); `Matrix` with `groups` brackets showing the QKV
  split.
- **Code**: `gpt_download.py` + `load_weights_into_gpt` + `generate`.
- **Source**: `ch05.ipynb` §5.5; `rough/code/ch05/gpt_generate.py`, `gpt_download.py`;
  `ch05-code-explanation.md` (6-part weight-loading walkthrough).
- **Page**: `series/13-our-skeleton-their-brain.mdx`

### Act III — Making it useful (finetuning)

**E14 — *From generator to classifier***

- **Opening idea**: a model that only completes text can become a classifier with
  surprisingly few changes — swap the output head, freeze most of the network, and it
  answers a yes/no question instead of continuing a sentence.
- **Teach**: finetuning taxonomy; SMS-spam dataset, class imbalance and downsampling;
  padding to fixed length (right-pad, and why); baseline test — can pretrained GPT-2
  already classify via prompting? (no — motivates finetuning); freeze the body, replace
  the 50,257-way head with a 2-way head; unfreeze the last block + final LayerNorm (and
  why that balance); **why the last token's logits** (`outputs[:, -1, :]` — causal
  attention means only the last position has seen everything: a direct callback to E05);
  the classifier training loop (what changed vs E11); ~95% test accuracy; `classify_review`
  inference.
- **Viz**: the map motif with the output head visually sawn off and replaced (two `Node`
  variants via `Scene`); `Matrix` on the last-token-logits selection with the final row
  highlighted; accuracy/loss curve snapshots.
- **Code**: `gpt_class_finetune.py` pipeline, 5-epoch live run.
- **Source**: `ch06.ipynb` (all); `rough/code/ch06/gpt_class_finetune.py`;
  `ch06-code-explanation.md`.
- **Page**: `series/14-from-generator-to-classifier.mdx`

**E15 — *Batching instructions*** — the collate-function deep-dive

- **Opening idea**: instruction examples come in wildly different lengths, and the batching
  function has to pad them without letting the model be graded on the padding itself.
- **Teach**: instruction finetuning vs classification; the Alpaca prompt format
  (`format_input`); then the explanation doc's excellent three-draft structure, kept
  intact: Draft 1 — pad only (targets wrong) → Draft 2 — targets shifted by one (padding
  still graded) → Final — `-100` masking, and *proving* `-100` is `cross_entropy`'s
  `ignore_index` with a two-cell verification; `functools.partial` to bind the collate fn.
- **Viz**: `Matrix` with `cellLabels` for the input/target alignment per draft — three
  `Scene` steps, one per draft, masked cells greying out (third visual rhyme for masking);
  `BracketDiagram` on the ragged→padded batch.
- **Code**: the three collate drafts on a tiny 3-example batch, per-item dry run.
- **Source**: `ch07.ipynb` §7.1–7.4; `ch07-code-explanation.md` (the three-draft build —
  the doc's standout section).
- **Page**: `series/15-batching-instructions.mdx`

**E16 — *Teaching it to obey*** — series finale

- **Opening idea**: everything from the series converges here — our architecture, our
  training loop, OpenAI's pretrained weights, and E15's data pipeline combine in one
  finetune that teaches the text-completer to start following instructions.
- **Teach**: load GPT-2 Medium (355M); before/after generation on held-out instructions;
  the 2-epoch finetune (nothing new in the loop — the point is that E11's loop just works);
  extracting and saving test-set responses; why perplexity can't judge instruction quality;
  LLM-as-judge with Ollama (`ollama_evaluate.py`), 0–100 scoring; honest discussion of
  results and limits; what's next beyond the book (RLHF/DPO pointers, scaling) and a
  series retrospective over the fully-lit map.
- **Viz**: the complete map, fully lit, panned over `Detail` by `Detail` as a recap;
  before/after generation side-by-sides (prose, not a component).
- **Code**: `gpt_instruction_finetuning.py` live run; `ollama_evaluate.py` against the
  local Ollama.
- **Source**: `ch07.ipynb` §7.5–7.9; `rough/code/ch07/gpt_instruction_finetuning.py`,
  `ollama_evaluate.py`; `ch07-code-explanation.md`.
- **Page**: `series/16-teaching-it-to-obey.mdx`

### Epilogue

**E17 — *The whole thing in one file*** — the rewatch artifact

- **Opening idea**: revisit the entire build — config, data, model, loss, training loop,
  checkpointing, sampling — in a single consolidated notebook, framed explicitly as the one
  episode to rewatch a year from now when relearning.
- **Teach**: a guided walkthrough of `rough/code/gpt_from_scratch.ipynb` — rebuilt as one
  strides page: config → data → model → loss → loop → checkpointing → sampling, each
  section a compressed recap linking back to its full episode. The notebook's `w.o:`
  writing-order annotations can become an honest aside on how code is actually written
  (top-down sketch, bottom-up fill) — a teaching point most series skip.
- **Page**: `series/17-the-whole-thing.mdx`

### Appendix track — *PyTorch in strides* (3 short videos, ~10 min each)

Published early (before or alongside E02–E04) and linked from episode descriptions rather
than blocking the main path:

- **P1 — Tensors and shapes**: creation, dtype, indexing, matmul, broadcasting, aggregation.
  Source: `ch01/01-pytorch_fundamentals_for_llms.ipynb` + `ch01-code-explanation.md`
  (tensor sections). Viz: `Matrix`, `BracketDiagram`, `TensorSlices`.
  Page: `pytorch/01-tensors-and-shapes.mdx`
- **P2 — Autograd**: computation graph, `.backward()`, accumulation/zeroing, `no_grad`,
  linear regression by gradient descent. Source: ch01 autograd sections.
  Page: `pytorch/02-autograd.mdx`
- **P3 — `nn.Module` patterns**: manual Linear, Sequential vs ModuleList (the registration
  bug), buffers, parameter counting, `model.apply`. Source:
  `ch01.01/ch01.01-pytorch-module-patterns-explanation.md`.
  Page: `pytorch/03-module-patterns.mdx`

---

## 5. Companion site — content layout

**Status: scaffolded.** The series lives in its own example app,
`examples/lets-build-an-llm/` — a clone of `examples/dl-notes`'s scaffold (package.json,
Next config, app router, `strides.config.ts`, a `pyproject.toml` with the same Python deps
plus `tiktoken`), with `examples/dl-notes`'s existing dogfood pages (welcome, tokenization,
attention, the component gallery) left out. `examples/dl-notes` is untouched and keeps
serving as the general components gallery/reference; it is not part of the series.

```
examples/lets-build-an-llm/
  content/
    series/            # one page per episode, numeric prefix = episode number
      00-lets-build-an-llm.mdx   ← written
      01-text-becomes-numbers.mdx ← written
      ...
      17-the-whole-thing.mdx
    pytorch/           # appendix track (scaffolded, empty)
      01-tensors-and-shapes.mdx
      02-autograd.mdx
      03-module-patterns.mdx
  data/
    the-verdict.txt    # copied from rough/code/ch02 — source text for E01, E10, E11
```

E00 and E01 are written and verified (`pnpm build` + `pnpm typecheck` both clean; the
tokenizer progression in E01 — whitespace split → regex → `SimpleTokenizerV1` → the
`KeyError` crash → `SimpleTokenizerV2` with `<|unk|>`/`<|endoftext|>` → `tiktoken` BPE — is
lifted directly from `ch02-code-explanation.md` so the code matches what was actually
validated there). E00's series-map diagram is inlined directly in its MDX page (adapted
from the attention page's `Group`/`Node`/`Arrow` diagram, recolored grey) rather than
extracted into a shared `SeriesMap` component yet — that extraction is still open, see §6.

Conventions per page:

- Frontmatter `title` = episode title; `description` = the one-line promise from §3.
- The page **is** the video's visual outline: sections appear in on-screen order, `Scene`
  steps map to natural narration beats. The presenter explains each section in their own
  words while recording — the page carries structure, not scripted lines.
- Every page opens with the series-map diagram in its per-episode coloring (a shared
  `SeriesMap` MDX partial/component wrapping the existing GPT `Flow` diagram with a
  `highlight` prop — small, build once).
- Real numbers everywhere: Python cells compute the actual tensors, and where a viz needs
  the same values as props, they're hand-copied for now (the data bridge, roadmap item 3
  in doc 01, removes this duplication later — do not block the series on it).
- `strides snapshot` before publishing; pages must render fully static.

---

## 6. Viz component gaps

Mapped against the 3b1b track already agreed in doc 06 (build order there was 1→5;
`TokenJourney` shipped). Priorities re-ordered by episode need:

| Component | Doc-06 track # | Needed by | Priority | Fallback if not built |
|---|---|---|---|---|
| `ReshapeViz` (flat-memory strip + view/transpose semantics, from POC 02) | 4 | E06 | **High** — E06 is the signature episode and the framework's namesake | `BracketDiagram` before/after + `Matrix` memory strip with anchors |
| `MatMulViz` (animated dot-product sweep) | 3 | E03, E04, E09 | Medium | `Scene`-stepped `Matrix` with `highlight` |
| Lineage hover (derived cell → source cells glow) | 2 | E04, E03 | Medium | controlled `highlight` + captions |
| `PipelineScrubber` (one tensor morphing through the 9-step MHA pipeline) | 5 | E06/E08 recap moments | Low — luxury | `Scene` chaining existing pieces |
| `SeriesMap` (the map motif: GPT diagram + per-episode highlight coloring) | — (new, content-level) | E00 and every episode | **High**, but trivial — a thin wrapper over the existing `Flow`/`Group`/`Node` diagram | hand-tint per page (duplication) |
| Sliding-window stepper, loss-chain trace, temperature bars, collate-draft stepper | — | E10, E09, E12, E15 | None — these are **page-level compositions** of existing primitives, not components | n/a |

No episode is blocked on new components; the two High items just decide how good E06 and
the recurring motif look.

---

## 7. Production workflow

Per-episode pipeline (page-first, no separate scripting step — the presenter narrates live
from the page and this doc's content notes):

1. **Distill** — pull the relevant sections of the chapter's `*-code-explanation.md` into
   an episode's content outline (opening idea, teaching beats, dry-run numbers to reuse).
   The explanation docs already contain most of this; this step is selection, not writing.
2. **Author the page** — write the `series/NN-*.mdx` page with prose, Python cells, and
   viz. Run `pnpm dev` in `examples/dl-notes`, iterate live against the real kernel.
3. **Snapshot** — `pnpm snapshot` to freeze outputs; verify the page renders static.
4. **Record** — screen-capture the page in the browser (light theme per standing
   preference), stepping `Scene`s and diving `TensorDive`s while narrating each section in
   your own words, following the page's structure and the episode's teaching beats above.
   Terminal/editor shots only where the code file itself is the subject (E08's `gpt.py`,
   E17).
5. **Publish** — video up; companion page linked in the description; episode description
   lists the `rough/` sources for viewers who want the book path.

Recording notes:

- Long training runs (E11, E14, E16): on CPU/MPS these take longer than the A6000 runs the
  book examples were timed against, so keep datasets/epoch counts at the small scale
  (E11's tiny `the-verdict.txt`, E14/E16's book-recommended subset sizes) rather than
  scaling up — time-lapse the wait either way, keep the live epoch-sample generations real
  — that authenticity is the channel's differentiator (real hardware, real outputs, frozen
  honestly, no cloud GPU rented to fake it).
- Doc 06 notes some interactions lack live-browser verification (elbow routing, `Detail`
  expand). Recording sessions double as that manual verification pass — log anything found
  back into doc 06.

---

## 8. Suggested build order (not calendar-pinned)

1. **Milestone A — prove the pipeline (E00 + E01).** ✅ Both pages written in
   `examples/lets-build-an-llm/content/series/` — `pnpm build` and `pnpm typecheck` both
   pass. The shared sidebar/scroll bug in `@strides/theme` (the whole page scrolled
   together instead of the sidebar and content scrolling independently — a `min-height`
   vs. bounded-`height` flex issue) is also fixed, benefiting every strides site. Remaining
   before this milestone is fully closed: run `strides dev` with a real `uv sync`'d venv to
   confirm the live Python cells execute (not yet done in this environment), snapshot, and
   do the actual recording. Publish P1–P3 in this window too — they're cheap (material is
   fully written) and give early subscribers depth links.
2. **Milestone B — Act I (E02–E08).** Build `ReshapeViz` before E06; decide on `MatMulViz`
   / lineage-hover when E03–E04 pages are drafted and the fallbacks can be judged on the
   actual page.
3. **Milestone C — Act II (E09–E13).** Page-level compositions only; the heavy lift is the
   E11 recorded training run.
4. **Milestone D — Act III + epilogue (E14–E17).**

Batching advice: author pages one act ahead of recording, so component needs surface early
but API churn (doc 06's reason for holding commits) has settled by record time.

---

## 9. Open questions (non-blocking — defaults chosen, flag to change)

1. **Series length tolerance**: 17 episodes + 3 appendix is honest for the material but is
   a big commitment. Default: keep the map but allow merging E15+E16 (and E09+E10) if
   momentum matters more than depth after Act I ships.
2. **Language**: default English (widest reach); an Assamese/Hindi dub or re-record is a
   possible later differentiator.
3. **Companion site publishing**: default yes — deploy `examples/dl-notes` statically
   (Vercel, per doc 01) once Milestone A pages exist; it's the best possible channel CTA.
   This effectively pulls a slice of roadmap item 2 forward; content extraction to its own
   repo can wait.
4. **Where series pages live long-term**: default in `examples/dl-notes` (dogfood value),
   accepting they'll move when dogfood content extracts to its own repo post-publish.
