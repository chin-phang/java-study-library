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

**Stop the dev server before any `pnpm install` / `pnpm add`.** Next.js holds
file handles under `node_modules`, so the relink fails with
`ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR ... Access is denied`.

## The two content types

This distinction drives everything. Do not blur it.

### Reference questions (407)

The existing Q&A in `_source/`. Optimised for recall — claim, mechanism,
trade-off. These stay as written; conversion to MDX is **structural only**.
Their job is fast lookup and self-testing. Each links up to the concept page
that explains it.

### Concept pages (~55)

Deep-study pages on the load-bearing ideas. Written to build a mental model, not
to be recited. One concept page typically explains 5–15 reference questions.

**Do not expand all 407 questions into concept pages.** That produces ~250k words
of padding. The tiering is the point: a small number of deeply understood
mechanisms generate correct answers to a large number of questions.

## Source material

All in `_source/`, excluded from the build.

### `senior-java-interview-questions.md` — 142 questions, ~27k words

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
9. **Self-check** — 5–7 questions answerable only if the model is built. Prefer
   "why does X break Y" over "what is X".

Sections 6 and 7 are what distinguish this library from the reference Q&A.
If a page is missing either, it isn't finished.

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

`prerequisites`/`unlocks` build the dependency graph — render it as a study path
on the index. `questions` drives bidirectional linking.

## Candidate concept pages

**Foundational** (do these first — they unlock the most):

- The Java Memory Model — *reference implementation, already written*
- Generics and type erasure
- How HashMap actually works
- The JVM's memory areas and what `-Xmx` doesn't bound
- Generational GC and why allocation is cheap
- JIT compilation, inlining and deoptimisation
- B-trees, selectivity and why an index isn't used
- MVCC and the cost of a row version
- The log: WAL, replication, and why Kafka and PostgreSQL share a shape
- Idempotency and the three outcomes of a network call
- Bounded contexts and finding a boundary
- Dependency inversion and the hexagonal shape

**Core:**

- Thread pools and Little's Law
- Virtual threads: continuations, mounting, pinning
- CAS, contention and lock-free structures
- Escape analysis and when allocation disappears
- Class loading and classloader leaks
- Query planning and cardinality estimation
- Isolation levels and the anomalies they permit
- Locking, deadlock and lock ordering
- Partitioning as one idea across four systems
- Cache invalidation and the races in each ordering
- Backpressure and the unbounded-queue failure mode
- Consistency models and choosing per operation
- The proxy boundary in Spring
- The persistence context and dirty checking
- Aggregates as consistency boundaries
- Coupling, cohesion and what makes a change expensive
- The expression problem: polymorphism vs pattern matching
- Conway's law and the inverse manoeuvre
- Why microservices are an organisational answer

**Specialist:** add as you hit them. Don't pre-plan the whole list.

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
  lib/
    source.ts                # defineDocs macro + loader()
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
  java/                      # reference Q&A (11 files)
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

## Conversion rules

These apply to every one of the 29 reference sections. Getting them wrong once
means getting them wrong 29 times.

`content/docs/java/concurrency.mdx` (Q48–Q70) is converted and is the reference
implementation. Read it before converting anything else.

### Drop the source's own headings

Fumadocs renders the page `<h1>` from the frontmatter `title`. It does not read
the body for a heading. A heading in the body that repeats the title renders
twice.

Each source bank is one document containing many sections:

```
# Senior Java Interview Question Bank      <- document title, line 1
**142 questions with model answers...**    <- document blurb
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

Do not assume a section needs edits — or that it doesn't. Measured so far:

- Concurrency (Q48–Q70) — **0** bare hits; every `<pid>` and generic was already
  ticked or fenced.
- JVM, Memory & GC (Q71–Q86) — **1**: `recovering <2% of heap` in Q77, fixed as
  `&lt;2%`.
- Modern Java (Q87–Q97) — **0**.

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

407 questions across 29 pages is a small index — this should not need tuning.

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

Done so far: **14 of ~19** — six Java (`e432116`), eight data (`e17caa8`). The
five design diagrams are outstanding.

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

Content first. Do not build features against three pages.

- ~~Collapsible answers (self-test mode)~~ — built, with page-level expand-all
- ~~Search across everything~~ — built, see **Search** above
- `localStorage` progress: mark a concept page reviewed, with a date
- Concept dependency graph as a study path
- Self-check questions collapsed by default

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
