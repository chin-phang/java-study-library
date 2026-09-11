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
banks. `prerequisites`/`unlocks` are meant to build a dependency graph rendered as
a study path on the index — **that part is still not built**; the fields are
recorded but nothing reads them yet.

**Six core drafts are waiting** (2026-09-11) and will take the graph to
nineteen nodes when converted, adding the edges `cas-and-contention → jmm`
(subject to the slug collision above), `isolation-levels → mvcc`,
`cache-invalidation → the-log`, `spring-proxy → dependency-inversion`,
`virtual-threads → thread-pools` and `→ jvm-memory`, and
`persistence-context → spring-proxy` and `→ mvcc` — the first edge in the
library between two *core* pages. Until they convert, the measurements below
describe the graph as built.

**The graph has thirteen real nodes to draw** (2026-09-11). Measured across
all thirteen converted pages: **no dangling `prerequisites`** — eight are
legitimate roots (`prerequisites: []`) and the five resolving edges are
`thread-pools → jvm-memory`, `generational-gc → jvm-memory`, `mvcc →
btrees-selectivity`, `the-log → mvcc` and `bounded-contexts →
dependency-inversion`. Every `unlocks` target that is *not* one of the thirteen
dangles by design, which is most of them. So a renderer built today must
tolerate dangling `unlocks` on day one; it will not meet a dangling
`prerequisites` unless someone introduces one.

### The dependency graph — settled conventions

Decided 2026-09-10, at the frontmatter review gate. Both are cheap now and
expensive to reverse once a dozen pages have declared them.

- **`prerequisites: []` is legitimate.** Some concepts are genuine roots —
  generics and type erasure, B-trees and selectivity — and depend on nothing else
  in the library. Do not invent a parent just to avoid an empty list.
- **`unlocks` may name pages that do not exist yet.** It is a roadmap, not a link
  list. `unlocks: [pecs, generic-api-design]` is fine before either page is
  written.

The consequence lands on whoever builds the study-path renderer: **it must
tolerate dangling edges.** An `unlocks` target that resolves to no page is normal
and must not throw, silently drop the node, or render as a broken link — show it
as unwritten, or skip it deliberately. Assume nothing resolves.

**The two fields are not symmetric.** A dangling `unlocks` is a promise; a
dangling `prerequisites` is a dead end, telling a reader to study something first
that they cannot read.

- `unlocks` — **the pages that come next**, once this page is understood. Not a
  list of topics this page happens to cover; those are its own sections. May
  dangle, because the next page may not be written yet. The JMM page originally
  listed `volatile`, `safe-publication` and `final-field-semantics` here, which
  are §3 and §5 *of that page* — the wrong meaning, and it would have had the
  graph drawing edges to nodes that can never exist.
- `prerequisites` — **must resolve to a written page.** If the prerequisite is not
  written yet, use `prerequisites: []` and add the edge when the page lands.

The JMM page carried `prerequisites: [threads-and-scheduling]`, which was not
written and not even on the candidate list. It is now `[]`, since nothing in the
library precedes it. Any check on the graph should flag a dangling
`prerequisites` and ignore a dangling `unlocks`.

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
`pages` list in `content/docs/concepts/meta.json`, which runs language and
runtime, then data, then distributed and design:

```json
["jmm", "thread-pools", "generics-erasure", "hashmap", "jvm-memory",
 "generational-gc", "jit", "btrees-selectivity", "mvcc", "the-log",
 "idempotency", "bounded-contexts", "dependency-inversion"]
```

The list is explicit, so a page left out of it builds fine and is silently
missing from the sidebar. Add new concept pages to it deliberately.

**Core** — **six of twenty-one drafted** in `_source/` as of 2026-09-11, none
converted yet. Eight are named by a foundational page's `unlocks`, so the graph
reaches them: `query-planning`, `partitioning`, `escape-analysis`,
`isolation-levels`, `virtual-threads`, `backpressure`, `cas`, `deadlock`. Three
were added on 2026-09-11 from the coverage audit below — `broker-semantics`,
`stream-pipelines`, and `kafka-internals` promoted from Specialist.

Titles below are the drafts' own where a draft exists, and the placeholder
otherwise; as with the foundational tier, **where a draft and this table
disagreed, the draft won**.

| `concept:` | Page | Draft |
|---|---|---|
| `virtual-threads` | Virtual Threads — Continuations, Mounting, and Pinning | drafted |
| `cas-and-contention` | CAS, Contention, and Lock-Free Structures | drafted |
| `isolation-levels` | Isolation Levels and the Anomalies They Permit | drafted |
| `cache-invalidation` | Cache Invalidation and the Races in Each Ordering | drafted |
| `spring-proxy` | The Proxy Boundary in Spring | drafted |
| `persistence-context` | The Persistence Context and Dirty Checking | drafted |
| `broker-semantics` | Broker semantics — acknowledgement, redelivery, and where queues beat logs | |
| `kafka-internals` | Partitions, consumer groups, ISR and the high watermark | |
| `stream-pipelines` | Stream pipelines — laziness, fusion and parallel decomposition | |
| `escape-analysis` | Escape analysis and when allocation disappears | |
| `class-loading` | Class loading and classloader leaks | |
| `query-planning` | Query planning and cardinality estimation | |
| `deadlock` | Locking, deadlock and lock ordering | |
| `partitioning` | Partitioning as one idea across four systems | |
| `backpressure` | Backpressure and the unbounded-queue failure mode | |
| `consistency-models` | Consistency models and choosing per operation | |
| `aggregates` | Aggregates as consistency boundaries | |
| `coupling-cohesion` | Coupling, cohesion and what makes a change expensive | |
| `expression-problem` | The expression problem: polymorphism vs pattern matching | |
| `conways-law` | Conway's law and the inverse manoeuvre | |
| `microservices-org` | Why microservices are an organisational answer | |

**The `cas` slug changed to `cas-and-contention`, and one edge is now
mis-spelled.** `content/docs/concepts/jmm.mdx` declares
`unlocks: [cas, deadlock, virtual-threads]`, written before the draft existed.
`cas` will now never resolve, while the real page declares
`prerequisites: [jmm]` — so the graph gets the jmm→CAS edge from one direction
and a permanent dangling promise from the other. Nothing breaks (a dangling
`unlocks` is legal by design), but it is the "second spelling" this table exists
to prevent. **Resolve it before converting `cas-and-contention`**: either edit
`jmm`'s `unlocks` to `cas-and-contention`, which diverges the page from
`_source/java-memory-model-concept-page.md` and so needs the same deliberate
recording as the `hashmap` link repair, or rename the draft's slug to `cas`.
The user's call; do not pick one silently.

**Audit of the six drafts** (2026-09-11, measured, the same pass the foundational
drafts got before conversion): no stray H1s, **zero MDX hazards**, every internal
link carrying its `/docs` prefix and resolving, all 30 `questions:` anchors
valid, and **no dangling `prerequisites`** — `the-log`, `jmm`, `mvcc`,
`dependency-inversion`, `thread-pools`, `jvm-memory` are all written, and
`persistence-context` depends on `spring-proxy`, which is in the same batch.
Each is 9–11 sections, 2,000–2,700 words, 8 self-check items, and **none carries
a diagram**. Every `unlocks` target is a specialist page that does not exist,
which is normal.

Two currency items carried into these drafts, both the same as the ones fixed
across the corpus on 2026-09-11 — flagged, deliberately **not** edited, because
they are the user's fresh prose:

- `virtual-threads.mdx` "Where to go deeper" cites **JEP 453** for structured
  concurrency and **JEP 446** for scoped values. Both are first previews:
  scoped values finalised as JEP 506 in JDK 25, and structured concurrency is at
  JEP 525 (sixth preview, JDK 26) with a reshaped API. The page's *body* handles
  the pinning timeline correctly and names JEP 491 explicitly.
- `cache-invalidation.mdx` and `isolation-levels.mdx` pin `postgres:17` in their
  labs; the other four Postgres labs were moved to `postgres:18`.

**Specialist** — 40 slugs, every one promised by a foundational page's
`unlocks` and none of them written or planned. (`kafka-internals` was here until
2026-09-11 and is now Core — see the coverage audit below.) They are listed so the names are
fixed and a later page cannot invent a second spelling; titles get decided when
someone writes the page. Grouped by what promises them:

- **`generics-erasure`** unlocks `collections-api-design`, `variance`, `reflection`, `serialisation-frameworks`
- **`hashmap`** unlocks `concurrent-collections`, `equals-hashcode`, `collection-sizing`, `caching`
- **`jvm-memory`** unlocks `gc-tuning`, `memory-leaks`, `off-heap-memory`, `classloader-leaks`
- **`generational-gc`** unlocks `gc-tuning`, `latency-troubleshooting`, `memory-leaks`
- **`jit`** unlocks `latency-troubleshooting`, `benchmarking`, `startup-optimisation`
- **`btrees-selectivity`** unlocks `composite-indexes`, `covering-indexes`
- **`mvcc`** unlocks `vacuum-and-bloat`, `long-transactions`, `replication-lag`, `write-skew`
- **`the-log`** unlocks `replication`, `cdc-and-outbox`, `event-sourcing`, `kafka-internals` (**now Core**), `crash-recovery`
- **`idempotency`** unlocks `retries-and-backoff`, `outbox-pattern`, `saga-pattern`, `exactly-once`, `reconciliation`
- **`bounded-contexts`** unlocks `service-decomposition`, `anti-corruption-layer`, `modular-monolith`, `event-design`, `team-topologies`
- **`dependency-inversion`** unlocks `anti-corruption-layer`, `modular-monolith`, `hexagonal-architecture`, `testing-strategy`
- **`thread-pools`** unlocks `bulkheads`, `capacity-planning`, `cascading-failure`

Two Core titles contain a colon and must be quoted in YAML — see **Frontmatter
gotchas**.

### Coverage audit — which banks still have no concept page

Measured 2026-09-11 across all 419 questions and all 19 concept pages (13 built
plus the 6 core drafts). **93 questions are claimed — 22%.**

**That number is supposed to be low.** The tiering is the point: a small number
of deeply understood mechanisms generate correct answers to a large number of
questions, and a page exists for a *mechanism*, not to cover a section. Do not
treat 22% as a backlog, and do not raise it by writing pages that restate
questions. The useful question is never "which questions are unclaimed" but
**"which load-bearing mechanism has no page"**. By that test, three gaps were
real and are now in the Core table:

- **`broker-semantics`** — `data/rabbitmq` is 20 questions with **zero**
  coverage and was the only section both large and entirely unplanned. One
  mechanism generates half of it: the broker-managed queue with per-message
  acknowledgement, against the log's consumer-managed offset. `the-log` already
  sets this up and declines to finish it — *"a queue's read is destructive and a
  log's read is a cursor move"* — so this is the sibling that page implies.
  `backpressure` takes Q92 and Q102 and nothing else there.
- **`kafka-internals`, promoted Specialist → Core** — `data/kafka` is the
  largest section in the library at 30 questions, with 3 claimed. Partitions and
  consumer groups, ISR and `acks`, rebalancing and retention are core
  mechanisms, not specialist ones. The slug already existed; the tier was wrong.
- **`stream-pipelines`** — `java/streams` is 11 questions with 1 claimed, and no
  planned slug contained "stream", so this was an omission rather than a
  deferral. The mechanism is the lazy, fused, single-pass traversal driven by
  the terminal operation, plus spliterator decomposition for parallelism.

**Two zero-coverage sections are deliberate, not oversights.** A later session
will find them and should not "fix" them:

- **`design/design-patterns`** (19 questions, zero). Mostly recall by nature —
  "Adapter vs Facade vs Proxy" is a distinction to memorise, with no mechanism
  underneath. The part that does have one is already `expression-problem`
  (Q33, Q39, Q44 — Strategy today, Visitor superseded by pattern matching,
  functional features changing which patterns apply). The remainder, on what
  patterns are for and when to remove one, is judgement and belongs in
  `leading/`.
- **`java/testing-practice`** (9 questions, zero). Five of the nine — Q138–Q142,
  incident walkthrough, code review, decisions that survive two years,
  mentoring, what to ask an interviewer — are verbatim the leadership-track
  topics, which **must be user-written**. Only Q134–Q137 suit a concept page,
  and that is `testing-strategy`, already planned. The gap is assigned, just to
  a track that is unwritten.

`java/modern-java-22-25` also reads as zero-coverage and is not a gap: it is
itself a delta summary, added the same day.

Everything else large is already planned and needs no new slug:
`microservices-boundaries` (16 unclaimed → `service-decomposition`,
`modular-monolith`), `oop-fundamentals` (13 → `coupling-cohesion`),
`scaling-operations` (14 → `replication`, `partitioning`), `redis-caching`
(20 → `caching`, plus `hot-keys` from `cache-invalidation`'s `unlocks`), and
`query-performance` (13 → `query-planning`).

Re-run the audit by intersecting every `[#qNN]` anchor under `content/docs/`
with every concept page's `questions:` list — including drafts in `_source/`,
or the six core drafts will read as uncovered.

## The leadership track

Section 9 of the design bank (Q96–Q107) covers this as reference Q&A. The
`content/leading/` track is separate, longer-form, and **written by the user, not
generated**. Claude Code should scaffold the structure and prompt with questions;
the content must come from real experience or it will read as generic.

Topics: setting and defending conventions; reviewing for design not style;
one-way vs two-way doors; writing an ADR; running an incident; estimating and
negotiating scope; growing people; two-year technical strategy; saying no with
reasons that survive scrutiny; knowing when the boring option is correct.

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
  lib/
    source.ts                # defineDocs macro + loader()
    schema.ts                # frontmatter Standard Schema — see Frontmatter
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
    jmm.mdx
    ...
  java/                      # reference Q&A (12 files)
  data/                      # reference Q&A (8 files)
  design/                    # reference Q&A (10 files)
  leading/                   # leadership essays, user-written
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

**Concept pages add 10 more, so the library holds 29.** Of the thirteen
foundational pages, **ten carry their own diagram** and **three link to a
reference one instead** — `jmm` → `java/concurrency#q48`, `jvm-memory` →
`java/jvm-memory-gc#q71`, `dependency-inversion` →
`design/architecture-styles#q53`. Each of those three was checked by following
the link and confirming the target still renders the picture the prose promises,
which is the only verification a borrowed diagram gets.

**Phone-readability, measured on all ten at 375px.** None overflows; the page
body never scrolls horizontally. Rendered scale, worst first:

| Scale | Page | Shape |
|---|---|---|
| 50% | `generational-gc` | decision diamond beside a side branch |
| 52% | `btrees-selectivity` | three-sibling fan-out, landscape |
| 53% | `hashmap`, `idempotency` | three-way fan-out |
| 55% | `mvcc` | |
| 59% | `the-log` | |
| 61% | `jit` | |
| 99% | `thread-pools`, `bounded-contexts` | stacked subgraphs via `~~~` |
| 100% | `generics-erasure` | plain top-to-bottom chain |

The two at 99–100% are the ones that stack with invisible links or stay a simple
chain — that is the technique paying off, and it is worth reaching for. The two
at 50–52% are legible but the tightest in the library; they are the first place
to look if the phone pass is ever tightened. All of them were left as drafted:
changing a diagram is beyond a structural conversion.

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

Content first — and the content now exists: **43 pages** (30 reference + 13
concept), 419 questions, **29 diagrams**, 100 self-check items.
**That gate is lifted, and the concept pages that followed it are done too**
(2026-09-11). These two are now the front of the queue.

- ~~Collapsible answers (self-test mode)~~ — built, with page-level expand-all
- ~~Search across everything~~ — built, see **Search** above
- `localStorage` progress: mark a concept page reviewed, with a date
- Concept dependency graph as a study path — **now has thirteen real nodes.**
  Read **The dependency graph — settled conventions** before starting: eight
  roots, five resolving `prerequisites` edges, and a large majority of `unlocks`
  targets pointing at unwritten specialist pages. Tolerating dangling `unlocks`
  is a day-one requirement, not an edge case.
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
