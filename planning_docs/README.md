# Planning docs

Numbered design and implementation documents for strides. Each doc states its status at the top. Where docs conflict, the higher-numbered (newer) doc wins.

| # | Doc | Purpose |
|---|-----|---------|
| 01 | [Project overview](01-project-overview.md) | What strides is, goals, constraints, decision log, roadmap |
| 02 | [Architecture](02-architecture.md) | Monorepo layout, package responsibilities, tech stack, runtime data flow |
| 03 | [MVP specification](03-mvp-spec.md) | Exact scope and behavior of the first MVP |
| 04 | [MVP implementation plan](04-mvp-implementation-plan.md) | Phased build plan with tasks, dependencies, and verification |
| 05 | [Implementation status](05-implementation-status.md) | Living progress tracker — updated as phases complete |
| 06 | [Visualization components log](06-visualization-components-log.md) | Build log for the visualization component library — what got built, bugs found and fixed, current state |
| 07 | [Productize POC 3 & 4 handoff](07-productize-poc3-poc4-handoff.md) | Self-contained work order for finishing `TensorDive` + `BracketDiagram` in `@strides/viz` — what's done, what remains, full specs, conventions, acceptance checklist |
| 08 | ["Let's Build an LLM" YouTube series plan](08-llm-from-scratch-youtube-series-plan.md) | Content plan (not a script) for the YouTube series built from `rough/` — narrative spine, per-episode teaching outline, companion-site layout, viz gaps, production workflow |

Conventions:

- New docs take the next number (`06-….md`). Existing docs are never renumbered.
- Docs are self-contained: an engineer should be able to implement from them without other context.
- When a decision changes, update the decision log in doc 01 and note the change in the affected doc rather than rewriting history.
