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

**Core** — **fifteen of twenty-one drafted** in `_source/` as of 2026-09-11,
**fourteen of those fifteen also converted** into `content/docs/concepts/` —
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
`coupling-and-cohesion` converted immediately after `backpressure`, and
`escape-analysis` converted immediately after `coupling-and-cohesion`, and
`locking-and-deadlock` converted immediately after `escape-analysis` — five
of the six taken to `content/docs/concepts/` so far; `partitioning` remains
drafted only. Three more were
added the same day from the coverage audit below — `broker-semantics`,
`stream-pipelines`, and `kafka-internals` promoted from Specialist — and all
three were drafted and converted the same day. `stream-pipelines` claims five
of `java/streams`' eleven questions (Q37, Q38, Q40, Q41, Q44 — deliberately
not Q47, already claimed three times over) and `prerequisites: []`, a
deliberate root: nothing in the built graph is a genuine dependency, and
`thread-pools` is an adjacent cross-reference in §5, not a prerequisite.
`query-planning`, `class-loading` and `consistency-models` remain undrafted.

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
| `partitioning` | Partitioning — One Idea in Five Systems | drafted |
| `broker-semantics` | Broker semantics — acknowledgement, redelivery, and where queues beat logs | drafted, converted |
| `kafka-internals` | Partitions, Consumer Groups, ISR and the High Watermark | drafted, converted |
| `stream-pipelines` | Stream Pipelines: Laziness, Fusion, and Parallel Decomposition | drafted, converted |
| `class-loading` | Class loading and classloader leaks | |
| `query-planning` | Query planning and cardinality estimation | |
| `consistency-models` | Consistency models and choosing per operation | |
| `expression-problem` | The expression problem: polymorphism vs pattern matching | |
| `conways-law` | Conway's law and the inverse manoeuvre | |
| `microservices-org` | Why microservices are an organisational answer | |

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

**Specialist** — 47 slugs, every one promised by a foundational page's
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

Two Core titles contain a colon and must be quoted in YAML — see **Frontmatter
gotchas**. `stream-pipelines`' title is one of them, quoted in the draft above.

### Coverage audit — which banks still have no concept page

Measured 2026-09-11 across all 419 questions and all 28 concept pages (13
foundational, built; plus 15 core drafts — six now converted,
`broker-semantics`, `kafka-internals`, `stream-pipelines` and, as of
2026-09-12, `virtual-threads`, `cas-and-contention` and `isolation-levels` —
plus `cache-invalidation`, `spring-proxy`, `persistence-context`,
`aggregates`, `backpressure`, `coupling-and-cohesion` and `escape-analysis`,
all seven converted the same day or the day after, for thirteen in total).
**124 questions are claimed — 30%**, up from 119 (28%) before
`stream-pipelines`, up from 114 (27%) before `kafka-internals`, up from 108
(26%) before `broker-semantics`, and up from 93 (22%) before the second batch
of six drafts. None of `virtual-threads`'s, `cas-and-contention`'s,
`isolation-levels`'s, `cache-invalidation`'s, `spring-proxy`'s,
`persistence-context`'s, `aggregates`'s, `backpressure`'s,
`coupling-and-cohesion`'s, nor `escape-analysis`'s conversion moves this
number — their `questions:` were already counted as drafts; converting a
drafted page changes where a claim lives, not whether it's counted. The
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
`microservices-boundaries` (15 unclaimed, one now taken by
`coupling-and-cohesion` → `service-decomposition`, `modular-monolith`),
`oop-fundamentals` (12, one now taken by `coupling-and-cohesion`),
`scaling-operations` (12, two now taken by `partitioning` → `replication`),
`redis-caching` (19, one now taken by `partitioning` → `caching`, plus
`hot-keys` from `cache-invalidation`'s `unlocks`), and `query-performance`
(13, unaffected by this batch → `query-planning`).

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

**Concept pages add 19 more, so the library holds 38.** Of the thirteen
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

**Phone-readability, measured on all twelve at 375px.** None overflows; the
page body never scrolls horizontally. Rendered scale, worst first:

| Scale | Page | Shape |
|---|---|---|
| 50% | `generational-gc` | decision diamond beside a side branch |
| 50% | `persistence-context` | linear chain with one two-way fan-out and a loop-back |
| 52% | `btrees-selectivity` | three-sibling fan-out, landscape |
| 53% | `hashmap`, `idempotency` | three-way fan-out |
| 55% | `mvcc`, `escape-analysis` | |
| 58% | `broker-semantics`, `kafka-internals` (rebalance diagram) | two-branch fork, one loop-back decision diamond |
| 59% | `the-log` | |
| 61% | `jit` | |
| 68% | `kafka-internals` (ISR/high-watermark diagram) | linear chain with one decision diamond |
| 69% | `coupling-and-cohesion` | 2x2 quadrant plane |
| 99% | `thread-pools`, `bounded-contexts` | stacked subgraphs via `~~~` |
| 100% | `generics-erasure` | plain top-to-bottom chain |

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

Content first — and the content now exists: **57 pages** (30 reference + 27
concept — 13 foundational plus `broker-semantics`, `kafka-internals`,
`stream-pipelines`, `virtual-threads`, `cas-and-contention`,
`isolation-levels`, `cache-invalidation`, `spring-proxy`,
`persistence-context`, `aggregates`, `backpressure`,
`coupling-and-cohesion`, `escape-analysis` and `locking-and-deadlock`, the
fourteen converted Core pages so far), 419 questions,
**38 diagrams**
(`cas-and-contention`, `isolation-levels`, `cache-invalidation`,
`spring-proxy`, `aggregates` and `backpressure` carry none — `spring-proxy`
links to `java/spring#q101` and `aggregates` links to `design/ddd#q48`
instead), 209 self-check items.
**That gate is lifted, and the concept pages that followed it are done too**
(2026-09-11). These two are now the front of the queue.

- ~~Collapsible answers (self-test mode)~~ — built, with page-level expand-all
- ~~Search across everything~~ — built, see **Search** above
- `localStorage` progress: mark a concept page reviewed, with a date
- Concept dependency graph as a study path — **now has nineteen real
  nodes.** Read **The dependency graph — settled conventions** before
  starting: nine roots (eight foundational plus `stream-pipelines`), eleven
  resolving `prerequisites` edges (`isolation-levels → mvcc` is the newest),
  and a large majority of `unlocks` targets pointing at unwritten specialist
  pages. Tolerating dangling `unlocks` is a day-one requirement, not an edge
  case.
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
