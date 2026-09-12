# Java Lead Study Library — Project Conventions

## What this project is

A personal study library for developing senior/lead-level depth in backend Java,
the data systems around it, and software design. Interview preparation is a
**by-product**, not the goal. The goal is judgement: being the person on a team
who can settle a technical argument with reasoning and evidence.

Built on **Fumadocs** (Next.js App Router), deployed to Vercel. Static, no auth,
no database.

Scaffolded with `npx create-fumadocs-app` — not from a template repository. The
Vercel gallery's Nextra template is on the old `pages/` + `theme.config.tsx`
architecture and is not a valid starting point.

**Fumadocs moves quickly.** Do not write setup code from memory or from a blog
post. Read the current documentation at https://fumadocs.dev/docs before
configuring search, MDX, or the source adapter.

The scaffolded version defines content collections with the **Macro API in
`src/lib/source.ts`**. Older tutorials and examples define collections in
`source.config.ts`; ignore them. See https://fumadocs.dev/docs/mdx/macro. Search
is a route handler at `src/app/api/search/route.ts`.

There **is** a root `source.config.ts`, but it holds *global MDX options only* —
no collections. It exists to register `remarkMdxMermaid`. This cannot be a
collection-level `mdxOptions`, because that **replaces** the default plugin set
and would drop the plugins that build `toc` and `structuredData`, silently
breaking the ToC and search. The macro docs explicitly sanction keeping a
`source.config.ts` for global plugins alongside macro collections.

**Verified stack** (record changes here when you upgrade):

| Package | Version |
|---|---|
| next | 16.3.4 |
| react | 19.2.8 |
| fumadocs-core | 16.15.8 |
| fumadocs-mdx | 15.4.0 |
| fumadocs-ui | `npm:@fumadocs/base-ui@16.15.8` |
| typescript | ^7.0.2 |
| mermaid | 11.17.2 |

Notes: `fumadocs-ui` is aliased to the Base UI variant, but imports remain
`fumadocs-ui/*`. Next.js 16 means request middleware is `proxy.ts` at the root,
not `middleware.ts`. OG image generation **is** enabled — `getPageImageUrl()` in
`src/lib/source.ts` depends on the `og/docs` route, so do not remove it.

**Verification command: `pnpm types:check`** (`next typegen && tsc --noEmit`).
Run this after every file — it is faster and stricter than `next build`. Run
`pnpm build` before each commit.

### Tooling on this machine

pnpm 12.3.4 is installed at `%PNPM_HOME%\bin`
(`C:\Users\admin\AppData\Local\pnpm`), matching the pinned `packageManager`. A
shell started before those environment variables were set will not see it —
`%PNPM_HOME%\bin` is a `REG_EXPAND_SZ` reference that expands to nothing without
`PNPM_HOME`. Fix the shell; do not reach for `corepack`:

```bash
export PNPM_HOME="C:\Users\admin\AppData\Local\pnpm" && export PATH="$PNPM_HOME/bin:$PATH"
```

`corepack pnpm` runs without `PNPM_HOME`, resolves a **different store path**,
and pnpm then wipes and relinks `node_modules` to reconcile. On Windows that wipe
hits file locks, fails half-way, and leaves the directory unusable.

**`.claude/launch.json` obeys this too** — it invoked `corepack pnpm dev` until
2026-09-11 and now calls `pnpm` directly. If the Browser pane's dev server ever
stops starting, check that entry before anything else.

The `export PNPM_HOME=...` line above is for **PowerShell or a fresh shell**; the
Windows path with backslashes does not survive the Bash tool's own pnpm shim, so
run `pnpm` from PowerShell where it is already on `PATH`. PowerShell wraps a
native command's stderr as a red `NativeCommandError` even on success — for
`pnpm types:check` the pass signal is `✓ Types generated successfully` followed
by no `tsc` output, not the absence of red text.

**Stop the dev server before any `pnpm install` / `pnpm add`.** Next.js holds
file handles under `node_modules`, so the relink fails with
`ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR ... Access is denied`.

## The two content types

This distinction drives everything. Do not blur it.

### Reference questions (407)

The existing Q&A in `_source/`. Optimised for recall — claim, mechanism,
trade-off. These stay as written; conversion to MDX is **structural only**.
Their job is fast lookup and self-testing. Each links up to the concept page that
explains it — **built**, and derived automatically; see **Frontmatter** below. No
reference file contains any linking markup, and all 29 remain byte-identical to
`_source` apart from the diagrams.

### Concept pages (~55)

Deep-study pages on the load-bearing ideas. Written to build a mental model, not
to be recited. One concept page typically explains 5–15 reference questions.

**Do not expand all 419 questions into concept pages.** That produces ~250k words
of padding. The tiering is the point: a small number of deeply understood
mechanisms generate correct answers to a large number of questions.

## Source material

All in `_source/`, excluded from the build.

### `senior-java-interview-questions.md` — 154 questions, ~30k words

| Section | Range | Target file |
|---|---|---|
| Core Language & OOP | Q1–14 | `java/core-language.mdx` |
| Generics | Q15–21 | `java/generics.mdx` |
| Collections | Q22–36 | `java/collections.mdx` |
| Streams & Functional Java | Q37–47 | `java/streams.mdx` |
| Concurrency | Q48–70 | `java/concurrency.mdx` |
| JVM, Memory & Garbage Collection | Q71–86 | `java/jvm-memory-gc.mdx` |
| Modern Java (8 → 21) | Q87–97 | `java/modern-java.mdx` |
| Spring & Frameworks | Q98–110 | `java/spring.mdx` |
| Persistence & JPA | Q111–120 | `java/persistence.mdx` |
| Distributed Systems, Microservices & Payments | Q121–133 | `java/distributed-systems.mdx` |
| Testing, Debugging & Engineering Practice | Q134–142 | `java/testing-practice.mdx` |
| Modern Java (22 → 25) | Q143–154 | `java/modern-java-22-25.mdx` |

### `senior-data-messaging-interview-questions.md` — 145 questions, ~30k words

| Section | Range | Target file |
|---|---|---|
| Data Modelling & Indexing | Q1–15 | `data/modelling-indexing.mdx` |
| Query Performance & Execution Plans | Q16–30 | `data/query-performance.mdx` |
| Transactions, Concurrency & MVCC | Q31–45 | `data/transactions-mvcc.mdx` |
| Scaling, Replication & Operations | Q46–60 | `data/scaling-operations.mdx` |
| Redis & Caching | Q61–85 | `data/redis-caching.mdx` |
| RabbitMQ | Q86–105 | `data/rabbitmq.mdx` |
| Kafka | Q106–135 | `data/kafka.mdx` |
| Cross-Cutting Design Questions | Q136–145 | `data/cross-cutting.mdx` |

### `senior-design-architecture-interview-questions.md` — 120 questions, ~24k words

| Section | Range | Target file |
|---|---|---|
| OOP & Design Fundamentals | Q1–14 | `design/oop-fundamentals.mdx` |
| SOLID & Design Principles | Q15–26 | `design/solid-principles.mdx` |
| Design Patterns | Q27–45 | `design/design-patterns.mdx` |
| Domain-Driven Design | Q46–52 | `design/ddd.mdx` |
| Architectural Styles & Structure | Q53–60 | `design/architecture-styles.mdx` |
| Microservices: Decomposition & Boundaries | Q61–78 | `design/microservices-boundaries.mdx` |
| Microservices: Communication & Integration | Q79–88 | `design/microservices-communication.mdx` |
| Microservices: Data & Consistency | Q89–95 | `design/microservices-data.mdx` |
| Operations, Testing & Organisation | Q96–107 | `design/operations-organisation.mdx` |
| Remaining Patterns & Topics | Q108–120 | `design/remaining-patterns.mdx` |

**Note:** question numbering restarts per file. Anchor IDs must therefore be
scoped by file (`/design/ddd#q46`, not a global `#q46`).

**The Section column is the source heading verbatim, minus its `N. ` prefix.**
Find a section with `grep -n '^## [0-9]' <bank>`, and take the frontmatter
`title` from that heading with the prefix stripped. These names were previously
paraphrased here and did not match the file — do not paraphrase them again.

Every question in every source follows the same shape:

```
### Q12. Question text

**Answer.** ...

**Why it matters.** ...            <- present on most, not all

**Follow-up: <question text>?**
<answer paragraph>                  <- 0 to 3 per question
```

Do not rewrite, summarise or "improve" answer text during conversion. If a source
passage seems wrong, flag it in the commit message rather than silently editing.

## Concept page structure

The reference implementation is `_source/java-memory-model-concept-page.md`.
Every concept page follows its section pattern:

1. **The problem it exists to solve** — a concrete failure, ideally runnable,
   before any theory. Never open with a definition.
2. **What it actually is** — the mechanism, plus *why* it was designed this way
   and what the alternatives were.
3. **The core model** — the central abstraction, in depth, with worked traces.
4. **What it does not give you** — the boundary. Where people over-apply it.
5. **Adjacent guarantees / interactions** — how it composes with neighbours.
6. **Lab** — things to run and break. Non-negotiable.
7. **Leading on this** — conventions to set, what to look for in review, how to
   teach it, what architectural choice makes the problem smaller.
8. **Where to go deeper** — primary sources, specifications, named authors.
9. **Self-check** — 5–8 questions answerable only if the model is built. Prefer
   "why does X break Y" over "what is X". Mark them up with `<SelfCheck>` — see
   **The Question component**.

   *Widened from 5–7 on 2026-09-10.* The JMM page has 6; ten of the twelve later
   drafts independently landed on 8, and `jvm-memory` and `btrees-selectivity`
   on 7. Pages agreeing against the spec means the spec was wrong, not the pages.

   *Corrected 2026-09-11, measured across all thirteen converted pages.* This
   previously read "all twelve later drafts independently landed on 8", which
   was never measured. Counts are 6 / 7 / 8 / 8 / 8 / 8 / 8 / 7 / 8 / 8 / 8 / 8 /
   8 — a hundred items in total. Do not pad a 7-item draft to 8 during
   conversion; the range is the spec, not the mode.

Sections 6 and 7 are what distinguish this library from the reference Q&A.
If a page is missing either, it isn't finished.

Section numbers are a pattern, not a template — the middle expands with the
subject. The drafts run 9–11 sections and 1,900–2,500 words, and the last four
are always Lab, Leading on this, Where to go deeper, Self-check. That tail is the
part to hold fixed.

**Settled: yes, when the picture does not already exist.** Applied across all
twelve concept drafts. A page whose subject *is* an existing reference
diagram links to it and adds nothing — `jvm-memory` is
`java/jvm-memory-gc#q71`, `dependency-inversion` is
`design/architecture-styles#q53`. A page that wants an *adjacent* picture gets
its own: generational ageing and promotion rather than G1 regions, the
selectivity crossover rather than the B-tree descent, bulkheads rather than the
executor flow, xid freezing rather than tuple versions.

## Frontmatter

Reference pages:

```yaml
---
title: Concurrency
description: Java Memory Model, locks, executors, virtual threads.
questionRange: Q48–Q70
tags: [java, concurrency, jvm]
---
```

Concept pages:

```yaml
---
title: The Java Memory Model
concept: jmm
tier: foundational          # foundational | core | specialist
prerequisites: [threads-and-scheduling]
unlocks: [volatile, safe-publication, double-checked-locking]
questions: [java/concurrency#q48, java/concurrency#q49, java/concurrency#q57]
estimatedStudyTime: 3h
---
```

`questions` drives bidirectional linking between concept pages and the reference
banks. `prerequisites`/`unlocks` build a dependency graph rendered as a study
path — **built 2026-09-12**; see **The study path — built** below.

**Six core drafts are waiting** (2026-09-11) and will take the graph to
nineteen nodes when converted, adding the edges `cas-and-contention → jmm`
(subject to the slug collision above), `isolation-levels → mvcc`,
`cache-invalidation → the-log`, `spring-proxy → dependency-inversion`,
`virtual-threads → thread-pools` and `→ jvm-memory`, and
`persistence-context → spring-proxy` and `→ mvcc` — the first edge in the
library between two *core* pages. Until they convert, the measurements below
describe the graph as built.

**A second six core drafts joined them the same day**, adding
`backpressure → thread-pools`, `coupling-and-cohesion → dependency-inversion`,
`escape-analysis → jit` and `→ generational-gc`, `aggregates →
bounded-contexts` and `→ isolation-levels`, `locking-and-deadlock →
isolation-levels`, and `partitioning → hashmap` and `→ cas-and-contention`.
Three of those six edges (`aggregates` and `locking-and-deadlock` →
`isolation-levels`, `partitioning` → `cas-and-contention`) resolve to a page
from the *first* batch, not yet converted either — so the eventual node count
is twenty-five, not nineteen, and converting `isolation-levels` and
`cas-and-contention` first (as **Sessions 10+** already requires) avoids ever
leaving those three edges dangling mid-conversion.

**The graph has thirteen real nodes to draw** (2026-09-11). Measured across
all thirteen converted pages: **no dangling `prerequisites`** — eight are
legitimate roots (`prerequisites: []`) and the five resolving edges are
`thread-pools → jvm-memory`, `generational-gc → jvm-memory`, `mvcc →
btrees-selectivity`, `the-log → mvcc` and `bounded-contexts →
dependency-inversion`. Every `unlocks` target that is *not* one of the thirteen
dangles by design, which is most of them. So a renderer built today must
tolerate dangling `unlocks` on day one; it will not meet a dangling
`prerequisites` unless someone introduces one.

**Fourteen, as of the same day** — `broker-semantics` converted straight
after drafting, outside the two Core batches above, adding the sixth
resolving edge: `broker-semantics → the-log`. Its own `unlocks`
(`retries-and-backoff`, `outbox-pattern`) both dangle by design, same as the
rest. The eventual full count is **twenty-six**, not twenty-five — the
earlier estimate assumed all twelve Core drafts converting on top of the
thirteen foundational pages; `broker-semantics` was a thirteenth Core page
outside that count, drafted and converted the same day rather than queued
behind it.

**Fifteen, as of the same day.** `kafka-internals` drafted and converted
immediately after, adding the seventh resolving edge: `kafka-internals →
the-log`. Its own `unlocks` (`multi-region-replication`, `schema-evolution`
— two new Specialist slugs, recorded below) both dangle by design. The full
eventual count is now **twenty-eight**, not twenty-seven — corrected here,
since the version of this file at the time under-counted by one: `stream-pipelines`,
drafted the same day as the third coverage-audit page, was already the
**fifteenth** Core page at that point (matching the Core table's "fifteen of
twenty-one drafted"), not folded into the running total. `kafka-internals`
was the fourteenth Core page and `stream-pipelines` the fifteenth, both
outside the original twelve-draft estimate, same as `broker-semantics` was
the thirteenth.

**Sixteen, 2026-09-11.** `stream-pipelines` converted the same day, adding no
new resolving edge — `prerequisites: []` is a deliberate root, per **The
dependency graph — settled conventions** below. Its own `unlocks`
(`custom-collectors`, `reactive-streams`, `spliterator-design`) all dangle by
design.

**Seventeen, 2026-09-12.** `virtual-threads` converted, adding the eighth and
ninth resolving edges: `virtual-threads → thread-pools` and `virtual-threads
→ jvm-memory`, both to already-built foundational pages — no
conversion-order issue, unlike `spring-proxy`/`persistence-context` or
`isolation-levels`/`aggregates`. Its own `unlocks`
(`structured-concurrency`, `scoped-values`, `reactive-comparison`,
`thread-per-request`) all dangle by design. This also fulfils one direction
of `jmm`'s own `unlocks: [cas, deadlock, virtual-threads]` — the
`virtual-threads` entry there now names a real page, though `jmm` does not
declare `virtual-threads` as a `prerequisites` in return, since `unlocks`
and `prerequisites` are deliberately not required to be mirror images of
each other.

### The dependency graph — settled conventions

Decided 2026-09-10, at the frontmatter review gate. Both are cheap now and
expensive to reverse once a dozen pages have declared them.

- **`prerequisites: []` is legitimate.** Some concepts are genuine roots —
  generics and type erasure, B-trees and selectivity — and depend on nothing else
  in the library. Do not invent a parent just to avoid an empty list.
- **`unlocks: []` is legitimate too, and now common** — see the reversal below.

**REVERSED 2026-09-12: `unlocks` no longer names unwritten pages.** This rule
used to read *"`unlocks` may name pages that do not exist yet — it is a roadmap,
not a link list"*, and the renderer was specified to tolerate dangling edges as
normal. The user reversed it when the study path was built: **`unlocks` is a
link list of written pages, exactly like `prerequisites`.** 84 promises to
unwritten Specialist pages were stripped out of the frontmatter of all 34
converted pages and all 34 `_source/` drafts in one pass. Do not reintroduce
one — the Specialist names live in the **Specialist** list below, which is
where a roadmap belongs, and adding a slug there costs nothing.

The practical effect: **twenty of the thirty-four pages now carry
`unlocks: []`**, because everything they pointed at is unwritten. That is
correct and is not a page missing an edge. Only fourteen pages have anywhere
written to point at, and there are 21 `unlocks` edges against 32
`prerequisites` edges.

**A page with `unlocks: []` is not a dead end**, and nothing needs adding to
make it so: `ConceptPath`'s "Read next" is the *union* of a page's `unlocks`
and every page naming it as a prerequisite. `hashmap` declares `unlocks: []`
and still shows `partitioning` as what comes next, because `partitioning`
declares `hashmap`. Reach for that union before reaching for a new edge.

- `unlocks` — **the pages that come next**, once this page is understood. Not a
  list of topics this page happens to cover; those are its own sections. The JMM
  page originally listed `volatile`, `safe-publication` and
  `final-field-semantics` here, which are §3 and §5 *of that page* — the wrong
  meaning, and it would have had the graph drawing edges to nodes that can never
  exist. **Must now resolve to a written page.**
- `prerequisites` — **must resolve to a written page.** If the prerequisite is not
  written yet, use `prerequisites: []` and add the edge when the page lands.

The JMM page carried `prerequisites: [threads-and-scheduling]`, which was not
written and not even on the candidate list. It is now `[]`, since nothing in the
library precedes it.

**The renderer still must not assume either field resolves.** The tolerance
requirement survived the reversal, it only changed how a bad edge is *presented*:
an unresolved entry in either field is now flagged as drift rather than shown as
a promise, and must never throw, never silently drop the node, and never render
as a working link. Same for a prerequisite cycle. All three checks are empty
today; all three read hand-typed frontmatter, which is why they exist.

### The study path — built

**Built 2026-09-12.** The last non-`leading/` item on the study-features list.
Four files, all derived from frontmatter — nothing about the graph is
hand-maintained, so it cannot drift from the pages it describes:

| File | Does |
|---|---|
| `src/lib/graph.ts` | Builds and memoises the graph from `conceptPages()`. Exports `conceptGraph()`, `readingOrderTo()`, `dependantsOf()`, `conceptNodeFor()`, `parseStudyTime()`/`formatStudyTime()`. Each node also carries `stage` (longest chain behind it) and `reach` (transitive count of pages built on it). |
| **Reading it** | `conceptGraph()` is the whole API — nodes, `stages`, `danglingPrerequisites`, `unresolvedUnlocks`, `cycles`. Any future check on the graph (a lint, a CI step) should call it rather than re-parse frontmatter. |
| `src/components/StudyPath.tsx` | The whole graph. Registered in `mdx.tsx`, takes no props. |
| `src/components/ConceptPath.tsx` | One page's slice. Rendered from `page.tsx` beside `RelatedQuestions`, so no concept page can forget it. |
| `content/docs/concepts/index.mdx` | The page. `/docs/concepts`, first in `concepts/meta.json`. |

**Stages, not tiers.** A node sits one stage past its deepest prerequisite, so
the ten roots are stage 0 and the deepest pages (`aggregates`,
`broker-semantics`, `cache-invalidation`, `consistency-models`,
`kafka-internals`, `locking-and-deadlock`, `microservices-org`) are stage 3.
**A stage is a floor, not a queue** — stage 2 means *this page has a two-page
run-up*, not *read all of stage 1 first* — and both the page copy and the
component's own comment say so, because the obvious misreading turns a
34-page graph into a 34-page reading list.

**`tier:` is not rendered, and that is deliberate — corrected 2026-09-12.** It
was shown as a badge beside the stage number until then, where it read as a
claim about depth that the graph contradicts: foundational `bounded-contexts`
and `the-log` sit at stage 2, while Core `stream-pipelines` and
`expression-problem` are roots. Tier records the *writing queue* — which pages
were drafted first, and which Specialist names are still only planned — which is
a fact about this file, not about the page a reader is holding.

**`reach` replaced it**: the transitive count of pages that have this one behind
them, computed in `graph.ts` from the same `prerequisites` edges as the stages,
and rendered as *"11 pages build on this"*. It is the measurable version of what
tier was gesturing at, and measuring it is what showed tier was close but not
right — the two agree on 27 of the 34 and disagree on seven. `btrees-selectivity`
is behind eleven pages, `mvcc` nine, `dependency-inversion` seven; `isolation-levels`
is Core and behind three, more than foundational `jmm` or `thread-pools` at two;
and foundational `generics-erasure` and `idempotency` are behind nothing at all.
**Eighteen of the thirty-four have a reach of 0 and show no badge**, which is a
leaf, not a defect.

Keep `tier:` in frontmatter — it is how the Specialist roadmap and the
conversion record in this file are organised — but do not put it back on the
page.

**Three defect checks, all empty today, none assumed away.** An unresolved
`prerequisites`, an unresolved `unlocks`, and a prerequisite *cycle* each
render as a visible block rather than being dropped; `stageOf()` carries a
`walking` stack and treats a back edge as contributing nothing, so a cycle
degrades to a warning instead of a stack overflow. *The `unlocks` check was
originally the opposite — a muted "promised, not written" tag list — and was
inverted when the `unlocks` reversal landed the same day. The tolerance did
not change, only the presentation.* All three exist because the graph is
hand-typed frontmatter.

**`ConceptPath`'s "Read first" is the transitive closure, not the declared
parents.** The declared list is one hop, and the useful question is what the
whole run-up costs — `consistency-models` declares two prerequisites and has a
four-page, 12h run-up. "Read next" is the **union** of this page's resolving
`unlocks` and the pages naming it in their own `prerequisites`, precisely
because the two fields are not mirror images: `mvcc` does not list `the-log`
or `persistence-context` in its `unlocks`, but both declare `mvcc` as a
prerequisite, and a reader wants all three.

**Placement is deliberate.** `ConceptPath` sits at the *foot* of a concept
page, not the head. Prerequisites are more useful before reading, but a
concept page opens with the failure it exists to explain (§1 of the page
pattern), and burying that opener under a navigation box costs more than the
box gains.

#### Two measurements the graph corrected

Both were claims in this file that nobody had measured until the renderer made
them cheap to check.

- **Mirrored edges are the norm, not a first.** This file said
  `microservices-org → conways-law` was "the first `unlocks` promise in the
  library to be met by its mirrored `prerequisites`". Measured: **16 of the 32
  resolving `prerequisites` edges are mirrored** by an `unlocks` in the other
  direction — `backpressure`/`thread-pools`, `cas-and-contention`/`jmm`,
  `escape-analysis`/`jit` and `/generational-gc`, `mvcc`/`btrees-selectivity`,
  and eleven more. Mirroring is common because a parent page usually names the
  child it hands off to. The claim is struck; do not restate it. The five
  resolving `unlocks` that are *not* mirrored (`btrees-selectivity →
  partitioning`, `cache-invalidation → consistency-models`, `jmm →
  locking-and-deadlock`, `jmm → virtual-threads`, `partitioning →
  kafka-internals`) are the interesting ones — a page promising a successor
  that does not consider it a prerequisite.
- **Six Specialist slugs were duplicate names for one page, and twelve were
  never registered at all.** Rendering all 84 promises in one list made both
  visible for the first time — `service-extraction` against
  `service-decomposition`, `caching-strategy` against `caching`,
  `reactive-comparison` against `reactive-streams`, and
  `microservices-boundaries`, which is a *reference page* name rather than a
  concept slug. **All of it is moot now:** the `unlocks` reversal removed every
  one of the 84 from frontmatter, and the surviving names were folded into the
  **Specialist** list above. The lesson is the one the Specialist list already
  states and could not enforce — *a later page cannot invent a second
  spelling* — and the reversal is what makes it enforceable, because a new
  `unlocks` entry now has to name a page that exists.

### The symptom index — built

**Built 2026-09-12**, at `/docs/concepts/symptoms`, second in
`content/docs/concepts/meta.json` after the study path. A third way in, and the
only one that matches how a reader actually arrives: the sidebar orders by
subject and `/docs/concepts` by dependency, and both assume you already know
which subject you are in. You do not, when you are holding a p99 graph.

| File | Does |
|---|---|
| `src/lib/symptoms.ts` | The copy. 30 symptoms in five groups — In an incident, In the data, Across a service boundary, In the code, In the organisation — each with a `note` and an ordered `pages` list of concept slugs. |
| `src/components/SymptomIndex.tsx` | Renders it, resolving every slug against `conceptGraph()`. Registered in `mdx.tsx`; takes no props. |
| `content/docs/concepts/symptoms.mdx` | The page — prose, then `<SymptomIndex />`, nothing else. |

**Every symptom is an existing page's §1 restated as an observation.** The page
pattern's first rule is to open on a concrete failure rather than a definition,
so the failures were already written; nothing here invents a scenario. The
thirty reach all 34 pages.

**The `note` line is the deliverable, not the links.** It says what the failure
looks like and is not — *"the planner is doing the arithmetic correctly"*,
*"exit 137 is the kernel, not the JVM"*. Strip those and this is a worse
sidebar.

**Order within a symptom is a claim**: the first page is the likeliest
mechanism, the rest produce the same observation by another route. That is what
a subject index cannot express — *ClassCastException in a method you never
wrote* is `generics-erasure` **or** `class-loading`, and those two share nothing
but the message you are staring at.

**It is the only hand-maintained index in the library** — the sidebar is a list
of real files and the graph is derived from frontmatter, but a slug here is
checked by nothing at compile time. So it checks both directions of drift and
renders each as a visible block rather than assuming it away, the same
discipline as the graph's three checks:

- **a slug naming no page** — a defect, rendered in place of the link;
- **a concept page no symptom reaches** — not necessarily a defect, since a page
  can be worth reading with no failure that announces it, but worth a look.

Both are empty today. The second is the one that will fire first: **adding a
concept page means adding a symptom, or deciding deliberately that it has
none**, and that block is what tells you which happened.

Verified at 375px — 30 cards, 69 page chips, no card or chip overflowing the
article, page body does not scroll horizontally — plus `pnpm types:check` and
`pnpm build`, now 76 doc paths.

### Bidirectional linking

**Built. One declaration drives both directions**, so they cannot drift:

- **Forward** — `RelatedQuestions` renders the `questions:` list as links, from
  `src/app/docs/[[...slug]]/page.tsx` rather than from MDX, so a concept page
  cannot forget it. An anchor that does not resolve renders visibly as
  `broken reference: …` instead of silently vanishing.
- **Reverse** — `conceptsForPage()` inverts every concept page's `questions:`
  list and passes the map through `QuestionsProvider`; `<Question>` renders "The
  model behind this answer" when its own `id` appears. **No reference file is
  touched**, so nothing to hand-maintain across 419 questions.

Add a concept page, declare its `questions:`, and both directions appear. Write
nothing on the reference side.

**Verified end to end across all thirteen concept pages** (2026-09-11), on all
three reference tracks and with 65 reference questions claimed. Two details the
first few pages did not exercise:

- **A question may be claimed by more than one concept page**, and this works.
  `java/jvm-memory-gc#q80` and `java/streams#q47` are each claimed by both
  `generational-gc` and `jit`; `conceptsForPage()` collects them into one block
  listing both pages. Nothing needs declaring for this — do not try to make a
  question "belong" to a single page.
- **A cosmetic nit that follows from it:** that block's heading reads "The model
  behind this **answer**" (singular) above a list of two. Copy lives in
  `Question.tsx`. Left alone deliberately; fix it if the doubling ever looks
  wrong.

Anchors are validated per track, and the per-bank numbering restart does not
bite: `#q3` under `data/modelling-indexing` resolves to the data bank's Q3, not
the Java bank's.

**Re-verified with `broker-semantics`** (2026-09-11), the first Core-tier page
converted: `/docs/data/rabbitmq` renders "The model behind this answer" at
exactly six anchors — `#q86`, `#q88`, `#q89`, `#q91`, `#q93`, `#q98` — matching
its `questions:` list precisely. `backpressure` also claims `#q92` and `#q102`
on the same page but is still a `_source/` draft, unconverted, so those two
show no reverse link yet — expected, since `conceptsForPage()` only sees pages
under `content/docs/concepts/`.

**Why this needed a schema.** fumadocs' `pageSchema` is a Zod object with
`$strip`: every key it does not declare — `concept`, `tier`, `prerequisites`,
`unlocks`, `questions` — is discarded before reaching `page.data`. That is why
the field looked inert. `src/lib/schema.ts` replaces it with a hand-written
Standard Schema that preserves unknown keys. It is hand-written rather than
`pageSchema.extend()` because extending needs `zod`, which pnpm's strict layout
does not expose (fumadocs depends on it transitively) and which CLAUDE.md
requires asking to add. Do not reach for zod to add a frontmatter field; add it
to `DocFrontmatter` in `schema.ts`.

### Frontmatter gotchas

**Quote any title containing a colon.** `title: Virtual threads: continuations,
mounting, pinning` is invalid as an unquoted YAML plain scalar — a `: ` inside a
plain scalar is a parse error or a silent misparse. This already bit three design
section titles (`"Microservices: Data & Consistency"` and friends), and it will
bite the concept pages: *Virtual threads: continuations, mounting, pinning*, *The
log: WAL, replication...* and *The expression problem: polymorphism vs pattern
matching* are all on the candidate list. Quote it:

```yaml
title: "Virtual threads: continuations, mounting, pinning"
```

**Validate `questions:` against real anchors** rather than trusting them. All 407
exist now, so a wrong one is a bug you can catch:

```python
import re, glob, os
real = set()
for f in glob.glob('content/docs/*/*.mdx'):
    track = f.replace(os.sep, '/').split('/')[2]
    page = os.path.basename(f)[:-4]
    for a in re.findall(r'\[#(q\d+)\]', open(f, encoding='utf-8').read()):
        real.add(track + '/' + page + '#' + a)
# every entry of a concept page's `questions:` list must be in `real`
```

## Candidate concept pages

**The `concept:` slug is the identity used by the whole graph.** `unlocks` and
`prerequisites` reference these slugs, not page titles, so they are fixed here
rather than invented per page. This table is reconciled to the drafts in
`_source/` — where a draft and this table disagreed, the draft won.

> **Reading the per-page entries below after 2026-09-12.** Many of them record
> a page's `unlocks` and note that its targets "dangle by design". That was true
> when written and is no longer: `unlocks` now names written pages only, and all
> 84 dangling entries were stripped from every page and every draft in one pass
> — see **The dependency graph — settled conventions**. The entries are left as
> the historical record of each conversion; read a "dangles by design" remark as
> *"named a Specialist page, which now lives in the **Specialist** list"*. The
> `questions:`, diagram and currency notes in those entries are unaffected.

**Foundational** — **all thirteen drafted and converted** into
`content/docs/concepts/`, one commit per page, finished 2026-09-11. The
`_source/*.mdx` drafts stay as the conversion baseline: every converted page is
byte-identical to its draft outside the self-check, verified by hash, with one
deliberate exception recorded under **Conversion rules**.

| `concept:` | Page |
|---|---|
| `jmm` | The Java Memory Model — *the reference implementation; read it first* |
| `generics-erasure` | Generics and Type Erasure |
| `hashmap` | How HashMap Actually Works |
| `jvm-memory` | JVM Memory and What -Xmx Doesn't Bound |
| `generational-gc` | Generational GC and Why Allocation Is Cheap |
| `jit` | The JIT — Inlining, Speculation, and Why Benchmarks Lie |
| `btrees-selectivity` | B-trees, Selectivity, and Why Your Index Isn't Used |
| `mvcc` | MVCC and the Cost of a Row Version |
| `the-log` | The Log — Why Kafka and PostgreSQL Are the Same Shape |
| `idempotency` | Idempotency and the Third Outcome |
| `bounded-contexts` | Bounded Contexts and Finding a Boundary |
| `dependency-inversion` | Dependency Inversion and the Hexagonal Shape |
| `thread-pools` | Thread Pools and Little's Law |

**This table's order is not the sidebar order.** The sidebar is the explicit
`pages` list in `content/docs/concepts/meta.json`, **grouped by subject since
2026-09-12** into seven headings, in this order: Language & types, JVM runtime,
Concurrency, Relational data, Distributed data & messaging, Spring &
persistence, Design & organisation. A `"---Name---"` entry in `pages` renders as
a group heading — `fumadocs-core` parses
`^---(?:\[icon])?(?<name>.+)---` — so the pages stay one flat list and this
costs no folders and no file moves. Read the file for what is actually there.

**Why it was grouped.** It had been one hand-ordered list of thirty-four under
the rule *insert each page next to its neighbour as it converts* — an invariant
nothing checks, and it had already broken in three places: `stream-pipelines`,
a language page, sat mid-messaging between `kafka-internals` and `idempotency`,
and `expression-problem` and `partitioning` were appended at the end, outside
every run. All three moved into their groups. A misplacement is now visible at
review rather than invisible.

**Do not derive the grouping from `questions:`.** The obvious automation —
group each page by the plurality track of its claimed anchors — agrees for
about thirty of the thirty-four and misplaces exactly the interesting ones:
`persistence-context` is java5 but a data page, `expression-problem` is design4
but a language page, `aggregates` is design3+data1+java1. The grouping is a
judgement; keep it by hand.

The list is explicit, so a page left out of it builds fine and is silently
missing from the sidebar — and a page added after the wrong separator lands
silently in the wrong group. Add new concept pages deliberately, under the
right heading.

**`aggregates`: converted 2026-09-12**, the tenth Core page taken to
`content/docs/concepts/`, immediately after `persistence-context`. Checked
for staleness before converting: the three aggregate rules, reference-by-ID,
domain vs. integration events, sagas as compensation not rollback, and the
write-skew connection are all DDD modelling patterns with no version-pinned
API or JEP — unlike `virtual-threads`, nothing here needed a currency fix.
`prerequisites: [bounded-contexts, isolation-levels]` resolves to two built
pages (`bounded-contexts` foundational, `isolation-levels` Core, converted
2026-09-12) — this is the edge the second-six-drafts audit flagged
(**`aggregates → isolation-levels`**) as blocked on `isolation-levels`
converting first; it now resolves cleanly. All five `questions:` anchors
(`design/ddd#q48`, `#q49`, `design/microservices-data#q92`,
`data/transactions-mvcc#q32`, `java/distributed-systems#q123`) were checked
against the built reference pages before writing. **Carries no diagram of
its own** — `design/ddd#q48` already draws exactly the root/children/
ID-reference structure §2 explains (it's on the diagrams target list:
"aggregate boundary and transactional scope (Q48)"), so per **A concept page
links to a reference diagram, it does not copy it** §2 adds one linking
sentence pointing at Q48's diagram instead of drawing a new one — the fifth
Core-tier "link, don't copy" case, after `virtual-threads`, `isolation-levels`,
and `spring-proxy` (`cache-invalidation` and `persistence-context` needed no
diagram of any kind). Adds nothing to the diagram count. 8 self-check items,
with `where` pointers written at conversion time, same discipline as the
other converted Core pages. Both `pnpm types:check` and `pnpm build` pass,
and the reverse link on `design/ddd#q48` was verified in the browser ("The
model behind this answer: Aggregates as Consistency Boundaries"), alongside
the Q48 mermaid diagram rendering with no "Syntax error" text. It's in the
sidebar after `persistence-context`.

**`backpressure`: converted 2026-09-12**, the eleventh Core page taken to
`content/docs/concepts/`, immediately after `aggregates`. One currency fix,
the same shape as `isolation-levels`'s and `cache-invalidation`'s stale
Postgres pins: Lab 5's `docker run` pinned `rabbitmq:3-management`, while
`broker-semantics` (converted the day before) already pins
`rabbitmq:4.3-management` — updated to match, in both
`_source/backpressure.mdx` and the converted page, so they no longer
diverge on that line. Nothing else in the draft is version-pinned — Little's
Law, the RabbitMQ `vm_memory_high_watermark` mechanism, `CallerRunsPolicy`,
the Reactive Streams `request(n)` protocol, the Netflix concurrency-limits
library and the Google SRE Book chapter reference are all stable citations
with no JEP or release-cadence exposure, so no other correction was needed.
`prerequisites: [thread-pools]` resolves to a built foundational page, no
conversion-order issue. All five `questions:` anchors (`java/collections#q30`,
`java/concurrency#q53`, `data/rabbitmq#q92`, `data/rabbitmq#q102`,
`data/cross-cutting#q139`) were checked against the built reference pages
before writing, along with the prose cross-references to
`design/microservices-communication#q81` in §6 and to the `virtual-threads`
and `thread-pools` concept pages. **Carries no diagram** — `java/concurrency#q53`
already has its own `ThreadPoolExecutor` core→queue→max→rejection-flow
diagram (on the reference-bank target-19 list) but §3's table only
*names* the thread pool as one queue among seven rather than explaining that
mechanism in depth, so there was nothing of this page's own to draw; none of
`#q30`, `#q92`, `#q102` or `#q139` carries a diagram either. This matches the
draft's own second-six-drafts audit finding (**"none carries a diagram"**)
rather than a link-don't-copy judgement like `aggregates`'s. 8 self-check
items, with `where` pointers written at conversion time, same discipline as
the other converted Core pages. Both `pnpm types:check` and `pnpm build`
pass, and the reverse link on `java/collections#q30` was verified in the
browser ("The model behind this answer: Backpressure and the Unbounded
Queue" alongside `thread-pools`) — the third verified case of a question
claimed by two concept pages, after `java/jvm-memory-gc#q80`/`java/streams#q47`
and `java/concurrency#q62`. It's in the sidebar between `thread-pools` and
`virtual-threads`.

**`coupling-and-cohesion`: converted 2026-09-12**, the twelfth Core page
taken to `content/docs/concepts/`, immediately after `backpressure` — the
third of the second six drafts converted. Checked for staleness before
converting, and two things needed fixing, neither found by the earlier
drafts' currency audit because that audit measured MDX hazards and anchor
validity, not tool currency:

- **A broken cross-reference.** §3's stamp-coupling paragraph linked the Law
  of Demeter to `/docs/java/core-language#q5` — that anchor exists, but it's
  "How do you design a properly immutable class?", not the Law of Demeter.
  The real Law of Demeter question is `design/oop-fundamentals#q5`. Fixed in
  both `_source/coupling-and-cohesion.mdx` and the converted page.
- **A stale tool recommendation.** §4 named "JDepend and ArchUnit for Java,
  Structure101 for a visual dependency graph" as the way to compute Ca/Ce/I.
  Structure101 was acquired by SonarSource in 2024 and no longer exists as a
  standalone product — it was folded into Sonar's Clean Code offering.
  JDepend, which originated the Ca/Ce/I metrics the page teaches, is itself
  unmaintained. Rewrote the paragraph (and Lab 2) to recommend ArchUnit as
  the tool actually run today, cite IntelliJ IDEA's Dependency Matrix or
  CodeScene's X-ray view as current options for a visual graph, and keep
  JDepend only as the citation for the original metric definitions — not as
  a tool to install. Robert Martin's Ca/Ce/I formulas, the coupling-degree
  taxonomy, the git co-change technique, and the ArchUnit `slices()`/
  `beFreeOfCycles()` API in Lab 4 needed no correction; all four are either
  timeless definitions or still-current API, checked against the ArchUnit
  user guide.

`prerequisites: [dependency-inversion]` resolves to a built foundational
page, no conversion-order issue. All four `questions:` anchors
(`design/oop-fundamentals#q4`, `design/solid-principles#q24`,
`design/architecture-styles#q54`, `design/microservices-boundaries#q65`)
were checked against the built reference pages before writing — each is the
section heading the draft's prose cross-reference names, not a paraphrase.
**Carries one diagram**, added at conversion time rather than present in the
draft: a `quadrantChart` plotting instability against abstractness (the
"zone of pain" / "sweet spot" quadrants the Stable Abstractions Principle in
§4 argues for), the library's first use of Mermaid's quadrant-chart type
rather than a flowchart or sequence diagram. Checked against the reference
bank first — neither `design/oop-fundamentals#q4` nor
`design/solid-principles#q24` carries a diagram of its own, so this shows a
mechanism the reference bank doesn't, per **Add a diagram only if it shows
something the reference bank doesn't already**. The first draft of the
diagram used a colon inside quadrant labels (`quadrant-1 Sweet spot: stable,
abstract`), which is invalid mermaid quadrant-label syntax and threw a parse
error at render — fixed by moving the descriptive text out of the quadrant
labels and onto the four data points instead. 8 self-check items, with
`where` pointers written at conversion time, same discipline as the other
converted Core pages. Both `pnpm types:check` and `pnpm build` pass; the
diagram was verified in the browser at 375px (`viewBox="0 0 500 500"`,
≈69% rendered scale, no horizontal overflow, no "Syntax error" text, no
overlapping quadrant labels — the failure mode the first draft's colons
caused), and the reverse link on `design/oop-fundamentals#q4` was verified
in the browser ("The model behind this answer: Coupling, Cohesion, and What
Makes a Change Expensive"). It's in the sidebar after `aggregates`.

**`escape-analysis`: converted 2026-09-12**, the thirteenth Core page taken
to `content/docs/concepts/`, immediately after `coupling-and-cohesion` — the
fourth of the second six drafts converted. Checked for staleness before
converting, and one thing needed fixing: "Where to go deeper" and §7 both
cited "JEP drafts for Project Valhalla's value classes" — vague even at draft
time, and stale by conversion, since Valhalla now has a real, numbered JEP.
Corrected both to **JEP 401: Value Classes and Objects (Preview)**, which
had its first preview in JDK 25 and is now targeting **JDK 28** (March 2027,
with early-access builds already at `jdk.java.net/valhalla`), plus its
companion **JEP 539: Strict Field Initialization in the JVM**. Fixed in both
`_source/escape-analysis.mdx` and the converted page, the same "state the
current status rather than guess at a moving target" correction
`virtual-threads` made for its own JEP references. Everything else in the
draft — scalar replacement, lock elision, `FreqInlineSize`,
`-XX:+PrintEscapeAnalysis`/`-XX:+PrintEliminateLocks`, the Choi/Gupta/Serrano
citation — is stable JIT mechanics with no version exposure, so no other
correction was needed.

**A second fix, in the frontmatter, not the prose.** The draft's `unlocks`
listed `lock-elision` alongside `performance-tuning`, `value-types` and
`valhalla` — but lock elision is §4 *of this page*, not a page that comes
next, the same mistake the JMM page's original `unlocks` made before it was
corrected (see **`unlocks` — the pages that come next**). Dropped it.
`value-types` and `valhalla` were also two slugs for one unwritten page —
consolidated to `value-types`, matching the feature-named style every other
Specialist slug uses rather than a project name. Final: `unlocks:
[performance-tuning, value-types]`, fixed in both the draft and the
converted page.

`prerequisites: [jit, generational-gc]` resolves to two built foundational
pages, no conversion-order issue. All four `questions:` anchors were checked
against the built reference pages before writing: `java/jvm-memory-gc#q79`
and `#q80` (JIT compilation and escape analysis itself), `java/concurrency#q58`
(safe publication — a new claim, not previously held by any concept page),
and `java/streams#q47`, which `stream-pipelines` had already flagged as
"claimed three times over" if a third page took it — this is that third
claim, fulfilling the prediction: `#q80` and `#q47` are now each claimed by
three concept pages (`generational-gc`, `jit`, `escape-analysis`), the first
time any question in the library has hit three. **Carries one diagram**,
added at conversion time rather than present in the draft: a flowchart of
the shared escape-analysis gate — inlined? escapes? — branching into scalar
replacement and, independently, lock elision. Checked against the reference
bank first: neither `java/jvm-memory-gc#q79` nor `#q80` carries a diagram of
its own, both stop at prose, so this shows a mechanism the reference bank
doesn't, per **Add a diagram only if it shows something the reference bank
doesn't already** — a clean case like `persistence-context`'s and
`coupling-and-cohesion`'s, not a link-don't-copy judgement. 8 self-check
items, with `where` pointers written at conversion time, same discipline as
the other converted Core pages. Both `pnpm types:check` and `pnpm build`
pass; the diagram was verified in the browser at 375px (`viewBox="0 0
621.9609375 1558"`, ≈55% rendered scale, no horizontal overflow, no "Syntax
error" text), and the reverse link was verified on both `java/jvm-memory-gc#q80`
(now listing all three claiming pages) and `java/concurrency#q58` (listing
`escape-analysis` and `jmm`). It's in the sidebar after `jit`, ahead of
`btrees-selectivity`.

**`locking-and-deadlock`: converted 2026-09-12**, the fourteenth Core page
taken to `content/docs/concepts/`, immediately after `escape-analysis` — the
fifth of the second six drafts converted. Checked for staleness before
converting: Coffman's four conditions, lock ordering, InnoDB gap locks,
`jstack`/`jcmd Thread.print`, SQLSTATE 40P01/MySQL error 1213, and Spring
Retry's `@Retryable` are all either historical formalisation or stable,
current mechanics with no version-pinned API or JEP — unlike
`virtual-threads` or `escape-analysis`, nothing here needed a currency fix,
and unlike `isolation-levels` and `cache-invalidation`, the draft pins no
`docker run` image tag to go stale against. **One `questions:` claim did not
survive the check**, though: the draft claimed `java/concurrency#q59`
(`AbstractQueuedSynchronizer`), but nothing in the draft explains AQS's
mechanism — `ReentrantLock` and `tryLock(timeout)` are mentioned only as a
JVM-detection footnote in §5 and §7. Q59 was already properly claimed by
`cas-and-contention`, which does build that model. Dropped `#q59` from
`questions:` in both `_source/locking-and-deadlock.mdx` and the converted
page, the same "claim only what the page actually teaches" discipline as
`coupling-and-cohesion`'s broken cross-reference fix — a wrong claim caught
before writing, not after. `prerequisites: [isolation-levels]` resolves to a
built Core page, no conversion-order issue; `isolation-levels`'s own
`unlocks` already named `locking-and-deadlock`, so this is that edge
resolving. The remaining two `questions:` anchors (`data/transactions-mvcc#q35`,
`#q36`) and `java/concurrency#q55` were checked against the built reference
pages before writing — `#q35` and `#q36` are also claimed by
`isolation-levels`, the fourth verified case of a question claimed by two
concept pages, after `java/jvm-memory-gc#q80`/`java/streams#q47`,
`java/concurrency#q62`, and `java/concurrency#q49`. **Carries one diagram** —
a two-node wait-for graph (holds/wants edges closing the cycle) illustrating
the circular-wait condition from §2, added at conversion time rather than
present in the draft. Checked against the reference bank first: none of
`data/transactions-mvcc#q35`, `#q36`, or `java/concurrency#q55` carries a
diagram of its own, so nothing existed to link to — a clean **Add a diagram
only if it shows something the reference bank doesn't already** case, not a
link-don't-copy judgement. 8 self-check items, with `where` pointers written
at conversion time, same discipline as the other converted Core pages. Both
`pnpm types:check` and `pnpm build` pass; the diagram was verified in the
browser at 375px (`viewBox="0 0 277.25 230.453125"`, ≈74% rendered scale, no
horizontal overflow, no "Syntax error" text — the widest margin of any
diagram in the library so far, since two nodes is the smallest graph the
"phone-readable" rules have had to render), and the reverse link on
`java/concurrency#q55` was verified in the browser ("The model behind this
answer: Locking and Deadlock"). It's in the sidebar between `isolation-levels`
and `the-log`.

**`partitioning`: converted 2026-09-12**, the fifteenth Core page taken to
`content/docs/concepts/`, immediately after `locking-and-deadlock` — the
sixth and last of the second six drafts converted, closing that batch out.
Checked for staleness before converting: `HashMap`'s spread/bucket mechanism,
`LongAdder`'s per-thread cells, Redis Cluster's 16,384 CRC16 slots and hash
tags, the Kafka default partitioner, and consistent hashing are all stable,
version-agnostic mechanics with no JEP or release-cadence exposure. **One
currency fix**, the same shape as `broker-semantics`'s and `backpressure`'s:
Lab 2's `docker run` pinned `apache/kafka:latest`, a floating tag — updated to
`apache/kafka:4.0.0` to match the pin `kafka-internals` already established
for the same image, in both `_source/partitioning.mdx` and the converted
page, so a rebuild of the lab stays reproducible rather than silently
tracking whatever Kafka ships next. `redis:7` needed no change, per **Two
currency items carried into these drafts** already having closed that
question — the corpus has not moved off that tag. `prerequisites: [hashmap,
cas-and-contention]` resolves to two built pages — the ordering constraint
flagged under **The second six drafts** below (convert `cas-and-contention`
before `partitioning`) was satisfied when `cas-and-contention` converted
2026-09-12, so no conversion-order issue remained by the time this page's
turn came. All five `questions:` anchors (`java/collections#q22`,
`data/scaling-operations#q48`, `#q49`, `data/kafka#q112`,
`data/redis-caching#q67`) were checked against the built reference pages
before writing, along with the prose cross-references to
[cache-invalidation](/docs/concepts/cache-invalidation),
[the HashMap page](/docs/concepts/hashmap),
[the CAS page](/docs/concepts/cas-and-contention), and
[the extraction pattern](/docs/concepts/bounded-contexts). **Carries one
diagram**, added at conversion time rather than present in the draft: a
two-lane flowchart contrasting hashing directly to a physical unit against
hashing to a fixed set of logical buckets that are then mapped to physical
ones — the indirection §5 argues is "the single most transferable rule on
the page." Checked against the reference bank first: none of the five
claimed anchors carries a diagram of its own, and the indirection mechanism
isn't drawn anywhere in the corpus, so this is a clean **Add a diagram only
if it shows something the reference bank doesn't already** case, not a
link-don't-copy judgement — this page's own audit entry already predicted
"none carries a diagram" for the drafted state, and that held true until
conversion added one, the same pattern as `coupling-and-cohesion`,
`escape-analysis` and `locking-and-deadlock` before it. 8 self-check items,
with `where` pointers written at conversion time, same discipline as the
other converted Core pages. Both `pnpm types:check` and `pnpm build` pass;
the diagram was verified in the browser at 375px (`viewBox="0 0 274.390625
1108.218017578125"`, ≈73% rendered scale on its narrower axis, no horizontal
overflow, no "Syntax error" text — the two subgraphs stack vertically via
Mermaid's own layout rather than needing an explicit `~~~` link, since each
subgraph is already a single-column chain), and the reverse link on
`java/collections#q22` was verified in the browser, showing both `How
HashMap Actually Works` and `Partitioning — One Idea in Five Systems` under
"The model behind this answer." It's in the sidebar after
`coupling-and-cohesion`, at the end of the list. Its own `unlocks`
(`sharding`, `kafka-internals`, `hot-keys`, `consistent-hashing`,
`scaling-strategy`) reuses two existing Specialist promises
(`kafka-internals` — now itself Core and converted, an edge that resolves
rather than dangles; `hot-keys`, already promised by `cache-invalidation`)
and fixes two new Specialist slugs, `consistent-hashing` and
`scaling-strategy`, recorded in the Specialist list below alongside
`sharding`.

**`class-loading`: drafted and converted 2026-09-12**, the sixteenth Core
page taken to `content/docs/concepts/`, immediately after `partitioning` —
outside both batches of six, like `broker-semantics`, `kafka-internals` and
`stream-pipelines` before it, and the last Core gap in the JVM group. Written
fresh rather than converted from a waiting draft, so currency was checked at
authoring time rather than corrected afterwards; five moving items were
verified against primary sources before the prose was written, and all five
are stated as of September 2026:

- **`sun.misc.Unsafe` memory access** — [JEP
  471](https://openjdk.org/jeps/471) deprecated it in JDK 23, [JEP
  498](https://openjdk.org/jeps/498) warns in 24, and
  `--sun-misc-unsafe-memory-access` **defaults to `deny` in JDK 26**, with
  removal in JDK 28 or later. The page states the deny default rather than
  the deprecation, which is the fact that changes behaviour.
- **Hidden classes** — [JEP 371](https://openjdk.org/jeps/371) (JDK 15);
  `Unsafe::defineAnonymousClass` was **removed in JDK 17**, not merely
  deprecated, and `MethodHandles.Lookup::defineHiddenClass` is the
  replacement.
- **Project Leyden's AOT cache** — JEP 483 (24), 514 and 515 (25), and **JEP
  516 (26)** making it GC-agnostic. The load-bearing detail for this page is
  [JEP 483](https://openjdk.org/jeps/483)'s stated limitation, quoted from
  the JEP rather than paraphrased: only classes loaded by the JDK's built-in
  loaders can be cached, and JVMTI agents using `ClassFileLoadHook` are
  refused. **That makes a custom loader a startup-cost decision, not only an
  isolation one** — the page's sharpest current claim, and the reason this
  page reads differently in 2026 than it would have in 2020.
- **Spring Boot DevTools' `RestartClassLoader`** — still present and still
  parent-last in Spring Boot 4.1.x, checked rather than assumed, since the
  page cites it as the live example of child-first delegation now that
  production hot redeploy is dead.
- **Tomcat** — 11.0.x is current (11.0.25, August 2026); Tomcat 12 is in
  development with no release. The "go deeper" link points at the 11.0
  listener documentation, not a 9.0 URL.

`prerequisites: [jvm-memory]` resolves to a built foundational page, no
conversion-order issue. All four `questions:` anchors
(`java/jvm-memory-gc#q81`, `java/core-language#q14`, `java/concurrency#q52`,
`java/modern-java#q90`) were checked against the built reference pages before
writing, along with the prose cross-references to
`java/modern-java-22-25#q148`, `#q150`, `#q153` and `java/modern-java#q91`.
**Two candidate claims were dropped** on the `locking-and-deadlock`
"claim only what the page actually teaches" discipline:
`java/modern-java-22-25#q150` (the AOT cache — the page teaches its
custom-loader limitation, not the training-run/native-image model Q150 asks
for) and `java/spring#q104` (auto-configuration — classpath-driven, but its
model is conditions and ordering, which belongs to `spring-proxy`'s
territory). Both are prose cross-references instead. `#q81` is also claimed
by `jvm-memory`, verified in the browser as a two-page reverse link.

**Carries one diagram** — a path-to-GC-root tracing a pooled thread's
`ThreadLocalMap` entry through its value to the deployment's loader and every
class it defined, with the weak key drawn as a dotted edge against the strong
value's thick one. Checked against the reference bank first:
`java/jvm-memory-gc#q81` carries no diagram (Q71's Metaspace box is a
different picture, and the page links to `jvm-memory` for it), and no diagram
anywhere in the corpus draws a retention path, so this is a clean **Add a
diagram only if it shows something the reference bank doesn't already** case,
not a link-don't-copy judgement. 12 sections, ~2,700 words of prose, 8
self-check items with `where` pointers written at conversion time. Both `pnpm
types:check` and `pnpm build` pass; the diagram was verified in the browser
at 375px (`viewBox="0 0 478.755 742"`, ≈72% rendered scale, no horizontal
overflow, no "Syntax error" text), and the reverse link was verified on all
four claimed anchors. It's in the sidebar after `escape-analysis`, closing
out the JVM run before `btrees-selectivity`.

**`query-planning`: converted 2026-09-12**, the seventeenth Core page taken
to `content/docs/concepts/`, immediately after `class-loading`. Unlike every
Core conversion before it, the draft was **already sitting untracked in
`_source/`** at the start of the session rather than written in it, so the
currency pass was a genuine audit of someone else's prose rather than a
re-read of this session's own. **Four things needed fixing, and one of them
was a lab step that could not run:**

- **`SET enable_indexskipscan = off` does not exist.** Lab 7 told the reader
  to switch off PostgreSQL 18's new B-tree skip scan to compare plans. There
  is no such GUC — checked against the PG 18 *Query Planning* documentation,
  whose `enable_*` list has twenty-four entries and no skip-scan member, because
  skip scan is not a planner method with a toggle of its own. Rewrote the step
  to force the alternative with `enable_indexscan`/`enable_bitmapscan` instead,
  and turned the absence into the teaching point, since looking for that GUC
  mid-incident is the natural mistake. **This is the first converted page whose
  lab contained an instruction that would error rather than merely age** — the
  other currency fixes across the corpus have all been stale pins or superseded
  JEP numbers.
- **SQL Server's parameter sniffing is no longer the 2019 story.** §7 said the
  first execution's values are "baked in indefinitely" with `OPTIMIZE FOR
  UNKNOWN` and `RECOMPILE` as the canonical remedies. Since **SQL Server 2022**,
  Parameter Sensitive Plan optimization dispatches up to three plan variants for
  an eligible skewed predicate automatically, so those two are now the fallback
  for what PSP declines — typically a distribution not skewed enough to qualify.
  Rewritten to say so, keeping the section's actual point (same symptom as
  PostgreSQL's, different cause, do not carry either engine's advice into the
  other).
- **Oracle's feature has a different name now.** §4 cited "Oracle's cardinality
  feedback"; that became **statistics feedback** in 12c. Now reads
  "statistics feedback (cardinality feedback before 12c)", and SQL Server's
  half is pinned to 2022, where CE feedback actually shipped.
- **PostgreSQL 19 gives the hints argument a first-party answer.** §10 argued
  hints are debt, naming only `pg_hint_plan`. PG 19 — **in beta 3 as of
  2026-09-12, not released; 18.6 is current stable** — ships a `pg_plan_advice`
  contrib module: `EXPLAIN (PLAN_ADVICE)` emits a plan-shape string, and
  `pg_plan_advice.advice` asks the planner to repeat those decisions. Added a
  paragraph, stated with its beta status rather than as shipped, the same
  discipline `virtual-threads` used for JEP 525. Its own documentation warns
  that pinned advice stops the planner adapting when the distribution shifts —
  which is this page's argument, so the paragraph strengthens §10 rather than
  softening it. A matching primary-source pointer went into "Where to go
  deeper".

Everything else checked out and was left alone: `default_statistics_target` 100,
`from_collapse_limit`/`join_collapse_limit` 8, `geqo_threshold` 12, the
five-execution custom-plan rule and `plan_cache_mode`, CTE inlining since PG 12,
`BUFFERS` on by default and the `Index Searches` line both new in 18 — all
verified against the PG 18 documentation rather than assumed. The lab's
`docker run` already pinned `postgres:18`, matching the other six Postgres labs
in the corpus, so unlike `isolation-levels` and `cache-invalidation` there was
no stale tag to fix.

`prerequisites: [btrees-selectivity]` resolves to a built foundational page, no
conversion-order issue, and it is the graph's twenty-sixth resolving edge. All
five `questions:` anchors (`data/query-performance#q16`, `#q18`, `#q19`, `#q20`,
`#q25`) were checked against the built reference page before writing, along with
the prose cross-references to `#q21`, `#q26` and `#q27`. All five are **first
claims** — `data/query-performance`'s only prior claims were `#q17`
(`btrees-selectivity`) and `#q22` (`mvcc`), neither touched — so this is one of
the few conversions that moves the coverage count. **Carries one diagram**,
present in the draft rather than added at conversion: a plan tree annotated with
estimate against actual, showing one wrong leaf estimate propagating into the
join method, the sort's `work_mem` sizing and the aggregate. Checked against the
reference bank first: `data/query-performance` carries exactly one diagram, on
`#q17` (B-tree descent, heap fetch vs index-only scan), and none of the five
claimed anchors carries one; nothing in the corpus draws estimate-versus-actual
propagation through a plan tree, so this is a clean **Add a diagram only if it
shows something the reference bank doesn't already** case, not a
link-don't-copy judgement. 12 sections, 8 self-check items with `where` pointers
written at conversion time — item 8 points at two sections of **Leading on
this**, the `jit`-item-7 pattern. Both `pnpm types:check` and `pnpm build` pass;
the diagram was verified in the browser at 375px (`viewBox="0 0
533.4791870117188 526"`, ≈64% rendered scale, no horizontal overflow, no
"Syntax error" text), and **both link directions** were verified — the concept
page's "Reference questions this page explains" lists all five with no
`broken reference`, and `/docs/data/query-performance` renders "The model behind
this answer" at exactly seven anchors, the five new ones plus the two
pre-existing. It's in the sidebar after `btrees-selectivity`, ahead of `mvcc`.

**Core** — **all twenty-one drafted and converted**, fifteen as of 2026-09-11
and `class-loading`, `query-planning`, `consistency-models`,
`expression-problem`, `conways-law` then `microservices-org` on 2026-09-12.
**The Core tier is closed**; every slug in the table below is a built page in
`content/docs/concepts/` —
three the same day the drafts landed, `virtual-threads` on 2026-09-12,
`cas-and-contention` the same day as `virtual-threads`, `isolation-levels`
immediately after `cas-and-contention`, `cache-invalidation`
immediately after `isolation-levels`, `spring-proxy` immediately after
`cache-invalidation`, and `persistence-context` immediately after
`spring-proxy`, all six same day. Six were the
first batch (`virtual-threads`, `cas-and-contention`, `isolation-levels`,
`cache-invalidation`, `spring-proxy`, `persistence-context`) — **all six now
converted**, closing that batch out; six more
followed the same day (`aggregates`, `backpressure`, `coupling-and-cohesion`,
`escape-analysis`, `locking-and-deadlock`, `partitioning`). Of that second
six, `aggregates` converted 2026-09-12 immediately after `persistence-context`,
`backpressure` converted immediately after `aggregates`,
`coupling-and-cohesion` converted immediately after `backpressure`,
`escape-analysis` converted immediately after `coupling-and-cohesion`,
`locking-and-deadlock` converted immediately after `escape-analysis`, and
`partitioning` converted immediately after `locking-and-deadlock` — **all six
now converted**, closing this batch out too. Three more were
added the same day from the coverage audit below — `broker-semantics`,
`stream-pipelines`, and `kafka-internals` promoted from Specialist — and all
three were drafted and converted the same day. `stream-pipelines` claims five
of `java/streams`' eleven questions (Q37, Q38, Q40, Q41, Q44 — deliberately
not Q47, already claimed three times over) and `prerequisites: []`, a
deliberate root: nothing in the built graph is a genuine dependency, and
`thread-pools` is an adjacent cross-reference in §5, not a prerequisite.
`class-loading` was the sixteenth, drafted and converted 2026-09-12, closing
the last Core gap in the JVM group — see its entry below. `query-planning` was
the seventeenth, converted 2026-09-12 from a draft already sitting untracked in
`_source/` — see its entry below. `consistency-models` was the eighteenth,
drafted and converted 2026-09-12 — see its entry below. `expression-problem`
was the nineteenth, drafted and converted 2026-09-12 — see its entry below.
`conways-law` was the twentieth, drafted and converted 2026-09-12 — see its
entry below. `microservices-org` was the twenty-first and last, drafted and
converted the same day — see its entry below. Both were held back on the
grounds that they were essays rather than mechanism pages, and both turned out
to have a mechanism after all: coordination cost for `conways-law`, and the
conditional-benefit/unconditional-cost asymmetry for `microservices-org`.
**That is the lesson to carry into any future page that looks like an
essay** — look for the mechanism before concluding there isn't one.

**`conways-law`: drafted and converted 2026-09-12**, the twentieth Core page
taken to `content/docs/concepts/`, immediately after `expression-problem`.
Written fresh rather than converted from a waiting draft, so — like
`class-loading`, `consistency-models` and `expression-problem` — currency was
checked at authoring time against primary sources. The theory is timeless
(Conway 1968; the mirroring hypothesis; socio-technical congruence) but the
practitioner half moves, and **four items were verified rather than recalled,
two of which most current writing gets wrong**:

- ***Team Topologies* has a second edition, and it is the one to cite.**
  Skelton and Pais, IT Revolution, **23 September 2025**. Nearly all writing
  on this subject still cites the 2019 first edition. The second promotes
  **cognitive load** from a chapter to the organising principle, and
  clarifies that a "platform team" is better understood as a **platform
  grouping** — itself composed of the other team types, because the pattern
  is fractal. The four team types and three interaction modes are unchanged
  in name, checked against `teamtopologies.com/key-concepts` rather than
  assumed.
- **The Nagappan comparison table was checked digit by digit**, because a
  half-remembered version of it is the sort of thing that gets repeated in
  an interview and is wrong. Table 4 of the ICSE 2008 paper: organisational
  structure 86.2% / 84.0%, code coverage 83.8% / 54.4%, code complexity
  79.3% / 66.0%, code churn 78.6% / 79.9%, dependencies 74.4% / 69.9%,
  pre-release bugs 73.8% / 62.9%. The 3,404-binary figure is the paper's own
  2268 + 1136 train/test split. Note the paper also reports 87% / 84%
  averaged over 50 random splits earlier in the text — Table 4's numbers are
  the ones to quote, since they are the comparison.
- **DORA's most recent report is 2025, not 2026** — checked against
  `dora.dev/research`, since a 2026 report would normally have landed by
  late September and had not. Its platform findings are stated from the
  primary capability page: 90% of organisations report an internal developer
  platform and 76% run a dedicated platform team, and platforms can
  *decrease* throughput and change stability when not carefully managed,
  with a J-curve. **A search result claiming DORA found mandated platforms
  produce lower developer satisfaction was discarded** — it came from an SEO
  aggregator, not from DORA — so the page attributes "optional and
  attractive" to *Team Topologies*, which is where it actually comes from.
- **Backstage is CNCF Incubating, not graduated** (accepted 2020, incubating
  since March 2022, security audit underway as of 2026). Checked, then cut:
  the page argues the platform question in terms of cognitive load and
  adoption rather than tooling, and naming a product would have dated it for
  no gain — the same judgement `coupling-and-cohesion` reached the hard way
  with Structure101.

`prerequisites: [bounded-contexts, coupling-and-cohesion]` resolves to one
built foundational page and one built Core page — the graph's twenty-ninth
and thirtieth resolving edges. Both are handoffs the prerequisite pages
explicitly set up: `bounded-contexts` states Conway's law in one paragraph
and defers ("a proposed decomposition without a matching ownership model is
half a design"), and `coupling-and-cohesion` builds the co-change instrument
this page joins against ownership. **Five `questions:` anchors, all first
claims and all on one reference page**: `design/microservices-boundaries#q64`,
`#q66`, `#q69`, `#q70`, `#q72`. That takes `microservices-boundaries` from
three claimed to eight of eighteen. **Q61, Q62 and Q73 were deliberately left
unclaimed for `microservices-org`** — they are the "why microservices, and
what do they cost" questions, which is that page's subject, not this one's.
All five anchors and the eleven prose cross-references were checked against
the built pages before writing.

**Carries one diagram** — the communication structure above, the three seams
below, with the intra-team seam dotted ("free to cross: erodes") against the
on-the-team-line seam thick ("costs a negotiation: holds"), so the picture
carries §4's cost argument rather than merely labelling the boundaries.
Checked against the reference bank first: `design/microservices-boundaries`
carries two diagrams, on `#q65` (distributed monolith vs properly bounded)
and `#q68` (strangler fig), and **neither is this picture** — Q65 draws
runtime and deployment coupling between services, with no team in it at all —
while none of the five claimed anchors carries a diagram of its own. A clean
**Add a diagram only if it shows something the reference bank doesn't
already** case, not a link-don't-copy judgement. 12 sections, ~4,200 words of
prose — **marginally the longest page in the library**, ahead of
`expression-problem` (3,807), because it carries three separate pieces of
empirical evidence and six labs; it was trimmed by ~350 words before
conversion rather than left at its first length. 8 self-check items with
`where` pointers written at conversion time; item 8 is the `jit`-item-7
pattern, pointing at a section plus the lab that measures it. Both `pnpm
types:check` and `pnpm build` pass; the diagram was verified in the browser
at 375px (`viewBox="0 0 278.5104064941406 730"`, **100% rendered scale** — it
is narrow enough to need no scaling at all, joining `generics-erasure` at the
top of the phone-readability table — no horizontal overflow, no "Syntax
error" text), and **both link directions** were verified: the concept page
lists all five with no `broken reference`, and `/docs/design/microservices-boundaries`
renders "The model behind this answer: Conway's law and the inverse
manoeuvre" at exactly `#q64`, `#q66`, `#q69`, `#q70` and `#q72` and nowhere
else. It's in the sidebar between `coupling-and-cohesion` and
`expression-problem`.

**`microservices-org`: drafted and converted 2026-09-12**, the twenty-first
and final Core page taken to `content/docs/concepts/`, immediately after
`conways-law` — **closing the Core tier**. Written fresh rather than converted
from a waiting draft, so currency was checked at authoring time against primary
sources. The theory here is stable (Conway, Fowler's prerequisites and
*MonolithFirst*, Newman) but the practitioner half is unusually exposed, and
**five items were verified rather than recalled, three of which most current
writing gets wrong**:

- **Google's Service Weaver is dead, and the reason is the page's own
  argument.** The Go framework for writing a logical monolith and letting the
  runtime choose the deployment topology entered **maintenance mode on 5
  December 2024**, the repository was **archived in 2025**, and the GitHub
  organisation was marked archived in **March 2026**; the stated reason is that
  adoption required rewriting large parts of existing applications. This is the
  `Structure101` shape of staleness — a tool still widely cited as current —
  and it is load-bearing rather than trivia: the most serious attempt to make
  the split a late-bound *technical* decision failed, which is §7's sharpest
  claim. Anyone citing Service Weaver as a live option is working from 2023.
- **Amazon Prime Video is cited constantly and read wrongly.** The March 2023
  post is the Video Quality Analysis team moving **one** monitoring component
  from Step Functions plus Lambda to a single ECS task, with the 90% saving
  coming from eliminating S3 round trips for video frames and Step Functions
  state transitions. It is a data-transfer argument about one component owned
  by one team, **not an organisational argument at all** — which is why it fits
  this page's model rather than contradicting it. Do not let a later session
  "correct" this into "Amazon abandoned microservices".
- **Istio's ambient mode reached GA in v1.24 on 7 November 2024**, checked
  against the Istio and CNCF announcements, with the sidecar now legacy for new
  deployments. This is the page's currency spine: **the per-service
  infrastructure tax has fallen and the coordination cost has not**, so the
  break-even moved left while the shape of the argument did not. That is what
  makes the page read differently in 2026 than it would have in 2019.
- **Spring Modulith is at 2.1.1** (aligned with Spring Boot 4), and Lab 4's API
  was checked against the reference documentation rather than recalled:
  `ApplicationModules.of(Application.class).verify()`, with the test starter
  `org.springframework.modulith:spring-modulith-starter-test`. The three
  verification rules in §6 are taken from that documentation.
- **Sam Newman's *Building Microservices* has no third edition** — the second
  (O'Reilly, August 2021) is current, checked rather than assumed, because a
  fabricated edition is exactly the kind of citation that survives
  unchallenged.

**Two things were deliberately *not* claimed as evidence.** The 15–20 and ~30
engineer thresholds in the reference bank are practitioner heuristics, and §4
says so explicitly: **no study establishes a headcount at which microservices
begin to pay**, and the page says the useful reading is where the count of
separately-deciding teams passes two or three. And InfoQ's Culture and Methods
report of **August 2026** (its Architecture and Design trends report is still
the **April 2025** one — checked; there is no 2026 edition) has its panel
arguing the two-pizza team is becoming a one-pizza team; §7 states that as a
panel's reading of an early-market trend, not as evidence, the same discipline
`conways-law` used when it discarded an SEO aggregator's DORA claim.

`prerequisites: [conways-law, bounded-contexts]` resolves to two built pages —
the graph's **thirty-first and thirty-second** resolving edges. `conways-law`
already declared `microservices-org` in its own `unlocks`, so this is that
promise resolving rather than a new edge invented here.
**`unlocks: [modular-monolith, platform-engineering, service-decomposition]`
introduces no new Specialist slug** — the first Core page to introduce none,
which is what closing a tier looks like.

**Five `questions:` anchors, all first claims**:
`design/microservices-boundaries#q61`, `#q62`, `#q73`, `#q74`, and
`design/architecture-styles#q55`. The first three are exactly the ones
`conways-law` **reserved** for this page ("when not to", "monolith first", "the
real costs") — that reservation is now discharged, and the prediction held with
no drift, the second time running that a coverage-audit forecast named the
exact questions the eventual page took. Q74 (merging services back) was
unclaimed and is §8's subject. **Q55 (modular monolith) is claimed here
deliberately**, because §6 builds the choose-it-and-enforce-it model rather than
merely naming it; the unwritten Specialist `modular-monolith` page remains free
to claim it too, since a question may be claimed by more than one concept page.
That takes `microservices-boundaries` to **12 of 18** and `architecture-styles`
to **4 of 8**.

**Carries one diagram** — a `quadrantChart` of team independence against
deployment independence, the library's second use of that type after
`coupling-and-cohesion`. The two *off*-diagonals are the point: the distributed
monolith (split further than ownership) and the release train (many teams, one
pipeline), the second of which has no common name and is the under-diagnosed
one. Checked against the reference bank first: `design/microservices-boundaries`
carries two diagrams, on `#q65` and `#q68`, and **neither is this picture** —
Q65 draws what a distributed monolith looks like at runtime, this draws why you
end up in one; `design/architecture-styles`' two are on `#q53` and `#q60`, also
unrelated. None of the five claimed anchors carries a diagram of its own. A
clean **Add a diagram only if it shows something the reference bank doesn't
already** case, not a link-don't-copy judgement.

12 sections, ~4,600 words — **marginally the longest page in the library**,
taking that from `conways-law` (4,447 measured the same way), and trimmed by
~130 words before conversion rather than left at first length. 8 self-check
items with `where` pointers written at conversion time; items 5, 6 and 8 point
at two sections each. Both `pnpm types:check` and `pnpm build` pass; the diagram
was verified in the browser at 375px (`viewBox="0 0 500 500"`, ≈69% rendered
scale, no horizontal overflow, no "Syntax error" text). **One diagram fix at
verification:** the first version placed the right-hand data points at x=0.82
with long labels, which mermaid centres on the point, pushing them flush against
the plot border — pulled to x=0.75 and shortened, after which nothing is
clipped. Measure that with `getBoundingClientRect()` per `<text>` against the
SVG's own rect; **`getBBox()` is useless for it**, because mermaid centres text
with a transform, so every box comes back symmetric around zero and nothing
ever looks clipped. **Both link directions** were verified — the concept page
lists all five with no `broken reference`, and
`/docs/design/microservices-boundaries` renders "The model behind this answer:
Why microservices are an organisational answer" at exactly `#q61`, `#q62`,
`#q73` and `#q74`, with `/docs/design/architecture-styles` doing the same at
`#q55` and nowhere else. It's in the sidebar between `conways-law` and
`expression-problem`.

**`consistency-models`: drafted and converted 2026-09-12**, the eighteenth
Core page taken to `content/docs/concepts/`, immediately after
`query-planning`. Written fresh rather than converted from a waiting draft, so
— like `class-loading` — currency was checked at authoring time against
primary sources rather than corrected afterwards. The subject is unusually
exposed to staleness: its theory is timeless (CAP, PACELC, the session
guarantees, linearizability) but every system-specific claim in §7 is a moving
target, and two of them have changed recently enough that most writing about
them is now wrong.

- **DynamoDB global tables are no longer eventual-only.** "Global tables mean
  last-writer-wins eventual replication" was true and is now a half-truth:
  since **30 June 2025** a global table declares a consistency mode at
  creation — MREC (the default, multi-active, last-writer-wins, publishing
  `ReplicationLatency`) or **MRSC**, which replicates synchronously to at
  least one other Region before returning. The page states MRSC's price as a
  list, all of it from the AWS documentation rather than paraphrase: exactly
  three Regions, either three full replicas or two plus a *witness* holding
  only replicated change data; no TTL; no `TransactWriteItems` or
  `TransactGetItems`; no `ReplicationLatency` metric; same-account only; and
  the mode is immutable after creation. **That last list is load-bearing, not
  trivia** — the strong-consistency mode giving up the multi-item transaction
  API is §8's cleanest evidence that strong-on-one-key and atomic-across-keys
  are different properties.
- **PostgreSQL has no built-in replay wait yet, and the obvious search result
  is wrong about it.** `pg_wal_replay_wait()` is widely written about as a
  PostgreSQL 18 feature; it was reverted, and **it is not in 18 as released** —
  checked against 18's own `functions-admin` page, which lists
  `pg_last_wal_replay_lsn()` and no wait function. The replacement is a
  top-level SQL command, `WAIT FOR LSN ... WITH (MODE 'standby_replay', ...)`,
  shipping in **PostgreSQL 19 — in beta as of September 2026, not released**,
  and the page states it that way with its three real restrictions (top-level
  only, no snapshot held, `READ COMMITTED` or below) rather than as available.
  Lab 4 is written against 18's poll loop for that reason, with `WAIT FOR` as
  the optional variant.
- **Cassandra.** 5.0 is the current stable line (5.0.9, August 2026). **6.0 is
  in alpha**, carrying **Accord** — leaderless, strictly serializable,
  multi-partition, one WAN round trip in the common case, shipped off by
  default. Stated as alpha, the same "state the current status rather than
  guess at a moving target" discipline `virtual-threads` used for JEP 525 and
  `query-planning` for `pg_plan_advice`.
- **MongoDB.** The implicit default write concern is `majority` (falling to
  `w: 1` when the voting-member arithmetic cannot support a majority), and
  causally consistent sessions give all four session guarantees **only** with
  `majority`/`majority` — checked, because the failure mode is silent: weaker
  concerns do not error, they just give you less than you configured.
- **Jepsen's consistency map** at `jepsen.io/consistency` is still live and is
  the source for §3's lattice and its sticky-availability annotations.

`prerequisites: [the-log, isolation-levels]` resolves to one built
foundational page and one built Core page — the graph's twenty-seventh and
twenty-eighth resolving edges, and both are handoffs the prerequisite pages
explicitly set up: `isolation-levels` §6 defers "read replicas ... no
isolation level fixes read-your-own-writes across replication lag", and
`the-log` §7 defers consensus. This page picks up both. **Six `questions:`
anchors**, one more than the recent Core pages and matching `the-log`,
`bounded-contexts` and `broker-semantics`: `data/transactions-mvcc#q40`,
`data/scaling-operations#q46`, `java/distributed-systems#q124`, `#q128`,
`data/cross-cutting#q138`, `design/microservices-data#q89`. All six were
checked against the built reference pages before writing, and **all six are
first claims** — no question in the library was previously claimed by any
concept page on replication lag, read replicas, XA, distributed locking,
cross-service ordering or cross-service query, which is why this conversion
moves the coverage count by a full six. `java/distributed-systems#q128` was
considered and rejected for `idempotency` when that page was written; it
belongs here, because the lease-is-not-a-lock argument is a consistency claim
and the fencing token is the same monotonic-position primitive as the LSN in
§5.

**Carries one diagram** — the consistency lattice from strict serializable
down to eventual, with the *edges* rather than the boxes carrying the
argument: thick above the sticky-availability boundary, dotted across it,
plain below. Checked against the reference bank first: none of the six
claimed anchors carries a diagram of its own, and nothing anywhere in the
corpus draws a consistency hierarchy, so this is a clean **Add a diagram only
if it shows something the reference bank doesn't already** case, not a
link-don't-copy judgement. 12 sections, ~3,300 words of prose measured the
same way as `query-planning` (3,427) and `class-loading` (3,019) — in that
range, not above it — and 8 self-check items with `where` pointers written at
conversion time. Item 1 points at two sections and item 8 at a section plus a
**Leading on this** bullet, the `jit`-item-7 pattern. Both `pnpm types:check`
and `pnpm build` pass; the diagram was verified in the browser at 375px
(`viewBox="0 0 586 830"`, ≈59% rendered scale, no horizontal overflow, no
"Syntax error" text), and **both link directions** were verified — the
concept page lists all six with no `broken reference`, and each of the four
reference pages renders "The model behind this answer: Consistency Models and
Choosing Per Operation" at exactly the claimed anchors. It's in the sidebar
between `the-log` and `cache-invalidation`.

**`expression-problem`: drafted and converted 2026-09-12**, the nineteenth
Core page taken to `content/docs/concepts/`, immediately after
`consistency-models`. Written fresh rather than converted from a waiting
draft, so — like `class-loading` and `consistency-models` — currency was
checked at authoring time against primary sources. The theory is timeless
(Wadler 1998; Torgersen 2004; Zenger and Odersky 2005) but the Java half moves
every six months, and three items were verified rather than recalled:

- **Primitive patterns are at their *fifth* preview, in a JDK that is not out
  yet.** JEP 455 (23), 488 (24), 507 (25), 530 (26, with changes), and **JEP
  532 in JDK 27, re-previewed without change** — and JDK 27 is in the
  **release candidate** phase as of 2026-09-12, with GA on **15 September
  2026**, three days away. The page states that status rather than calling it
  shipped, the same discipline `virtual-threads` used for JEP 525 and
  `query-planning` for `pg_plan_advice`. Five previews is itself the fact
  worth teaching: the feature is not settled.
- **The records cliff has an answer, and it is exploration, not a roadmap.**
  Non-record classes still cannot be destructured. Brian Goetz's **"Data-Oriented
  Programming for Java: Beyond Records"** design note (January 2026) proposes
  **carrier classes** — a class declaring a state description like a record
  without a record's restrictions, acquiring derived accessors and
  deconstruction patterns. There is **no JEP, no syntax and no timeline**, and
  the page says so explicitly. This is the single most datable claim on the
  page; anyone revisiting it should re-check whether a JEP now exists.
- **There is no lint for the escape hatch.** `javac` has no warning for a
  `default` case in a switch over a sealed type — verified by compiling one
  under `-Xlint:all` — and Error Prone ships `UnnecessaryDefaultInEnumSwitch`
  for enums with **no sealed-type equivalent**, checked against its bug-pattern
  list rather than assumed. **Leading on this** therefore recommends a review
  rule with a CI grep, not a tool. Naming a tool that does not do this job
  would have been the `Structure101` mistake `coupling-and-cohesion` records.

**Four load-bearing claims were verified by running them on JDK 25**, not
reasoned about, and all four became labs: `MatchException` from separate
compilation (compile a switch against a two-subtype sealed hierarchy, widen
`permits`, do not recompile the switch — Lab 3); `MatchException` from
`new R(null)` against nested patterns the compiler accepted as exhaustive
(§6); the `default`-case escape hatch compiling clean under `-Xlint:all` while
silently swallowing a new subtype, and erroring the moment it is removed
(Lab 2); and `javap` showing a `typeSwitch` `invokedynamic` call site **per
level of nesting** rather than a virtual call (Lab 4).

`prerequisites: []` is a deliberate root — the **tenth**, after the eight
foundational roots and `stream-pipelines`. Nothing in the built graph genuinely
precedes it: `coupling-and-cohesion` and `bounded-contexts` are adjacent
cross-references in §1 and §8, not dependencies, the same judgement
`stream-pipelines` made about `thread-pools`. **Six `questions:` anchors**,
matching `consistency-models`, and **all six are first claims**, which moves
the coverage count by a full six for the second conversion running:
`design/solid-principles#q16`, `design/design-patterns#q33`, `#q39`, `#q44`,
`java/modern-java#q87`, `#q88`. Two of them already name this page's subject in
their own text — Q16's follow-up ("that's the expression problem, and Java 21
now supports both sides") and Q88's ("that's the expression problem") — so the
recall layer was pointing at a page that did not exist until now.

**Carries one diagram** — the two designs side by side, each with its cheap
direction as a thick edge and its costly direction as a dotted chain ending in
the escape hatch, so the picture carries §4's duality rather than the grid from
§2 (which is a markdown table, because a table is what a grid is). Checked
against the reference bank first: `design/design-patterns`,
`design/solid-principles`, `java/modern-java` and `java/core-language` carry
**zero diagrams between them**, so nothing existed to link to — a clean **Add a
diagram only if it shows something the reference bank doesn't already** case,
not a link-don't-copy judgement. 12 sections, ~3,900 words measured the same
way as `query-planning` (3,666) and `consistency-models` (3,617) — marginally
the longest page in the library, because it argues a two-sided contrast *and*
carries a currency-heavy §5 and a four-part §6. 8 self-check items with `where`
pointers written at conversion time; items 1, 4, 6 and 8 point at two sections
each, and item 8 is the `jit`-item-7 pattern (mechanism in §7, remedy in
**Leading on this**). Both `pnpm types:check` and `pnpm build` pass; the diagram
was verified in the browser at 375px (`viewBox="0 0 602.6145629882812 984"`,
≈57% rendered scale, no horizontal overflow, no "Syntax error" text), and
**both link directions** were verified — the concept page lists all six with no
`broken reference`, and `design/design-patterns`, `design/solid-principles` and
`java/modern-java` render "The model behind this answer: The expression
problem: polymorphism vs pattern matching" at exactly the six claimed anchors
and nowhere else. It's in the sidebar between `coupling-and-cohesion` and
`partitioning`.

> **Measuring reverse links: use `textContent`, not `innerText`.** A reverse
> link lives inside a `<Question>`, which is collapsed by default, so
> `document.body.innerText` reports **zero** on a page that is rendering them
> correctly. This looked like six broken links before the measurement was
> fixed. Scope the scan to each `h2[id^=q]` up to the next one, and read
> `textContent` — anything looser matches a neighbouring question's block and
> reports the wrong claiming page.

**`virtual-threads`: converted 2026-09-12**, the fourth Core page taken to
`content/docs/concepts/` and the first conversion session to also refresh
stale content rather than convert as-is. Its "Where to go deeper" cited JEP
453 for structured concurrency and JEP 446 for scoped values — both first
previews at draft time. By 2026-09-12, scoped values had finalized as **JEP
506 in Java 25**, and structured concurrency had moved to its **sixth**
preview, **JEP 525** (JDK 26), with the API reshaped around
`StructuredTaskScope.open(Joiner)` in place of the `ShutdownOnFailure`/
`ShutdownOnSuccess` subclasses the JDK 21 example still shows. Updated the
JEP references in §4, §5, Lab 5 and "Where to go deeper" to state the current
status and flag the exact syntax as unverified rather than guessing at the
reshaped API — the pinning timeline in §3 (JEP 491, Java 24) needed no
correction, it was already accurate. `prerequisites: [thread-pools,
jvm-memory]` resolves to two built foundational pages — no conversion-order
issue. **Carries one diagram**, added at conversion time rather than present
in the draft: structured concurrency's cancellation propagation (one subtask
fails, its sibling is cancelled, the scope throws), which no reference answer
draws — `java/concurrency#q63` (structured concurrency) has no diagram of its
own. The pre-existing mount/unmount/pinning mechanism in §2–3 links to
`java/concurrency#q62`'s diagram instead of redrawing it, per **A concept page
links to a reference diagram, it does not copy it**. Verified phone-readable
at 375px (`viewBox="0 0 594.640625 478"`, ≈58% rendered scale, no overflow, no
"Syntax error" text). Both `pnpm types:check` and `pnpm build` pass, and it's
in the sidebar next to `thread-pools`. `java/concurrency#q62`'s reverse link
now lists two claiming pages (`thread-pools`, `virtual-threads`) — the second
verified case of a question claimed by two concept pages, after
`java/jvm-memory-gc#q80` and `java/streams#q47`.

**`cas-and-contention`: converted 2026-09-12**, the fifth Core page taken to
`content/docs/concepts/`, immediately after `virtual-threads`. The draft
needed no currency fix — unlike `virtual-threads`'s JEP references, nothing
in it (CAS, MESI, `LongAdder`/`Striped64`, `@Contended`,
`AtomicStampedReference`, `perf c2c`) is version-pinned, so it converted as
written. `prerequisites: [jmm]` resolves to a built page. All five
`questions:` anchors (`java/concurrency#q51`, `#q49`, `#q50`, `#q59`,
`#q67`) were checked against `content/docs/java/concurrency.mdx` before
writing — none of Q49–51/59/67 carries a diagram there, and none is on the
reference-bank target-19 list, so a diagram was permitted by **Add a diagram
only if it shows something the reference bank doesn't already**. **Carries no
diagram**: the mechanism (cache-line ping-pong, MESI states, the cost table)
is already fully carried by prose and the two tables in §2–3, matching this
page's own draft audit above (**"none carries a diagram"**) rather than
`virtual-threads`'s exception. `java/concurrency#q49` is now claimed by both
`jmm` and `cas-and-contention` — the third verified case of a question
claimed by two concept pages, after `java/jvm-memory-gc#q80` /
`java/streams#q47` and `java/concurrency#q62`. 8 self-check items, with
`where` pointers written at conversion time, same discipline as the other
converted Core pages. Both `pnpm types:check` and `pnpm build` pass, and it's
in the sidebar between `jmm` and `thread-pools`. **This conversion also
resolved the `cas`/`deadlock` slug collision** — see the closed note under
**Two more slug collisions** below.

**`isolation-levels`: converted 2026-09-12**, the sixth Core page taken to
`content/docs/concepts/`, immediately after `cas-and-contention`. One
currency fix, unlike `cas-and-contention`'s clean conversion: the Lab 7
`docker run` pinned `postgres:17`, the same stale pin flagged (and
deliberately left) under **Two currency items carried into these drafts**
below — updated to `postgres:18` to match the other four Postgres labs in the
corpus, in both `_source/isolation-levels.mdx` and the converted page, so they
no longer diverge on that line. Nothing else in the draft is version-pinned —
the isolation-level defaults, the SQLSTATE codes, the SSI mechanism — so
no other correction was needed. `prerequisites: [mvcc]` resolves to a built
foundational page, satisfying the conversion-order note under **The second
six drafts** below for this page specifically; `aggregates` and
`locking-and-deadlock` still only resolve to `isolation-levels` as a
converted page as of now, not yet converted themselves. All five
`questions:` anchors (`data/transactions-mvcc#q31`, `#q32`, `#q35`, `#q36`,
`java/spring#q103`) were checked against the built reference pages before
writing. **Carries no diagram of its own** — the write-skew interleaving
(doctors on call) it uses as its canonical example is already drawn as a
`sequenceDiagram` on `data/transactions-mvcc#q32`, so per **A concept page
links to a reference diagram, it does not copy it** the page adds one
sentence linking to it in §2 rather than redrawing it, the same judgement
call `jmm` made for `java/concurrency#q48`. 8 self-check items, with `where`
pointers written at conversion time, same discipline as the other converted
Core pages. Both `pnpm types:check` and `pnpm build` pass, and it's in the
sidebar between `mvcc` and `the-log`.

**`cache-invalidation`: converted 2026-09-12**, the seventh Core page taken
to `content/docs/concepts/`, and the second Core page (after
`isolation-levels`) to need a currency fix at conversion. Same stale pin as
`isolation-levels` had: Lab 8's `docker run` pinned `postgres:17`, the one
half of **Two currency items carried into these drafts** below that was
still open — updated to `postgres:18` in both `_source/cache-invalidation.mdx`
and the converted page, closing that item; `redis:7` needed no change, since
`partitioning.mdx` pins the same tag and the corpus has not moved off it.
`prerequisites: [the-log]` resolves to a built foundational page, no
conversion-order issue. All five `questions:` anchors
(`data/redis-caching#q70`, `#q71`, `#q72`, `#q73`, `#q81`), the prose
cross-reference to `data/scaling-operations#q58` in §9, and the link to
`cas-and-contention` in §7 were all checked against the built reference and
concept pages before writing.
**Carries no diagram** — `data/redis-caching.mdx` has zero diagrams of its
own, so nothing to link to, but the four-ordering race in §3 is already
fully carried by the four ASCII interleavings and needs no separate picture,
the same judgement `cas-and-contention` made for its cache-line tables. 8
self-check items, with `where` pointers written at conversion time, same
discipline as the other converted Core pages. Both `pnpm types:check` and
`pnpm build` pass, and it's in the sidebar between `the-log` and
`broker-semantics`.

**`spring-proxy`: converted 2026-09-12**, the eighth Core page taken to
`content/docs/concepts/`, immediately after `cache-invalidation`, and the
first conversion pass whose only content change is a diagram-avoidance
sentence rather than a currency fix — checked for staleness anyway (the
mechanism is version-agnostic: bean post-processing, JDK-vs-CGLIB proxying,
self-invocation, `TransactionTemplate`, AspectJ weaving, and Spring AOT
computing proxies at build time for GraalVM native images), and confirmed
current against the Spring Framework 7 reference docs and Spring Boot 4 AOT
documentation — CGLIB-by-default (`proxyTargetClass=true`), the
`postProcessAfterInitialization` proxy-creation step, and build-time proxy
generation under native-image are all unchanged. `prerequisites:
[dependency-inversion]` resolves to a built foundational page, no
conversion-order issue. All five `questions:` anchors (`java/spring#q99`,
`#q100`, `#q101`, `#q102`, `#q110`) were checked against
`content/docs/java/spring.mdx` before writing. **Carries no diagram of its
own** — `java/spring#q101` already draws the exact caller→proxy→target
boundary and self-invocation bypass this page's §2 explains, so per **A
concept page links to a reference diagram, it does not copy it** the draft's
plain-text ASCII box stays as scaffolding and a linking sentence was added
pointing at Q101's diagram instead of drawing a new one — the fourth
Core-tier "link, don't copy" case after `isolation-levels`, and it adds
nothing to the diagram count. 8 self-check items, with `where` pointers
written at conversion time, same discipline as the other converted Core
pages. Both `pnpm types:check` and `pnpm build` pass, and the reverse link
on `java/spring#q101` was verified in the browser ("The model behind this
answer: The Proxy Boundary in Spring"). It's in the sidebar after
`dependency-inversion`.

**`persistence-context`: converted 2026-09-12**, the ninth Core page taken
to `content/docs/concepts/`, immediately after `spring-proxy`, and the sixth
and last of the original first batch — closing it out. Checked for staleness
before converting: dirty checking, flush ordering, the four entity states,
`persist`/`merge`/`save`, N+1 fixes and the hashCode trap are all
version-agnostic JPA/Hibernate mechanics, and the one claim worth
re-verifying — that `spring.jpa.open-in-view` still defaults to `true` in
Spring Boot — was confirmed current (there's an open GitHub issue proposing
to flip the default in a future Boot 4.x release, but it has not shipped, so
the draft's "Boot's default — turn it off" stands unchanged). No currency
fix was needed. `prerequisites: [spring-proxy, mvcc]` resolves to two built
Core/foundational pages, fulfilling the edge `spring-proxy` promised at
draft time (**"Six core drafts are waiting" → `persistence-context →
spring-proxy` and `→ mvcc`**) — no conversion-order issue, since both were
already converted. All five `questions:` anchors (`java/persistence#q111`,
`#q112`, `#q113`, `#q116`, `#q120`) were checked against
`content/docs/java/persistence.mdx` before writing, along with the prose
cross-references to `#q119` in §6 and `#q120`/`#q112`/`#q113`/`#q116` inline.
**Carries one diagram** — an entity-lifecycle flowchart (transient → managed
→ detached/removed → gone, with `merge()` returning to managed) — added at
conversion time rather than present in the draft. Unlike every other
Core-tier conversion so far, this is not a link-don't-copy judgement:
`content/docs/java/persistence.mdx` has no diagrams of any kind, so nothing
existed to link to, and the page's own §8 ("Teach the four states on a
whiteboard... it takes ten minutes") names the exact picture this adds. 8
self-check items, with `where` pointers written at conversion time, same
discipline as the other converted Core pages. Both `pnpm types:check` and
`pnpm build` pass; the diagram was verified in the browser at 375px
(`viewBox="0 0 683.41015625 550"`, ≈50% rendered scale, no horizontal
overflow, no "Syntax error" text), and the reverse link was checked on all
four reference anchors with a diagram of their own excluded (there are none)
— `#q111`, `#q112`, `#q113` and `#q116` each show "The model behind this
answer: The Persistence Context and Dirty Checking". It's in the sidebar
after `spring-proxy`.

Titles below are the drafts' own where a draft exists, and the placeholder
otherwise; as with the foundational tier, **where a draft and this table
disagreed, the draft won**, which is why the slug collision below existed
until `cas-and-contention` converted. See **Two more slug collisions**
underneath the table for the closed record.

| `concept:` | Page | Draft |
|---|---|---|
| `virtual-threads` | Virtual Threads — Continuations, Mounting, and Pinning | drafted, converted |
| `cas-and-contention` | CAS, Contention, and Lock-Free Structures | drafted, converted |
| `isolation-levels` | Isolation Levels and the Anomalies They Permit | drafted, converted |
| `cache-invalidation` | Cache Invalidation and the Races in Each Ordering | drafted, converted |
| `spring-proxy` | The Proxy Boundary in Spring | drafted, converted |
| `persistence-context` | The Persistence Context and Dirty Checking | drafted, converted |
| `aggregates` | Aggregates as Consistency Boundaries | drafted, converted |
| `backpressure` | Backpressure and the Unbounded Queue | drafted, converted |
| `coupling-and-cohesion` | Coupling, Cohesion, and What Makes a Change Expensive | drafted, converted |
| `escape-analysis` | Escape Analysis and When Allocation Disappears | drafted, converted |
| `locking-and-deadlock` | Locking and Deadlock | drafted, converted |
| `partitioning` | Partitioning — One Idea in Five Systems | drafted, converted |
| `broker-semantics` | Broker semantics — acknowledgement, redelivery, and where queues beat logs | drafted, converted |
| `kafka-internals` | Partitions, Consumer Groups, ISR and the High Watermark | drafted, converted |
| `stream-pipelines` | Stream Pipelines: Laziness, Fusion, and Parallel Decomposition | drafted, converted |
| `class-loading` | Class Loading and Classloader Leaks | drafted, converted |
| `query-planning` | Query Planning and Cardinality Estimation | drafted, converted |
| `consistency-models` | Consistency Models and Choosing Per Operation | drafted, converted |
| `expression-problem` | The expression problem: polymorphism vs pattern matching | drafted, converted |
| `conways-law` | Conway's law and the inverse manoeuvre | drafted, converted |
| `microservices-org` | Why microservices are an organisational answer | drafted, converted |

### Two more slug collisions

Same shape as the `cas` collision, found the same way — this table fixed a
slug before the draft existed, and the draft's author picked a different one:

- **`coupling-cohesion` → `coupling-and-cohesion`.** No page's `unlocks`
  reference the old spelling yet, so nothing dangles — this is a table-only
  fix, already applied above.
- **`deadlock` → `locking-and-deadlock`.** Was the same problem as `cas`
  below; closed the same way, the same day. See the closed note immediately
  below.

**Closed 2026-09-12, at `cas-and-contention`'s conversion.** Before this,
`content/docs/concepts/jmm.mdx` declared `unlocks: [cas, deadlock,
virtual-threads]` — written before either draft existed, so neither slug
would ever have resolved once the real pages landed as `cas-and-contention`
and `locking-and-deadlock`. The user's call (asked directly, not picked
silently): **edit `jmm`'s `unlocks`** to `[cas-and-contention,
locking-and-deadlock, virtual-threads]`, rather than rename the drafts. This
diverges `content/docs/concepts/jmm.mdx` from
`_source/java-memory-model-concept-page.md` by that one frontmatter line —
`_source` still reads `unlocks: [cas, deadlock, virtual-threads]`, left
alone, the same deliberate divergence pattern as the `hashmap` line repair
below. `jmm → cas-and-contention` is now a real, resolving edge; `jmm →
locking-and-deadlock` still dangles by design until that page converts, same
as any other `unlocks` target that's drafted but not yet built.

**A third collision, `classloader-leaks` → `class-loading`, closed
2026-09-12 at that page's conversion.** Different origin from the two above:
the Specialist list fixed `classloader-leaks` because
`content/docs/concepts/jvm-memory.mdx` promised it, while the Core table
independently fixed `class-loading` for the same page — two slugs for one
page, from two places in *this* file rather than from a draft disagreeing
with the table. Resolved the same way the user chose for `jmm`: **edit the
built page's `unlocks`**, so `jvm-memory` now reads `[generational-gc,
gc-tuning, memory-leaks, off-heap-memory, class-loading]` and that edge
resolves instead of dangling. `_source/jvm-memory.mdx` still reads
`classloader-leaks`, left alone — the same deliberate one-line divergence as
`jmm`'s. Applied without asking, unlike the `jmm` case, because the
precedent above had already settled the question; reverse it by renaming the
page if that reading was wrong.

**A fourth collision, `team-topologies` → `conways-law`, closed 2026-09-12
at that page's conversion.** Same origin as the third: the Specialist list
fixed `team-topologies` because `content/docs/concepts/bounded-contexts.mdx`
promised it, while the Core table independently fixed `conways-law` — and
once `conways-law` was written, a separate `team-topologies` page had
nothing left to say. The four team types, the three interaction modes and
cognitive load are §6 of `conways-law`, because they are the *toolkit for
the inverse manoeuvre* and are unteachable apart from it. Resolved the way
the third was: **edit the built page's `unlocks`**, so `bounded-contexts`
now reads `[service-decomposition, anti-corruption-layer, modular-monolith,
event-design, conways-law]`. That edge now resolves — and it mirrors
`conways-law`'s own `prerequisites: [bounded-contexts, ...]`, which the
library does not require but which is a good sign when it happens.
`_source/bounded-contexts.mdx` still reads `team-topologies`, left alone —
the same deliberate one-line divergence as `jmm`'s and `jvm-memory`'s.
Applied without asking, on the same settled precedent; reverse it by
splitting §6 into its own page if that reading was wrong.

**Audit of the first six drafts** (2026-09-11, measured, the same pass the
foundational drafts got before conversion): no stray H1s, **zero MDX
hazards**, every internal link carrying its `/docs` prefix and resolving, all
30 `questions:` anchors valid, and **no dangling `prerequisites`** —
`the-log`, `jmm`, `mvcc`, `dependency-inversion`, `thread-pools`,
`jvm-memory` are all written, and `persistence-context` depends on
`spring-proxy`, which is in the same batch. Each is 9–11 sections, 2,000–2,700
words, 8 self-check items, and **none carries a diagram**. Every `unlocks`
target is a specialist page that does not exist, which is normal.

Two currency items carried into these drafts, both the same as the ones fixed
across the corpus on 2026-09-11 — flagged, deliberately **not** edited, because
they are the user's fresh prose:

- `virtual-threads.mdx` — **fixed on 2026-09-12, at conversion.** "Where to go
  deeper" cited JEP 453 for structured concurrency and JEP 446 for scoped
  values, both first previews at draft time. Corrected to state scoped values
  finalised as JEP 506 in JDK 25, and structured concurrency is at JEP 525
  (sixth preview, JDK 26) with a reshaped API — see the Core table entry above
  for the full record. Unlike the `hashmap` line repair, this was a currency
  fix requested directly rather than found and left for the user, so it is not
  a byte-identity exception in the same sense: draft and page match, both
  post-fix.
- `cache-invalidation.mdx` and `isolation-levels.mdx` pinned `postgres:17` in
  their labs; the other four Postgres labs had already moved to `postgres:18`.
  **Both are now fixed, both at conversion** — `isolation-levels.mdx` on
  2026-09-12, `cache-invalidation.mdx` immediately after — bringing both in
  line with the other four. No currency item from this list remains open.

**Audit of the second six drafts** (`aggregates`, `backpressure`,
`coupling-and-cohesion`, `escape-analysis`, `locking-and-deadlock`,
`partitioning`; 2026-09-11, same method): no stray H1s, zero MDX hazards,
every internal link carrying its `/docs` prefix, and all `questions:` anchors
valid across the six. 10–12 sections, 2,200–2,600 words, 8 self-check items
each, none carries a diagram — one section longer on average than the first
batch, still inside the 9–11-section pattern's tolerance.

**`prerequisites` resolution was mixed at draft time, unlike the first batch.**
Three resolved to *built* pages from the start: `backpressure` →
`thread-pools`, `coupling-and-cohesion` → `dependency-inversion`,
`escape-analysis` → `jit` + `generational-gc`. Three resolved only to
*drafted, unconverted* pages from the first batch: `aggregates` →
`isolation-levels` (and → `bounded-contexts`, built), `locking-and-deadlock` →
`isolation-levels`, `partitioning` → `cas-and-contention` (and → `hashmap`,
built). This was the `persistence-context` → `spring-proxy` situation from the
first batch, generalised: not a dangling edge by the library's definition
(`prerequisites` names a written page, and a draft in `_source/` is written
prose, just not yet converted), but it did fix a **conversion order**: convert
`isolation-levels` before `aggregates` or `locking-and-deadlock`, and
`cas-and-contention` before `partitioning` — same rule as `spring-proxy`
before `persistence-context`.

**Both resolved on 2026-09-12** — `isolation-levels` and `cas-and-contention`
converted the same day (see the Core table entries above) — so as of now
`aggregates`, `locking-and-deadlock` and `partitioning` each resolve to at
least one *built* foundational-or-Core page rather than only a draft. The
ordering constraint is satisfied; nothing further blocks converting any of
the three.

**`broker-semantics`: drafted and converted the same day** (2026-09-11), the
only Core page taken all the way to `content/docs/concepts/` so far.
`prerequisites: [the-log]` resolves to a built page, so no conversion-order
issue like the ones above. `unlocks: [retries-and-backoff, outbox-pattern]`
reuses two existing Specialist slugs (both already promised by `idempotency`)
rather than inventing new ones — multiple promises to one unwritten page is
normal. All six `questions:` anchors (`data/rabbitmq#q86`, `#q88`, `#q89`,
`#q91`, `#q93`, `#q98`) were checked against `content/docs/data/rabbitmq.mdx`
before writing, not trusted. 9 sections, ~3,000 words — longer than either
batch above, because it argues a contrast with a page (`the-log`) rather than
explaining a self-contained mechanism. 7 self-check items, **with `where`
pointers written at conversion time** rather than deferred, since the page was
being read closely for conversion anyway. **Carries one diagram** — the
fork between a queue's destructive read and a stream's cursor read — the
first Core-tier page to have one; verified in the browser at 375px (viewBox
586×944, rendered ≈58% scale, no horizontal overflow, no "Syntax error"
text), following the same throwaway-render-then-check discipline as the
foundational diagrams. Both `pnpm types:check` and `pnpm build` pass with the
page in the sidebar. The self-check in `_source/broker-semantics.mdx` is a
plain numbered list, matching every other draft in this table — the `where`
pointers and `<SelfCheck>` JSX exist only in the converted page, per **The
Question component** below.

**`kafka-internals`: drafted and converted the same day** (2026-09-11),
immediately after `broker-semantics`. `prerequisites: [the-log]` resolves
to a built page — the-log explicitly lists `kafka-internals` as one of its
own `unlocks` targets, and this is that edge fulfilled. `unlocks:
[multi-region-replication, schema-evolution]` are two brand-new Specialist
slugs, neither previously promised by any other page, recorded in the
Specialist list below. All five `questions:` anchors
(`data/kafka#q108`, `#q110`, `#q114`, `#q116`, `#q131`) were checked
against `content/docs/data/kafka.mdx` before writing, and chosen
specifically to avoid `#q106`/`#q113` (already claimed by `the-log`),
`#q109` (already claimed by `idempotency`), and `#q112` (already claimed by
`partitioning`) — overlap is allowed by the library's rules but wasn't
needed here, since 27 of the bank's 30 questions were still unclaimed
going in. 10 sections, ~3,100 words — in the same longer range as
`broker-semantics`, again because the page argues from a contrast (with
`the-log`'s single-log model) rather than explaining one self-contained
mechanism. 7 self-check items, with `where` pointers written at conversion
time, same discipline as `broker-semantics`. **Carries two diagrams** — an
ISR/high-watermark failure trace, and an eager-vs-cooperative rebalance
comparison — neither duplicating the reference bank's existing Q110
(partition-to-consumer-group assignment) or Q116 (ISR/high-watermark
steady state) pictures; both verified in the browser at 375px (viewBox
505×1110 rendered ≈68%, and 586×820 rendered ≈58%, no horizontal overflow,
no "Syntax error" text). Both `pnpm types:check` and `pnpm build` pass with
the page in the sidebar. The self-check in `_source/kafka-internals.mdx` is
a plain numbered list, matching the rest of this table.

**Specialist** — none written or planned. (`kafka-internals` was here until
2026-09-11 and is now Core — see the coverage audit below.) They are listed so the names are
fixed and a later page cannot invent a second spelling; titles get decided when
someone writes the page.

**This list is now the only place the Specialist roadmap lives** (2026-09-12).
It used to be mirrored in page frontmatter, because `unlocks` doubled as a
roadmap; that was reversed, and all 84 such entries were stripped — see
**The dependency graph — settled conventions**. So the groupings below now read
*"the page that would have promised it"*, not *"the page whose `unlocks`
contains it"*. **Do not put any of these slugs back into an `unlocks`.** Adding
a new Specialist name means adding a bullet here and nothing else.

**Twelve of them were only ever in frontmatter and are recorded here for the
first time**, having been invented by a draft and never registered — exactly the
second-spelling hazard this list exists to prevent, and invisible until the
study path rendered all of them at once:

- **`cas-and-contention`** would unlock `false-sharing`, `atomics`, `non-blocking-algorithms`
- **`spring-proxy`** would unlock `transaction-management`, `aop`, `spring-testing`, `caching-annotations`
- **`backpressure`** would unlock `load-shedding`, `circuit-breakers`
- **`coupling-and-cohesion`** would unlock `package-design`, `refactoring-strategy`, `architecture-fitness-functions`

**Five near-duplicate spellings were dropped rather than registered**, because
each already had a name here: `service-extraction` (use `service-decomposition`),
`optimistic-concurrency` (use `optimistic-locking`), `caching-strategy` (use
`caching`), `reactive-comparison` (use `reactive-streams`), and
`microservices-boundaries`, which was never a concept slug at all — it is the
name of the *reference page* `design/microservices-boundaries`, and the material
is covered by `conways-law` and `microservices-org`. A sixth pair,
`retries-and-backoff` against `retry-design`, is left as two names because both
were properly registered and they are arguably different pages; decide when one
is written.

Grouped by the page that would promise them:

- **`generics-erasure`** unlocks `collections-api-design`, `variance`, `reflection`, `serialisation-frameworks`
- **`hashmap`** unlocks `concurrent-collections`, `equals-hashcode`, `collection-sizing`, `caching`
- **`jvm-memory`** unlocks `gc-tuning`, `memory-leaks`, `off-heap-memory`, `class-loading`
  (**was `classloader-leaks`** — a third slug collision, closed 2026-09-12; see
  **Two more slug collisions**)
- **`generational-gc`** unlocks `gc-tuning`, `latency-troubleshooting`, `memory-leaks`
- **`jit`** unlocks `latency-troubleshooting`, `benchmarking`, `startup-optimisation`
- **`btrees-selectivity`** unlocks `composite-indexes`, `covering-indexes`
- **`mvcc`** unlocks `vacuum-and-bloat`, `long-transactions`, `replication-lag`, `write-skew`
- **`the-log`** unlocks `replication`, `cdc-and-outbox`, `event-sourcing`, `kafka-internals` (**now Core**), `crash-recovery`
- **`idempotency`** unlocks `retries-and-backoff`, `outbox-pattern`, `saga-pattern`, `exactly-once`, `reconciliation`
- **`bounded-contexts`** unlocks `service-decomposition`, `anti-corruption-layer`, `modular-monolith`, `event-design`, `conways-law`
  (**was `team-topologies`** — a fourth slug collision, closed 2026-09-12; see
  **Two more slug collisions**)
- **`dependency-inversion`** unlocks `anti-corruption-layer`, `modular-monolith`, `hexagonal-architecture`, `testing-strategy`
- **`thread-pools`** unlocks `bulkheads`, `capacity-planning`, `cascading-failure`
- **`kafka-internals`** (drafted 2026-09-11, Core tier) unlocks `multi-region-replication`,
  `schema-evolution` — both new slugs, fixed here before either page exists. Neither was
  previously promised by any other page, so no collision to resolve.
- **`stream-pipelines`** (drafted 2026-09-11, Core tier) unlocks `custom-collectors`,
  `reactive-streams`, `spliterator-design` — three new slugs, fixed here before any of
  them exist. `reactive-streams` covers the push-based Flow API/RxJava contrast the
  draft's §2 raises and declines to develop; `custom-collectors` covers the
  `Collector.Characteristics.CONCURRENT` design space the draft's §4 flags as a
  contract, not a runtime check; `spliterator-design` covers writing a `trySplit()`
  that actually balances, for a source that isn't already `ArrayList` or an array.
  None was previously promised by any other page.
- **`persistence-context`** (drafted and converted 2026-09-12, Core tier)
  unlocks `n-plus-one`, `jpa-performance`, `optimistic-locking`, `cqrs` —
  four new slugs, fixed here before any of them exist. `n-plus-one` covers
  the fixes ranked in §4 in more depth than a Core page's own tolerance for
  length allows; `jpa-performance` covers batching, statement caching and
  connection-pool interaction beyond what §3 and Lab 6 establish;
  `optimistic-locking` is the `@Version`/retry mechanism `java/persistence#q114`
  already answers at recall depth, given a concept page of its own;
  `cqrs` covers separating the read and write model properly, which §4
  names as "the on-ramp to" but explicitly declines to develop. None was
  previously promised by any other page.
- **`locking-and-deadlock`** (drafted and converted 2026-09-12, Core tier)
  unlocks `distributed-locks`, `saga-pattern`, `connection-pooling`,
  `retry-design`. `distributed-locks` covers the harder problem §7 explicitly
  scopes out — no shared lock manager across services, so cycle detection
  doesn't exist the way it does within one JVM or one database;
  `connection-pooling` covers the pool-exhaustion failure mode adjacent to
  §6's "keep transactions short" rule but not developed there;
  `retry-design` covers backoff/jitter strategy beyond the one worked example
  in Lab 5. `saga-pattern` is not new — it reuses the slug `idempotency`
  already promises, the same "multiple promises to one unwritten page is
  normal" pattern `broker-semantics` used for `retries-and-backoff` and
  `outbox-pattern`.
- **`partitioning`** (drafted and converted 2026-09-12, Core tier) unlocks
  `sharding`, `kafka-internals`, `hot-keys`, `consistent-hashing`,
  `scaling-strategy`. Three are new slugs, fixed here before any of them
  exist: `sharding` covers choosing and operating a shard key in depth
  beyond §3's "choose the key so things needing consistency land together"
  rule; `consistent-hashing` covers the Karger et al. algorithm itself —
  virtual nodes, ring placement — where §5 only cites it as the named
  alternative to virtual buckets without developing the mechanism;
  `scaling-strategy` covers deciding *when* to shard or add partitions at
  all, one level up from this page's "given you're partitioned, here's what
  it costs" scope. The other two are not new: `kafka-internals` is already
  promised by `the-log` (now itself Core and converted, so this is an edge
  onto a *built* page rather than a dangling promise) and `hot-keys` is
  already promised by `cache-invalidation`. Multiple promises to one
  unwritten page is normal, the same pattern `locking-and-deadlock`'s
  `saga-pattern` reuses from `idempotency`.
- **`class-loading`** (drafted and converted 2026-09-12, Core tier) unlocks
  `java-agents`, `plugin-architecture`, `startup-optimisation`. Two are new
  slugs, fixed here before either page exists: `java-agents` covers
  instrumentation properly — JVMTI, `ClassFileLoadHook`, premain vs dynamic
  attach, and the agent/AOT-cache conflict §8 only names; `plugin-architecture`
  covers *designing* a loader-isolated plugin host, one level up from this
  page's "here is what a loader is and what it costs". `startup-optimisation`
  is not new — it reuses the slug `jit` already promises, which is the right
  target for the Leyden material §8 raises and declines to develop, the same
  "multiple promises to one unwritten page is normal" pattern as
  `locking-and-deadlock`'s `saga-pattern`. Note that this page **absorbed**
  the Specialist slug `classloader-leaks` that `jvm-memory` used to promise —
  see **Two more slug collisions**.

- **`query-planning`** (converted 2026-09-12, Core tier) unlocks
  `statistics-tuning`, `plan-stability`, `composite-indexes`. Two are new slugs,
  fixed here before either page exists: `statistics-tuning` covers
  `default_statistics_target`, extended-statistics design and autovacuum's
  analyze thresholds as a subject in their own right, one level past §10's "own
  statistics as a platform concern"; `plan-stability` covers pinning and
  regression-testing a plan — the natural home for PG 19's `pg_plan_advice`
  once it ships, which §10 introduces and deliberately does not develop.
  `composite-indexes` is not new — it reuses the slug `btrees-selectivity`, this
  page's own prerequisite, already promises, the same "multiple promises to one
  unwritten page is normal" pattern as `locking-and-deadlock`'s `saga-pattern`.

- **`expression-problem`** (drafted and converted 2026-09-12, Core tier)
  unlocks `data-oriented-programming`, `api-evolution`, `schema-evolution`. Two
  are new slugs, fixed here before either page exists:
  `data-oriented-programming` covers the style built on sealed interfaces,
  records and pattern matching as a whole — Goetz's 2022 paper and the "Beyond
  Records" direction — which §5 and §6 only touch at the language-feature
  level; `api-evolution` covers adding to a published interface without
  breaking implementors, the subject §4's `default`-method escape hatch and
  §7's third heuristic both point at without developing, and the natural home
  for `MatchException`-under-version-skew as an operational concern rather than
  a lab. `schema-evolution` is not new — it reuses the slug `kafka-internals`
  already promises, which is the right target for §8's "serialisation and
  schemas want the type axis closed", the same "multiple promises to one
  unwritten page is normal" pattern as `locking-and-deadlock`'s `saga-pattern`.

- **`consistency-models`** (drafted and converted 2026-09-12, Core tier)
  unlocks `replication-lag`, `multi-region-replication`, `consensus-algorithms`.
  Only one is new: `consensus-algorithms` covers Raft and Paxos as mechanisms —
  the thing `the-log` §7 defers ("agreeing on the log's contents across nodes is
  Raft/Paxos, which is a different problem") and this page names repeatedly
  without developing, in §8's "consensus is not free availability" and in
  Cassandra's LWT and Accord. The other two are not new: `replication-lag` is
  already promised by `mvcc` and `multi-region-replication` by `kafka-internals`
  — multiple promises to one unwritten page is normal, the same pattern as
  `locking-and-deadlock`'s `saga-pattern`. Both are the right targets here:
  this page measures lag and routes around it but does not cover diagnosing or
  operating it, and §7's MRSC and Accord material is a sketch of a multi-region
  page rather than the page itself.

- **`conways-law`** (drafted and converted 2026-09-12, Core tier) unlocks
  `microservices-org`, `platform-engineering`, `service-decomposition`. Only
  one is a new Specialist slug: `platform-engineering` covers designing,
  funding and operating an internal developer platform as a product — the
  subject §6 opens with the "optional and attractive" constraint and the DORA
  J-curve and then declines to develop. `microservices-org` is **not**
  Specialist: it is a Core slug, and **that edge now resolves** — the page was
  drafted and converted 2026-09-12 and took exactly the Q61, Q62 and Q73 that
  `conways-law` left unclaimed for it.
  `service-decomposition` is not new — it reuses the slug `bounded-contexts`,
  this page's own prerequisite, already promises, the same "multiple promises
  to one unwritten page is normal" pattern as `locking-and-deadlock`'s
  `saga-pattern`. Note this page **absorbed** the Specialist slug
  `team-topologies` that `bounded-contexts` used to promise — see **Two more
  slug collisions**.

- **`microservices-org`** (drafted and converted 2026-09-12, Core tier, the
  last one) unlocks `modular-monolith`, `platform-engineering`,
  `service-decomposition` — and **introduces no new slug at all**, the only
  Core page that introduces none. All three are already promised elsewhere:
  `modular-monolith` by `bounded-contexts` and `dependency-inversion`,
  `platform-engineering` and `service-decomposition` by `conways-law` (the
  latter also by `bounded-contexts`). `modular-monolith` is the natural next
  page and is now promised by three pages; note that `microservices-org`
  already claims `design/architecture-styles#q55`, so whoever writes it should
  expect to share that question rather than treat it as taken.

Two Core titles contain a colon and must be quoted in YAML — see **Frontmatter
gotchas**. `stream-pipelines`' title is one of them, quoted in the draft above.

### Coverage audit — which banks still have no concept page

Measured 2026-09-11 across all 419 questions and all 28 concept pages (13
foundational, built; plus 16 core drafts — six now converted,
`broker-semantics`, `kafka-internals`, `stream-pipelines` and, as of
2026-09-12, `virtual-threads`, `cas-and-contention` and `isolation-levels` —
plus `cache-invalidation`, `spring-proxy`, `persistence-context`,
`aggregates`, `backpressure`, `coupling-and-cohesion` and `escape-analysis`,
seven more converted the same day or the day after, plus
`locking-and-deadlock` and `partitioning` closing out the batch, plus
`class-loading` drafted and converted the same day outside both batches, for
sixteen in total — all sixteen drafted Core pages now converted). *Re-measured
2026-09-12 after `query-planning`, `consistency-models` and
`expression-problem`: 32 concept pages, 19 of them Core, all built. Re-measured
again after `conways-law`: 33 concept pages, 20 of them Core. Re-measured a
final time after `microservices-org`, **which closes the Core tier**:
**34 concept pages, 21 of them Core, all built.***
**154 questions are claimed — 36.8%** (re-measured 2026-09-12 after
`microservices-org`, which adds **five** first claims — four on
`design/microservices-boundaries`, taking it from eight to twelve of eighteen,
and one on `design/architecture-styles`, taking it to four of eight — the
fourth conversion running to move the number by five or more), up from 149
after `conways-law`, which added **five** first claims, all of them on
`design/microservices-boundaries` — the first conversion to take a single
reference page from three claims to eight — up from 144 after
`expression-problem`, which added **six** first claims — the second
full-six move in a row, and the first coverage this library has had on
`design/design-patterns`, whose zero was previously recorded as deliberate —
up from 138 after `consistency-models`, which also added **six** first claims —
tied with `expression-problem` for the largest single-page move in the library,
because no concept page previously touched replication lag, read replicas, XA,
distributed locking, cross-service ordering or cross-service query;
up from 132 after `query-planning`, which added five
first claims on `data/query-performance` and was, with `class-loading`, one of
only two conversions in that batch to move this
number at all, up from 127 after `class-loading`, up from 124, up from 119 (28%) before
`stream-pipelines`, up from 114 (27%) before `kafka-internals`, up from 108
(26%) before `broker-semantics`, and up from 93 (22%) before the second batch
of six drafts. None of `virtual-threads`'s, `cas-and-contention`'s,
`isolation-levels`'s, `cache-invalidation`'s, `spring-proxy`'s,
`persistence-context`'s, `aggregates`'s, `backpressure`'s,
`coupling-and-cohesion`'s, nor `escape-analysis`'s conversion moves this
number — their `questions:` were already counted as drafts; converting a
drafted page changes where a claim lives, not whether it's counted.
`class-loading` is the exception and does move it, by **three**, not four: it
was written and converted in one pass with nothing counted in advance, and
one of its four claims (`java/jvm-memory-gc#q81`) was already held by
`jvm-memory`. Its other three — `java/core-language#q14`,
`java/concurrency#q52`, `java/modern-java#q90` — are first claims on
`core-language`, on `concurrency`'s Q52, and on `modern-java`, which had no
concept page beyond `virtual-threads`' Q91 before this. The
counts below in
**Everything else large is already planned** are the ones that move —
`coupling-and-cohesion` takes one question each off `oop-fundamentals`,
`solid-principles`, `architecture-styles` and `microservices-boundaries`;
`partitioning` takes one off `collections`, two off `scaling-operations`, and
one each off `kafka` and `redis-caching`; `broker-semantics` takes six off
`rabbitmq` (Q86, Q88, Q89, Q91, Q93, Q98), on top of the two `backpressure`
already had (Q92, Q102) — eight of `rabbitmq`'s twenty now claimed, twelve
still open; `kafka-internals` takes five off `kafka` (Q108, Q110, Q114,
Q116, Q131), on top of the four `the-log` (Q106, Q113), `idempotency` (Q109)
and `partitioning` (Q112) already had — nine of `kafka`'s thirty now
claimed, twenty-one still open; `stream-pipelines` takes five off
`java/streams` (Q37, Q38, Q40, Q41, Q44) — six of `streams`' eleven now
claimed (the pre-existing one is Q47, held by `generational-gc`, `jit` and
`escape-analysis`), five still open (Q39, Q42, Q43, Q45, Q46).

**That number is supposed to be low.** The tiering is the point: a small number
of deeply understood mechanisms generate correct answers to a large number of
questions, and a page exists for a *mechanism*, not to cover a section. Do not
treat 22% as a backlog, and do not raise it by writing pages that restate
questions. The useful question is never "which questions are unclaimed" but
**"which load-bearing mechanism has no page"**. By that test, three gaps were
real and are now in the Core table:

- **`broker-semantics`** — `data/rabbitmq` was 20 questions with **zero**
  coverage and was the only section both large and entirely unplanned. One
  mechanism generates a third of it: the broker-managed queue with per-message
  acknowledgement, against the log's consumer-managed offset. `the-log` already
  sets this up and declines to finish it — *"a queue's read is destructive and a
  log's read is a cursor move"* — so this is the sibling that page implies.
  **Drafted and converted the same day** (see the Core table above), claiming
  Q86, Q88, Q89, Q91, Q93 and Q98. `backpressure` separately takes Q92 and
  Q102. Twelve of `rabbitmq`'s twenty questions remain unclaimed —
  `design-patterns`-style recall (client mistakes, monitoring, zero-downtime
  config changes) that doesn't reduce to one mechanism.
- **`kafka-internals`, promoted Specialist → Core** — `data/kafka` was the
  largest section in the library at 30 questions, with 4 claimed at the time
  of this audit (this corrects an earlier count of 3 in this bullet, which
  missed `partitioning`'s Q112). Partitions and consumer groups, ISR and
  `acks`, rebalancing and retention are core mechanisms, not specialist
  ones. The slug already existed; the tier was wrong. **Drafted and
  converted the same day**, claiming Q108, Q110, Q114, Q116 and Q131 — see
  the Core table above.
- **`stream-pipelines`** — `java/streams` was 11 questions with 1 claimed, and no
  planned slug contained "stream", so this was an omission rather than a
  deferral. The mechanism is the lazy, fused, single-pass traversal driven by
  the terminal operation, plus spliterator decomposition for parallelism.
  **Drafted and converted the same day**, claiming Q37, Q38, Q40, Q41 and
  Q44 — see the Core table above. `prerequisites: []`: nothing in the built
  graph is a genuine dependency, and the ForkJoinPool/`thread-pools`
  connection the draft makes in §5 is flagged there explicitly as an
  adjacent-guarantee cross-reference, not a prerequisite, per the same
  judgement call `persistence-context` → `spring-proxy` and
  `escape-analysis` → `jit`/`generational-gc` made for genuine dependencies
  versus this one. 5 `questions:` anchors checked against
  `content/docs/java/streams.mdx` before writing. 9 sections, ~2,770 words,
  7 self-check items, with `where` pointers written at conversion time,
  same discipline as `broker-semantics` and `kafka-internals`. **Carries
  one diagram** — the spliterator split-compute-combine tree, not a copy of
  anything on `java/streams` or in CLAUDE.md's completed-19 reference-bank
  diagram list (which doesn't include `java/streams` at all) — verified in
  the browser at 375px (viewBox 548.5×971, rendered ≈63% scale, no
  horizontal overflow, no "Syntax error" text). Both `pnpm types:check` and
  `pnpm build` pass with the page in the sidebar.

**Two zero-coverage sections are deliberate, not oversights.** A later session
will find them and should not "fix" them:

- **`design/design-patterns`** (19 questions, zero **until 2026-09-12**).
  Mostly recall by nature — "Adapter vs Facade vs Proxy" is a distinction to
  memorise, with no mechanism underneath. The part that does have one was
  assigned to `expression-problem` (Q33, Q39, Q44 — Strategy today, Visitor
  superseded by pattern matching, functional features changing which patterns
  apply), and **that page was drafted and converted on 2026-09-12 and claims
  exactly those three**, so this section is no longer zero-coverage: sixteen of
  nineteen remain unclaimed, which is the deliberate part. The remainder, on
  what patterns are for and when to remove one, is judgement and belongs in
  `leading/`. Note the prediction held exactly — the three questions the audit
  named are the three the page took, with no drift — so the reasoning in this
  bullet is worth trusting for `java/testing-practice` below.
- **`java/testing-practice`** (9 questions, zero). Five of the nine — Q138–Q142,
  incident walkthrough, code review, decisions that survive two years,
  mentoring, what to ask an interviewer — are verbatim the leadership-track
  topics, which **must be user-written**. Only Q134–Q137 suit a concept page,
  and that is `testing-strategy`, already planned. The gap is assigned, just to
  a track that is unwritten.

`java/modern-java-22-25` also reads as zero-coverage and is not a gap: it is
itself a delta summary, added the same day.

Everything else large is already planned and needs no new slug:
**`microservices-boundaries` is no longer on this list**, and its reservation is
discharged: `conways-law` converted 2026-09-12 claiming Q64, Q66, Q69, Q70 and
Q72, and `microservices-org` followed the same day taking exactly the Q61, Q62
and Q73 that had been held for it, plus Q74. With the pre-existing Q63 and Q71
(`bounded-contexts`) and Q65 (`coupling-and-cohesion`) that is **twelve of
eighteen claimed**, the best-covered reference page in the library. The six
still open — Q67, Q68, Q75–Q78 — are extraction mechanics and
communication-style choices belonging to `service-decomposition` and to
`design/microservices-communication`'s own material, not to a new slug. Also
still planned:
`oop-fundamentals` (12, one now taken by `coupling-and-cohesion`),
`scaling-operations` (12, two now taken by `partitioning` → `replication`),
`redis-caching` (19, one now taken by `partitioning` → `caching`, plus
`hot-keys` from `cache-invalidation`'s `unlocks`). **`query-performance` is no
longer on this list**: `query-planning` converted 2026-09-12 and claims Q16,
Q18, Q19, Q20 and Q25, which with the pre-existing Q17 (`btrees-selectivity`)
and Q22 (`mvcc`) leaves eight of its fifteen unclaimed — recall-shaped material
(pagination, `COUNT(*)`, SQL-level N+1, window functions, hot rows, job queues)
that mostly belongs to other planned slugs rather than to this one.

Re-run the audit by intersecting every `[#qNN]` anchor under `content/docs/`
with every concept page's `questions:` list — including drafts in `_source/`,
or the six core drafts will read as uncovered.

## The leadership track

Section 9 of the design bank (Q96–Q107) covers this as reference Q&A, and
Q138–Q142 of `java/testing-practice` cover five of the same topics. The
`content/docs/leading/` track is separate, longer-form, and **written by the
user, not generated**. Claude Code should scaffold the structure and prompt with
questions; the content must come from real experience or it will read as
generic.

*(This path was written `content/leading/` here until 2026-09-12. It is
`content/docs/leading/`, alongside the other four tracks — there is no second
content root.)*

Topics: setting and defending conventions; reviewing for design not style;
one-way vs two-way doors; writing an ADR; running an incident; estimating and
negotiating scope; growing people; two-year technical strategy; saying no with
reasons that survive scrutiny; knowing when the boring option is correct.

### Scaffolded 2026-09-12 — ten stubs, no essay content

All ten topics now exist as stub pages, in that order, in
`content/docs/leading/meta.json`:

| File | Topic |
|---|---|
| `setting-conventions.mdx` | setting and defending conventions |
| `reviewing-for-design.mdx` | reviewing for design not style |
| `one-way-doors.mdx` | one-way vs two-way doors |
| `writing-an-adr.mdx` | writing an ADR |
| `running-an-incident.mdx` | running an incident |
| `estimating-and-scope.mdx` | estimating and negotiating scope |
| `growing-people.mdx` | growing people |
| `technical-strategy.mdx` | two-year technical strategy |
| `saying-no.mdx` | saying no with reasons that survive scrutiny |
| `the-boring-option.mdx` | knowing when the boring option is correct |

Each holds frontmatter, one prose line saying what the essay should cover, and a
`## Questions to answer` list of **six** prompts. **Nothing else — writing essay
prose into one of these is the failure mode this track exists to avoid.** Replace
the questions with the essay when you write it; they are scaffolding, not a
permanent section.

**The frontmatter is deliberately minimal: `title`, `description`, `tags`.** No
`concept:` and no `questions:`, and neither should be added to a stub:

- `page.tsx` derives `<ConceptPath>` from `conceptNodeFor(page.data)`, which is
  null without a `concept:` slug — so a stub renders no study-path box, and
  adding one would put an unwritten essay into the dependency graph.
- `questions:` drives **both** directions of the bidirectional linking. Declaring
  it on a stub would make reference answers render "The model behind this
  answer" pointing at a page with no answer in it.

Cross-reference the reference bank from the essay's prose when it is written,
not from frontmatter.

**The questions are the deliverable, so they are written to resist a generic
answer.** Each set asks for one case that worked and one that did not, and at
least one asks the user to state their own test in a form another person could
apply without them in the room. The last two items in every set ask what they
got wrong — that is where the non-generic material is. "How do you approach a
code review?" invites exactly the prose this track exists to avoid; "describe a
comment you left that you later regretted" does not.

`pnpm types:check` and `pnpm build` pass with the ten in the sidebar — 75 doc
paths, up from 65.

**`content/docs/index.mdx` still reads "The `leading/` track is empty because
those pages have to come from real experience rather than be generated."** That
is now half true: the scaffolding exists, the essays do not. Left as written,
deliberately — rewording it is the user's call, and the sentence is still
correct about what matters. Fix it when the first essay lands.

## Content structure

**Project layout decision:** this project uses the `src/` directory for code and
keeps content at the repository root. Answer *yes* to the `src/` prompt when
scaffolding. Every path below assumes this.

```
CLAUDE.md
LICENSE                      # MIT — code
LICENSE-CONTENT              # CC BY-NC-SA 4.0 — content
_source/                     # raw markdown, committed, excluded from the build
content/docs/                # MDX — NOT under src/
  meta.json                  # navigation (root: true)
  index.mdx
  concepts/ java/ data/ design/ leading/
proxy.ts                     # Next 16 middleware
source.config.ts             # global MDX options ONLY (mermaid) — no collections
src/
  app/
    docs/[[...slug]]/        # the library
    api/search/route.ts      # search index
    og/docs/[...slug]/       # OG images (enabled)
    llms.txt/ llms-full.txt/ # LLM-readable exports
  components/
    mdx.tsx                  # getMDXComponents() — register components HERE
    Question.tsx FollowUp.tsx Mermaid.tsx
    SelfCheck.tsx RelatedQuestions.tsx
    StudyPath.tsx ConceptPath.tsx      # the dependency graph — see Frontmatter
    SymptomIndex.tsx                   # the symptom index — see below
  lib/
    source.ts                # defineDocs macro + loader()
    schema.ts                # frontmatter Standard Schema — see Frontmatter
    graph.ts                 # concept dependency graph — see Frontmatter
    symptoms.ts              # the symptom index's copy — see below
    shared.ts layout.shared.tsx cn.ts
```

There is no `src/mdx-components.tsx`. If a tutorial mentions one, it predates
this version. `source.config.ts` exists but must never contain collections —
those live in `src/lib/source.ts`.

Content stays at the root because Fumadocs' defaults and examples assume
`content/docs`; moving it under `src/` means overriding paths for no benefit.

Fumadocs uses `meta.json` files for navigation (not Nextra's `_meta.ts`).
Confirm against the version you scaffold.

```
content/docs/
  index.mdx                  # study paths, entry points
  meta.json
  concepts/                  # deep-study pages
    meta.json
    index.mdx                # the study path — <StudyPath />, nothing else
    symptoms.mdx             # by symptom — <SymptomIndex />, nothing else
    jmm.mdx
    ...
  java/                      # reference Q&A (12 files)
  data/                      # reference Q&A (8 files)
  design/                    # reference Q&A (10 files)
  leading/                   # leadership essays, user-written (10 stubs)
```

The target filenames in the source tables above are relative to this root.

## The Question component

`src/components/Question.tsx`, `src/components/FollowUp.tsx` and
`src/components/Mermaid.tsx` are built and registered in
**`src/components/mdx.tsx`** — the scaffold's `getMDXComponents()` function — so
MDX files need no imports.

`QuestionsProvider` (exported from `Question.tsx`) wraps `<DocsBody>` in
`src/app/docs/[[...slug]]/page.tsx` and supplies the page-level expand-all
control, counting questions but not their nested follow-ups. MDX files need no
boilerplate for it.

There is **no `src/mdx-components.tsx`** in this project. Do not create one; it
would not be imported by anything. `src/app/docs/[[...slug]]/page.tsx` imports
`getMDXComponents` from `@/components/mdx` and passes it to `<MDXContent>`.
Adding a component means adding it to the object returned by that function.

### The authoring shape

The question text is a **real markdown heading** carrying an explicit anchor.
`<Question>` wraps the answer only. Blank lines inside the JSX are required, or
the markdown inside is not parsed:

```mdx
## Q48. Explain the Java Memory Model and happens-before. [#q48]

<Question id="q48">

**Answer.** ...

<FollowUp q="Give an example of a data race with no lock.">

Answer text.

</FollowUp>

</Question>
```

**Do not put the question text in a `title` prop.** An earlier version of this
file specified `<Question id="q48" title="...">`. It was built, tested and
rejected — measured on a real page, it failed four ways:

- the ToC is extracted from MDAST at build time, so an `<h3>` rendered by a React
  component never reaches it — every question was missing from "On this page";
- `structuredData` does not index JSX attributes, so searching a question's own
  words returned nothing;
- content inside the component inherited no heading anchor, so search hits linked
  to the top of the page rather than to `#q48`;
- a JSX string attribute cannot carry inline code, and most question titles
  contain some (``What exactly does `volatile` guarantee?`` — 15 of the 23 in the
  concurrency section alone).

The heading form fixes all four. `title` survives as an optional prop for a
question with no heading of its own; conversions do not use it.

Requirements, all verified against `content/docs/java/concurrency.mdx`:

- `[#q48]` on the heading sets the anchor, so `/docs/java/concurrency#q48`
  deep-links. Lowercase. Keep `<Question id>` matching it — that is what expands
  the answer when the page is opened on that anchor.
- Answers collapsed by default. Deep-linking expands that one answer and scrolls
  to it; the scroll retries after hydration, because Next restores scroll
  position and would otherwise pull the page back to the top.
- `FollowUp`'s `q` is a plain string attribute. Backtick spans in it are rendered
  as `<code>` by the component — and nothing else is, it is deliberately not a
  markdown parser. A `q` containing a double quote must be written as an
  expression: `q={"What's a \"start gate\" test?"}`.
- Do not wrap the answer body in `not-prose` or `prose-no-margin`. Both strip the
  paragraph margins and turn a four-paragraph answer into a wall of text; the
  body inherits the article's own prose spacing.

### Acceptance test — passed, do not re-litigate

Fumadocs builds its search index from `structuredData` extracted from the MDX
source, not from rendered HTML. **Verified 2026-09-09:** a phrase appearing only
inside a collapsed `<Question>` answer, and one appearing only inside a collapsed
`<FollowUp>`, are both returned by `/api/search`. Collapse behaviour does not
affect indexing. Re-run this only if the components are restructured.

### Self-check: `<Question>` deliberately does not fit

`<Question>` hides an *answer*. A self-check prompt has no answer by design — the
instruction is "answer these without looking" — so there is nothing for it to
collapse, and reusing it would mean inventing answers the page withholds on
purpose. **Do not put self-check answers on the page.**

`<SelfCheck>` / `<SelfCheckItem>` hide the *pointer* instead: which section of
this page builds the model being tested. Revealed after you have tried, it checks
recall without handing over the answer.

```mdx
<SelfCheck>

<SelfCheckItem n={1} where="§3 The piggyback effect.">

Which specific reordering breaks the guarantee, and which edge does it destroy?

</SelfCheckItem>

</SelfCheck>
```

`where` is navigation — a section name, never an answer — and it is **optional**.
Without it the item is a numbered question with no toggle, which is a perfectly
good self-check. Writing a pointer is a judgement about which section answers
which question, and the twelve drafts carry 94 self-check items between them;
requiring one each would mean authoring 94 in a single conversion pass, and
rushed pointers are worse than none. Convert without them, add them per page when
someone is actually reading that page.

**All 100 are now written** (the 94 plus the JMM page's 6), one page per session
across thirteen sessions — which is the "per page, while reading it" advice
followed rather than an exception to it. Doing a page's pointers meant reading
that page properly; several questions turned out to be answered by a *different*
section than the obvious one, and those are the pointers worth having:

- a question whose mechanism is in one section but whose remedy is in
  **Leading on this** needs both (`jit` item 7, `mvcc` item 7, `idempotency`
  item 8);
- a section with several bolded sub-parts is better named by the sub-part than
  the whole (`the-log` "§3 Write-ahead logging, the checkpoint trade-off";
  `dependency-inversion` "§7 Watch for leakage in signatures, not in imports").
  The JMM page already did this with "§3 The piggyback effect", which is a
  bolded paragraph, not a heading.

**`where` is rendered as plain text, not markdown.** `SelfCheckItem` drops the
string straight into a `<p>`; only `FollowUp`'s `q` deliberately converts
backtick spans to `<code>`. So when a heading you are pointing at carries
backticks or emphasis, **strip them**:

| Heading in the source | Write in `where` |
|---|---|
| ``### 3. Why `RSS` and heap usage diverge`` | `§3 Why RSS and heap usage diverge.` |
| ``### `count(*)` cannot be O(1)`` | `§3 count(*) cannot be O(1).` |
| `## 6. What this does *not* cover` | `§6 What this does not cover.` |

Characters like `*` and `_` are safe to keep verbatim when they are part of a
real name — `count(*)` renders correctly — precisely because there is no
markdown parser to trip. A lint that flags them is producing a false positive.

**The inverse holds for the children.** The question body between the tags *is*
parsed as markdown, so emphasis, backticks and double quotes carried over from
a source numbered list all render as intended, and need no escaping. The
`q={"...\"...\""}` rule for `FollowUp` does not apply here.

`SelfCheckItem` reuses `useCollapsible` from `Question.tsx`, so items that *do*
have a `where` count towards and respond to the page-level expand-all control;
that is what makes the control appear on concept pages, which have no
`<Question>` of their own.

`RelatedQuestions` needs no markup at all — `page.tsx` renders it from
`questions:` frontmatter. Do not place it in MDX.

## Conversion rules

**All 30 sections are converted** — 419 questions, 295 follow-ups, every bank
contiguous and duplicate-free. This section is now reference, not a task list.
Read it before touching a converted file, or if a source bank is ever extended.

**And all thirteen concept drafts** (2026-09-11), to the same discipline: the
only diff between `_source/<page>.mdx` and `content/docs/concepts/<page>.mdx` is
the self-check markup, proved by hashing the prose region of each pair. **No
exceptions remain** — the last one closed on 2026-09-11.

> **Closed: `hashmap` line 321.** During conversion the page repaired a dead
> link, `/docs/data/microservices-data#q116` → `/docs/java/persistence#q116`
> (there is no `data/microservices-data` page and none is planned; the only
> `microservices-data` is in the **design** track at Q89–95, which has no
> q116), leaving the page and its draft diverged on one line. The remaining
> half was prose — the line also said "in the design bank's persistence
> material" when the material is in the **Java** bank — and was left for the
> user. The user fixed the draft on 2026-09-11, dropping the bank clause
> entirely rather than correcting the word, and the page was re-synced to
> match. Draft and page are byte-identical outside the self-check again.

Everything else needed no repair — no MDX hazards in any of the thirteen, and
every `questions:` anchor valid on first check.

`content/docs/java/concurrency.mdx` (Q48–Q70) is converted and is the reference
implementation. Read it before converting anything else.

### Extending a bank: append, never insert

Settled 2026-09-11, when section 12 (Modern Java 22 → 25, Q143–Q154) was added
to the Java bank. **New questions go in a new trailing section with the next
free numbers, immediately before `## Closing notes`.**

The temptation is to put JDK 22–25 material inside section 7, *Modern Java
(8 → 21)*, where it belongs topically. Do not. Inserting at Q98 renumbers
Q98–Q142 — 45 questions across five MDX files — and every `[#qNN]` anchor,
every concept page `questions:` entry pointing into them, and every prose
cross-reference ("the outbox pattern (Q136...)") breaks silently. Anchors are
the library's only stable identifiers; renumbering is not a refactor, it is a
break of every inbound link.

The cost of appending is that a topic can span two non-adjacent sections and
two MDX files. That is the correct trade. Section 7 keeps its `(8 → 21)`
title, which stays accurate for what it contains.

Extending a bank means updating, in the source file: the question count in the
blurb, the `## Contents` list, and the new `## N.` heading. Then in this file:
the bank's section table, the corpus counts, and `content/docs/<track>/meta.json`
— whose `pages` list is explicit, so a new page builds fine and is silently
missing from the sidebar if you forget it.

### Drop the source's own headings

Fumadocs renders the page `<h1>` from the frontmatter `title`. It does not read
the body for a heading. A heading in the body that repeats the title renders
twice.

Each source bank is one document containing many sections:

```
# Senior Java Interview Question Bank      <- document title, line 1
**154 questions with model answers...**    <- document blurb
## Contents                                 <- document TOC
1. [Core Language & OOP](#1-core-language--oop) (Q1-Q14)
...
## 5. Concurrency                           <- the section being converted
### Q48. Explain the Java Memory Model...
```

Converting section 5 to `content/docs/java/concurrency.mdx`, **do not copy**:

- the `# Senior Java Interview Question Bank` H1 — it belongs to the document
- the document blurb and the `## Contents` list — its anchors point at a
  document that no longer exists, and Fumadocs generates a ToC automatically
- the `## 5. Concurrency` line itself — it becomes the frontmatter `title`,
  with the numeric prefix stripped (`Concurrency`, not `5. Concurrency`)

So the file begins:

```mdx
---
title: Concurrency
description: Java Memory Model, locks, executors, virtual threads.
questionRange: Q48–Q70
tags: [java, concurrency, jvm]
---

## Q48. Explain the Java Memory Model and happens-before. [#q48]

<Question id="q48">
...
```

The first body content is the first question heading. Nothing above it.

### Heading levels, anchors and separators

The source's `### QN.` headings become `##`, not `###`. They sat beneath a
`## 5. Concurrency` that the conversion moves into frontmatter, so keeping `###`
skips a level (h1 → h3) and renders the ToC as a list of indented orphans with no
parent.

Keep the `QN.` prefix in the heading text: the ToC and search results then
identify themselves by number, which is how the banks cross-reference each other
("the outbox pattern (Q136 in the data bank)"). Append the anchor:

```
### Q48. Explain the Java Memory Model and happens-before.          <- source
## Q48. Explain the Java Memory Model and happens-before. [#q48]    <- MDX
```

Drop the `---` separators between questions. The `<Question>` card border does
that job, and they would otherwise render as stray `<hr>`s.

The same rule applied to `content/docs/concepts/jmm.mdx`: its source began with
`# The Java Memory Model` under a frontmatter title of the same name, and the H1
was removed during conversion.

### Prefix every internal link with `/docs`

`src/lib/source.ts` sets `baseUrl: docsRoute` (`/docs`). So
`content/docs/java/concurrency.mdx` is served at `/docs/java/concurrency`.

Any link written without the prefix 404s:

```
[Q48](/java/concurrency#q48)         WRONG
[Q48](/docs/java/concurrency#q48)    correct
```

The reference banks currently contain no markdown links — cross-references are
plain prose ("the outbox pattern (Q136 in the data bank)"). Converting those to
real links is desirable, but every one needs the prefix.

Anchors come from the `[#qNN]` marker on the question heading, and are
lowercase: `#q48`, not `#Q48`. Question numbering restarts per bank, so `#q48`
exists in all three — the path disambiguates, and it must be correct.

Consider `createRelativeLink` from `fumadocs-ui/mdx` (already imported in
`src/app/docs/[[...slug]]/page.tsx`) if you prefer relative paths that are
validated at build time rather than absolute ones that fail silently.

## MDX gotchas

MDX parses `<` and `{` as JSX, so `List<String>`, `Map<K,V>`, `<T extends
Comparable<T>>`, `<2%` and `N < 100` in bare prose all break the build. Run
`pnpm build` after every file, not after every ten.

**There are two kinds of hit, and they take different fixes.** Choose by what
the text *is*, not by what is convenient:

| In the source | Fix | Why |
|---|---|---|
| A code identifier — `List<String>`, `Map<K,V>`, `<pid>` | backtick it | it *is* code; monospace is correct |
| A comparison in prose — `<2%`, `N < 100` | write the `<` as `&lt;` | it is prose, not code; a backtick would restyle the author's sentence |

`&lt;` renders as a literal `<` in ordinary prose, so the page reads exactly as
the source does. Backticking a prose comparison changes how the sentence looks
and quietly violates "structural only". Both fixes are formatting, so flag
either in the commit message.

Check mechanically rather than by eye, ignoring anything already fenced or
backticked:

```python
import re
fence = False
for i, l in enumerate(lines, 1):
    if l.lstrip().startswith('```'): fence = not fence; continue
    if fence: continue
    if re.search(r'[<{]', re.sub(r'`[^`]*`', '', l)): print(i, l)
```

**Final tally, all 30 sections measured: one bare `<` in 419 questions** —
`recovering <2% of heap` in java Q77, written as `&lt;2%`. Every other angle
bracket and brace in the corpus was already fenced or backticked, the design
bank included. Earlier drafts of this file warned that the Java and design banks
were "full of" bare generics; that was never measured and was false. Keep the
check for new material, but do not budget time for it, and never "fix" text that
is already backticked.

## Search

Fumadocs ships built-in search (self-hosted, free). Two modes:

- **Server route** — an API endpoint created from the source object. Fine on
  Vercel.
- **Static** — a cached JSON index, for fully static export.

**Wired and verified: the server route**, `src/app/api/search/route.ts`, using
`createFromSource(source)`. The built-in engine is now **ZBSearch** (it moved off
`@orama/orama` in 2026), so any snippet older than a few months is suspect — read
the current docs before changing anything here.

Verified working end to end: the API returns question headings and collapsed
answer text with correct `#qNN` anchors, and the Ctrl+K dialog shows them.

419 questions across 30 pages is a small index — this should not need tuning.

## Diagrams

Fumadocs does **not** render Mermaid natively — unlike Nextra. This is already
built and verified: `remarkMdxMermaid` (registered in `source.config.ts`)
rewrites fenced ```mermaid blocks into `<Mermaid chart="..." />` before Shiki
sees them, and `src/components/Mermaid.tsx` renders them client-side. Write
fenced ```mermaid blocks; no imports, no JSX.

`Mermaid.tsx` takes `useTheme` from `fumadocs-ui/provider/base`, which re-exports
it, so `next-themes` is **not** a direct dependency — it is not resolvable under
pnpm's strict layout. Do not add it.

### Placement

Put each diagram **inside the `<Question>` it illustrates, immediately after the
paragraph it supports** — not at the end of the answer, and not before the prose
that explains it. If the mechanism is explained in a `<FollowUp>` rather than the
main answer, the diagram belongs in the follow-up (the `ThreadPoolExecutor` flow
at `java/concurrency#q53` is the example: the target list says Q53, but the
core/queue/max mechanism lives in its follow-up).

Fenced ```mermaid blocks work inside JSX children, including a `<FollowUp>`
nested in a `<Question>` — `remarkMdxMermaid` traverses into them. Blank lines
around the fence are still required.

### Verifying — the build tells you nothing

Mermaid runs client-side, so **a syntax error is a blank diagram and a green
build**. `pnpm build` passing is not evidence. Open each one in the browser and
confirm an `svg[id^=mermaid]` exists with no "Syntax error" text.

**Measure with an explicit viewport.** When the Browser pane is hidden the whole
page layout collapses and *every* diagram measures `0x0`, which looks exactly
like eight broken diagrams. Set a size first (`resize_window`), or check the
SVG's own `viewBox` — a healthy diagram has a real one even when its
`getBoundingClientRect()` is zero.

**A diagram drafted in `_source/` cannot be verified where it sits**, because
`_source` is outside `content/docs` and is never built. Extract them into a
throwaway page under `content/docs`, add it to `content/docs/meta.json`, render,
check, then delete both. That is how the twelve concept drafts were verified;
three of ten failed the phone test on the first pass and would have shipped
unnoticed otherwise.

### Phone-readable, concretely

Top-to-bottom flow, ≤10 nodes, and two rules learned the hard way:

- **Fan-out of more than about three siblings renders landscape.** A node with
  five children lays them out in a row: `java/jvm-memory-gc#q71` first came out
  659×155 and had to be rebuilt with a subgraph and invisible links (`~~~`) to
  stack them. Keep branching to two or three, or group the leaves.
- **Fitting the width is not the same as being readable.** Check the *scale*, not
  just for overflow. `data/transactions-mvcc#q32` fitted a 375px screen with no
  horizontal scroll — at 42%, with labels too small to read. Shortening the
  participant and message labels took it from 968 to 660 viewBox units and fixed
  it. Screenshot at 375px and look; do not infer readability from dimensions.

A `sequenceDiagram` is legitimate where the point *is* a timeline (write skew,
two-thread interleavings) — it is inherently top-to-bottom. Keep participant and
message labels short, because participant count drives the width.

### Diagrams break byte-identity

A file with diagrams is no longer byte-identical to its `_source` section, so the
conversion verifier will report a diff on it. That is expected. The answer prose
must still be untouched — only the added fenced blocks may differ.

**Complete: 19 of 19** — six Java, eight data, five design. Add more only if a
new concept page needs one.

**Concept pages add 21 more, so the library holds 40.** Of the thirteen
foundational pages, **ten carry their own diagram** and **three link to a
reference one instead** — `jmm` → `java/concurrency#q48`, `jvm-memory` →
`java/jvm-memory-gc#q71`, `dependency-inversion` →
`design/architecture-styles#q53`. Each of those three was checked by following
the link and confirming the target still renders the picture the prose promises,
which is the only verification a borrowed diagram gets. **`broker-semantics`
adds the eleventh** — the first Core-tier page with a diagram of its own — a
queue-vs-stream fork, adjacent to rather than a copy of the AMQP routing
diagram already on `data/rabbitmq#q86` and the DLX retry diagram on
`data/rabbitmq#q90`. **`kafka-internals` adds the twelfth and thirteenth** —
an ISR/high-watermark failure trace and an eager-vs-cooperative rebalance
comparison, neither a copy of the reference bank's own Q110 (assignment
flow) or Q116 (ISR/high-watermark steady state) pictures. **`stream-pipelines`
adds the fourteenth** — a spliterator split-compute-combine tree, not a copy
of anything on `java/streams` (none of Q37–Q47 carries a diagram) or in the
reference-bank target-19 list, which doesn't include `java/streams` at all.
**`virtual-threads` adds the fifteenth** — structured concurrency's
cancellation propagation (one subtask fails, its sibling is cancelled
immediately, the scope throws), added at conversion time rather than present
in the draft, since `java/concurrency#q63` has no diagram to link to instead.
It is also the second foundational-tier-style "link, don't copy" case in the
Core tier: §2–3's mount/unmount/pinning mechanism links to
`java/concurrency#q62`'s existing diagram rather than redrawing it.
`cas-and-contention` carries no diagram at all, converted the same day.
**`isolation-levels` is the third Core-tier "link, don't copy" case** —
converted immediately after `cas-and-contention`, same day — and, like
`cas-and-contention`, **adds nothing to the count**: the write-skew
interleaving it uses as its canonical example (doctors on call) is already
drawn as a `sequenceDiagram` on `data/transactions-mvcc#q32`, so §2 adds one
linking sentence rather than a redrawn diagram, the same judgement `jmm` and
`virtual-threads` made for their own borrowed pictures. `cache-invalidation`
carries no diagram either, converted immediately after. **`spring-proxy` is
the fourth Core-tier "link, don't copy" case** — converted immediately
after `cache-invalidation`, same day — and also **adds nothing to the
count**: the caller→proxy→target boundary and self-invocation bypass it
explains in §2 is already drawn on `java/spring#q101`, so §2 keeps its
plain-text ASCII sketch as scaffolding and adds one linking sentence to
Q101's diagram, the same judgement `jmm`, `virtual-threads` and
`isolation-levels` made for their own borrowed pictures. **`persistence-context`
adds the sixteenth** — converted immediately after `spring-proxy`, same day —
an entity-lifecycle flowchart (transient → managed → detached/removed → gone,
with `merge()` returning to managed). Nothing on `content/docs/java/persistence.mdx`
carries a diagram at all, so this is a clean case of **Add a diagram only if it
shows something the reference bank doesn't already** rather than a
link-don't-copy judgement — and the page's own §8 explicitly recommends
teaching the four states as a whiteboard diagram, which is the diagram this
adds. **`aggregates` is the fifth Core-tier "link, don't copy" case** —
converted immediately after `persistence-context`, same day — and also
**adds nothing to the count**: the root/children/ID-reference structure §2
explains is already drawn on `design/ddd#q48` (it's on the diagrams target
list, "aggregate boundary and transactional scope (Q48)"), so §2 adds one
linking sentence to Q48's diagram instead of drawing a new one, the same
judgement `jmm`, `virtual-threads`, `isolation-levels` and `spring-proxy`
made for their own borrowed pictures. **`backpressure` carries no diagram
either** — converted immediately after `aggregates` — and it's a clean case
like `cas-and-contention`'s and `cache-invalidation`'s rather than a
link-don't-copy judgement: `java/concurrency#q53` already has its own
`ThreadPoolExecutor` diagram, but §3's table only names the thread pool as
one queue among seven, with nothing of this page's own to draw, and none of
its other four `questions:` anchors carries a diagram to link to either.
Adds nothing to the count. **`coupling-and-cohesion` adds the seventeenth** —
converted immediately after `backpressure` — a `quadrantChart` plotting
instability against abstractness, the library's first use of Mermaid's
quadrant-chart type. Neither of the page's claimed reference anchors
(`design/oop-fundamentals#q4`, `design/solid-principles#q24`) carries a
diagram of its own, so nothing existed to link to; this is a clean **Add a
diagram only if it shows something the reference bank doesn't already** case
like `persistence-context`'s, not a link-don't-copy judgement. **`escape-analysis`
adds the eighteenth** — converted immediately after `coupling-and-cohesion` —
a flowchart of the shared escape gate branching into scalar replacement and
lock elision. Neither of its two escape-analysis-specific reference anchors
(`java/jvm-memory-gc#q79`, `#q80`) carries a diagram of its own — both stop
at prose — so nothing existed to link to; another clean **Add a diagram only
if it shows something the reference bank doesn't already** case, not a
link-don't-copy judgement. **`locking-and-deadlock` adds the nineteenth** —
converted immediately after `escape-analysis` — a two-node wait-for graph
showing the circular-wait condition from §2 (holds/wants edges closing the
cycle). None of its three reference anchors (`data/transactions-mvcc#q35`,
`#q36`, `java/concurrency#q55`) carries a diagram of its own, so nothing
existed to link to; another clean **Add a diagram only if it shows something
the reference bank doesn't already** case, not a link-don't-copy judgement.
**`partitioning` adds the twentieth** — converted immediately after
`locking-and-deadlock`, closing out the second six drafts — a two-lane
flowchart contrasting direct hashing to a physical unit against hashing to a
fixed set of logical buckets mapped to physical ones. None of its five
reference anchors (`java/collections#q22`, `data/scaling-operations#q48`,
`#q49`, `data/kafka#q112`, `data/redis-caching#q67`) carries a diagram of
its own, and the indirection mechanism the diagram shows isn't drawn
anywhere else in the corpus; another clean **Add a diagram only if it shows
something the reference bank doesn't already** case, not a link-don't-copy
judgement. **`class-loading` adds the twenty-first** — drafted and converted
2026-09-12, outside both batches — a path-to-GC-root tracing a pooled
thread's `ThreadLocalMap` entry through its value to the deployment's loader
and every class it defined, with the weak key as a dotted edge against the
strong value's thick one. `java/jvm-memory-gc#q81` carries no diagram, and no
diagram anywhere in the corpus draws a retention path, so nothing existed to
link to; another clean **Add a diagram only if it shows something the
reference bank doesn't already** case. It brings the concept-page total to
**21** and the library to **40**. **`query-planning` adds the twenty-second** —
converted 2026-09-12 — a plan tree annotated with estimate against actual,
tracing one wrong leaf estimate into the join method, the sort's `work_mem`
sizing and the aggregate. It is the first concept-page diagram that was already
in the draft rather than added during conversion. `data/query-performance`'s
only diagram is on `#q17` (B-tree descent), none of the five claimed anchors
carries one, and nothing in the corpus draws estimate-versus-actual propagation,
so it is another clean **Add a diagram only if it shows something the reference
bank doesn't already** case. That takes the concept-page total to **22** and the
library to **41**. **`consistency-models` adds the twenty-third** — drafted and
converted 2026-09-12 — the consistency lattice from strict serializable down to
eventual, where the *edges* rather than the boxes carry the argument: thick
above the sticky-availability boundary, dotted across it, plain below, so the
picture says where availability is lost rather than merely listing the models.
None of its six claimed anchors carries a diagram, and no diagram anywhere in
the corpus draws a consistency hierarchy, so it is another clean **Add a diagram
only if it shows something the reference bank doesn't already** case. That takes
the concept-page total to **23** and the library to **42**.
**`expression-problem` adds the twenty-fourth** — drafted and converted
2026-09-12 — the two designs side by side, each with its cheap direction as a
thick edge and its costly direction as a dotted chain ending in the escape
hatch, so the picture carries §4's duality (both axes are compiler-checked, and
`default` turns either check off) rather than §2's grid, which stays a markdown
table because a table is what a grid is. This is the clearest **Add a diagram
only if it shows something the reference bank doesn't already** case in the
library so far: all four reference pages it touches —
`design/design-patterns`, `design/solid-principles`, `java/modern-java` and
`java/core-language` — carry **zero diagrams between them**, so there was
nothing to link to even in principle. That takes the concept-page total to
**24** and the library to **43**. **`conways-law` adds the twenty-fifth** —
drafted and converted 2026-09-12 — the communication structure above (two
teams, one costly edge between them) and the three seams below, with the
intra-team seam dotted ("free to cross: erodes") against the on-the-team-line
seam thick ("costs a negotiation: holds"), so the picture carries §4's cost
argument rather than merely labelling boundaries. `design/microservices-boundaries`
does carry two diagrams — `#q65` (distributed monolith vs properly bounded)
and `#q68` (strangler fig) — and **neither is this picture**: Q65 draws
runtime and deployment coupling between services with no team in it at all,
which is the same subject from the other side. None of the five claimed
anchors carries a diagram of its own, so this is another clean **Add a diagram
only if it shows something the reference bank doesn't already** case, not a
link-don't-copy judgement. That takes the concept-page total to **25** and the
library to **44**. **`microservices-org` adds the twenty-sixth** — drafted and
converted 2026-09-12, closing the Core tier — a `quadrantChart` of team
independence against deployment independence, the library's second use of that
type after `coupling-and-cohesion`. The *off*-diagonals carry the argument: the
distributed monolith (split further than ownership) and the release train (many
teams, one pipeline), the second of which has no common name and is the
under-diagnosed one. `design/microservices-boundaries`' `#q65` is the nearest
existing picture and is **not** this one — it draws what a distributed monolith
looks like at runtime, where this draws how you end up in one — and neither
`#q68` nor `design/architecture-styles`' `#q53`/`#q60` is related. None of the
five claimed anchors carries a diagram of its own. Another clean **Add a
diagram only if it shows something the reference bank doesn't already** case.
That takes the concept-page total to **26** and the library to **45**.

**The study path index adds a forty-sixth** (2026-09-12), and it is the first
diagram in the library that is not on a concept or reference page:
`content/docs/concepts/index.mdx` draws two *disjoint* prerequisite chains side
by side — `btrees-selectivity → mvcc → isolation-levels → locking-and-deadlock`
(stages 0–3) against `jvm-memory → thread-pools → backpressure` (stages 0–2) —
to carry the one thing readers get wrong about the stage number: **it measures
the depth of one run-up, not the width of a tier.** Both chains were picked
because every node in them has exactly one prerequisite, so the picture hides no
edge; there are only four such chains reaching stage 3, and all the others share
`btrees-selectivity → mvcc`, which would have destroyed the "share nothing"
point. Verified at 375px: `viewBox="0 0 460.55731201171875 478"`, ≈74% rendered
scale — joint-second-widest margin in the library, behind `generics-erasure` and
`conways-law` at 100% and level with `locking-and-deadlock`.

> **Stage bands as subgraphs do not work, and the reason generalises.** The
> first draft put each stage in its own `subgraph` box, which laid out correctly
> (four bands stacking top to bottom, 68% scale) but **collided the "Stage 3"
> subgraph title with the arrowhead entering the single node beneath it** —
> mermaid centres a subgraph title at the top edge, and an incoming edge to a
> lone child enters from directly above, through the text. There is no way to
> offset either. A band holding two or more nodes is fine; a band holding one is
> not. Dropping the boxes and moving the stage into the node label
> (`isolation-levels<br/>stage 2`) fixed it and *improved* the scale from 68% to
> 74%, because the boxes were the widest thing in the picture.
>
> **Check this the way the `microservices-org` quadrant chart taught** — per
> `<text>` `getBoundingClientRect()` against the SVG's own rect, plus a pairwise
> overlap test between label boxes. That is what caught it, and it is worth more
> than a screenshot here: the collision is a few pixels of overlap that a
> 375px-wide capture renders almost invisibly.

**Phone-readability, measured on all twelve at 375px.** None overflows; the
page body never scrolls horizontally. Rendered scale, worst first:

| Scale | Page | Shape |
|---|---|---|
| 50% | `generational-gc` | decision diamond beside a side branch |
| 50% | `persistence-context` | linear chain with one two-way fan-out and a loop-back |
| 52% | `btrees-selectivity` | three-sibling fan-out, landscape |
| 53% | `hashmap`, `idempotency` | three-way fan-out |
| 55% | `mvcc`, `escape-analysis` | |
| 57% | `expression-problem` | two stacked subgraphs, each two parallel chains |
| 58% | `broker-semantics`, `kafka-internals` (rebalance diagram) | two-branch fork, one loop-back decision diamond |
| 59% | `the-log` | |
| 61% | `jit` | |
| 64% | `query-planning` | plan tree, two-node fan-out into a linear chain |
| 68% | `kafka-internals` (ISR/high-watermark diagram) | linear chain with one decision diamond |
| 69% | `coupling-and-cohesion`, `microservices-org` | 2x2 quadrant plane |
| 72% | `class-loading` | linear chain with one two-node fan-out |
| 74% | `concepts/index` (the study path) | two disjoint parallel chains, no boxes |
| 99% | `thread-pools`, `bounded-contexts` | stacked subgraphs via `~~~` |
| 100% | `generics-erasure`, `conways-law` | plain top-to-bottom chain; stacked subgraphs via `~~~`, each a single-column chain |

The two at 99–100% are the ones that stack with invisible links or stay a simple
chain — that is the technique paying off, and it is worth reaching for. The two
at 50–52% are legible but the tightest in the library; they are the first place
to look if the phone pass is ever tightened. All of them were left as drafted:
changing a diagram is beyond a structural conversion.

`broker-semantics` (Core tier, measured 2026-09-11) sits in the same range as
the foundational middle of the pack — verified with `viewBox="0 0 586
943.59375"` against a 343px rendered width at 375px viewport.

`kafka-internals` (Core tier, measured 2026-09-11) carries two diagrams,
both checked the same way: the ISR/high-watermark trace at `viewBox="0 0
505.375 1110"` against a 343px rendered width (≈68%), and the
eager-vs-cooperative rebalance comparison at `viewBox="0 0 586
820.015625"` (≈58%) — both legible, neither the tightest in the library.

`stream-pipelines` (Core tier, measured 2026-09-11) carries one diagram, the
spliterator split-compute-combine tree, checked the same way: `viewBox="0 0
548.5 971"` against a 343px rendered width at 375px viewport (≈63%), no
horizontal overflow on the page body, no "Syntax error" text — in the same
legible middle of the range as `the-log` and `jit`, not the tightest in the
library.

`virtual-threads` (Core tier, measured 2026-09-12) carries one diagram, the
structured-concurrency cancellation-propagation flow, checked the same way:
`viewBox="0 0 594.640625 478"` against a 343px rendered width at 375px
viewport (≈58%), no horizontal overflow, no "Syntax error" text — in the same
range as `broker-semantics` and `kafka-internals`'s rebalance diagram, not the
tightest in the library.

`persistence-context` (Core tier, measured 2026-09-12) carries one diagram,
the entity-lifecycle flowchart, checked the same way: `viewBox="0 0
683.41015625 550"` against a 343px rendered width at 375px viewport (≈50%),
no horizontal overflow, no "Syntax error" text — tied with `generational-gc`
for the tightest in the library, still legible at that scale on screen.

`locking-and-deadlock` (Core tier, measured 2026-09-12) carries one diagram,
the two-node wait-for graph, checked the same way: `viewBox="0 0 277.25
230.453125"` against a 277px rendered width at 375px viewport (≈74%), no
horizontal overflow, no "Syntax error" text — the widest margin of any
diagram measured so far, since a two-node cycle is the smallest graph shape
in the library.

`partitioning` (Core tier, measured 2026-09-12) carries one diagram, the
direct-vs-indirect hashing flowchart, checked the same way: `viewBox="0 0
274.390625 1108.218017578125"` against a 274px rendered width at 375px
viewport (≈73%), no horizontal overflow, no "Syntax error" text. Its two
subgraphs are each a single-column chain, so they stack vertically under
Mermaid's own layout without needing the explicit `~~~` link that
`thread-pools` and `bounded-contexts` required for their wider subgraphs.

`consistency-models` (Core tier, measured 2026-09-12) carries one diagram, the
consistency lattice, checked the same way: `viewBox="0 0 586 830"` against a
343px rendered width at 375px viewport (≈59%), no horizontal overflow, no
"Syntax error" text — the same range as `broker-semantics`, `virtual-threads`
and `kafka-internals`'s rebalance diagram. Its single fan-out is two siblings,
inside the "two or three" branching rule, so it needed no subgraph or `~~~`
stacking; the rest is a straight chain, which is what keeps a seven-node
hierarchy portrait rather than landscape.

`class-loading` (Core tier, measured 2026-09-12) carries one diagram, the
path-to-GC-root retention chain, checked the same way: `viewBox="0 0 478.755
742"` against a 343px rendered width at 375px viewport (≈72%), no horizontal
overflow, no "Syntax error" text. Its single fan-out is two siblings — the
weak key and the strong value — which is inside the "two or three" branching
rule, so it needed no subgraph or `~~~` stacking.

`conways-law` (Core tier, measured 2026-09-12) carries one diagram, the
communication-structure-over-three-seams comparison, checked the same way:
`viewBox="0 0 278.5104064941406 730"` against a 278px rendered width at 375px
viewport — **100%, the joint-widest margin in the library** alongside
`generics-erasure`, and the first stacked-subgraph diagram to need no scaling
at all. It uses the `~~~` technique that got `thread-pools` and
`bounded-contexts` to 99%, but with only two nodes per subgraph and short
labels, so nothing forces the width out. No horizontal overflow, no "Syntax
error" text. **The lesson worth carrying forward: subgraph stacking plus
two-line edge labels is the cheapest route to a full-scale diagram**, and it
costs nothing to reach for first.

`microservices-org` (Core tier, measured 2026-09-12) carries one diagram, the
team-independence/deployment-independence quadrant chart, checked the same way:
`viewBox="0 0 500 500"` against a 343px rendered width at 375px viewport
(≈69%), no horizontal overflow, no "Syntax error" text — identical to
`coupling-and-cohesion`, because mermaid renders every `quadrantChart` on a
fixed 500×500 canvas regardless of content. **That fixed canvas is the thing to
know before drawing one**: the shape never overflows, but long data-point
labels are centred on their point and will run past the plot border if a point
sits near x=0 or x=1. The first version of this diagram put its right-hand
points at x=0.82 and they sat flush against the edge; x=0.75 with shorter
labels fixed it. **Measure that with `getBoundingClientRect()` per `<text>`
against the SVG's own rect — `getBBox()` will not show it**, because mermaid
centres text with a transform, so every box comes back symmetric around zero
and nothing ever looks clipped.

### A concept page links to a reference diagram, it does not copy it

Decided on the JMM page when the concept pattern was finished. The
happens-before diagram already existed
at `java/concurrency#q48`; the concept page links to it. Two copies of one mermaid
source in two files drift and nothing checks them, and moving it would strip the
bank's most-linked answer of its only picture.

So: if a concept page wants a picture that already exists on a reference answer,
**link to it**. If the concept page genuinely needs a diagram of its own, it
should show something the reference answer does not — a worked reordering trace,
a lab's failure mode — rather than a second rendering of the same idea.

Target list:

*Java* — JVM memory areas and what `-Xmx` doesn't bound (Q71); G1 region layout
and mixed collection (Q74); `ThreadPoolExecutor` core→queue→max→rejection flow
(Q53); happens-before edges between two threads (Q48); virtual thread
mount/unmount and pinning (Q62); Spring proxy boundary and self-invocation (Q101).

*Data* — B-tree descent plus heap fetch vs index-only scan (Q16/17); MVCC tuple
versions with xmin/xmax (Q33); write-skew timeline (Q32); Kafka partition to
consumer group assignment (Q110); Kafka ISR and high watermark (Q116);
transactional outbox end to end (Q136); RabbitMQ exchange→binding→queue (Q86);
RabbitMQ retry/DLQ topology (Q90).

*Design* — hexagonal ports and adapters with dependency direction (Q53);
distributed monolith vs properly bounded services (Q65); orchestration vs
choreography (Q60); strangler fig routing during migration (Q68); aggregate
boundary and transactional scope (Q48).

That is ~19 diagrams. Do not add decorative ones.

## Study features (build after content exists)

Content first — and the content now exists: **65 written pages** (30 reference
+ 34 concept — 13 foundational plus `broker-semantics`, `kafka-internals`,
`stream-pipelines`, `virtual-threads`, `cas-and-contention`,
`isolation-levels`, `cache-invalidation`, `spring-proxy`,
`persistence-context`, `aggregates`, `backpressure`,
`coupling-and-cohesion`, `escape-analysis`, `locking-and-deadlock`,
`partitioning`, `class-loading`, `query-planning`, `consistency-models`,
`expression-problem`, `conways-law` and `microservices-org` — **all
twenty-one Core pages, the tier now closed**), 419
questions,
**46 diagrams** — 19 reference, 26 concept, and one on the study path index
(`cas-and-contention`, `isolation-levels`, `cache-invalidation`,
`spring-proxy`, `aggregates` and `backpressure` carry none — `spring-proxy`
links to `java/spring#q101` and `aggregates` links to `design/ddd#q48`
instead), 265 self-check items, plus the study-path index at `/docs/concepts`.
**That gate is lifted, and the concept pages that followed it are done too**
(2026-09-11; the Core tier closed 2026-09-12). These two are now the front of
the queue, and with no Core page left to write they are the whole queue —
anything further is a Specialist page, and none is promised as a commitment.

The `leading/` track's ten pages are **not** in that 65. They are stubs —
frontmatter and six prompts each, scaffolded 2026-09-12, with no essay prose in
them, and they are not Claude Code's to fill in. See **The leadership track**.

- ~~Collapsible answers (self-test mode)~~ — built, with page-level expand-all
- ~~Search across everything~~ — built, see **Search** above
- `localStorage` progress: mark a concept page reviewed, with a date
- ~~A third index, by symptom rather than by subject or dependency~~ — **built
  2026-09-12**, see **The symptom index — built**
- ~~Concept dependency graph as a study path~~ — **built 2026-09-12**, see
  **The study path — built**. Thirty-four nodes, **ten** roots (eight
  foundational plus `stream-pipelines` and `expression-problem`),
  **thirty-two** resolving `prerequisites` edges and **21** `unlocks` edges,
  with **zero unresolved entries in either field** since the `unlocks` reversal
  of 2026-09-12. *The edge count was measured 2026-09-12 across all converted pages; it
  previously read "thirteen", which described the foundational-only graph and
  was never updated as the Core pages converted — thirteen is the count of
  foundational-tier edges, not of the whole graph.*
- ~~Self-check questions collapsed by default~~ — built, see **The Question component**

Out of scope: accounts, sync, spaced-repetition scheduling, a backend.

## Working agreement

- Reference Q&A conversion is **structural only**. Do not rewrite answer text.
  Script the conversion rather than retyping, then diff the result back against
  the source section and confirm the content lines are byte-identical. Retyping
  407 answers by hand will introduce drift that no build catches.
- Concept pages are new writing. Match the depth and voice of the JMM reference
  implementation. Do not pad to reach a length.
- Every concept page must have a runnable lab. If you cannot devise one, say so
  rather than inventing a fake exercise.
- Prefer primary sources in "go deeper": specifications, JEPs, named authors.
- Run `pnpm types:check` after every file and `pnpm build` before every commit.
  One commit per page.
- Commit format: `content(java): convert concurrency section`.
- Ask before adding any dependency beyond what the template ships. Added so far:
  `mermaid` (approved). `next-themes` was deliberately **not** added — see
  **Diagrams**.
- Flag uncertainty explicitly. A page that confidently states something wrong is
  worse than no page — the user will repeat it in an interview.
