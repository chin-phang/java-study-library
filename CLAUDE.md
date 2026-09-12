# Java Lead Study Library — Project Conventions

## What this project is

A personal study library for developing senior/lead-level depth in backend Java,
the data systems around it, and software design. Interview preparation is a
**by-product**, not the goal. The goal is judgement: being the person on a team
who can settle a technical argument with reasoning and evidence.

Built on **Fumadocs** (Next.js App Router), deployed to Vercel. Static, no auth,
no database.

## Current state

Measured 2026-09-12. **Re-measure before quoting any of these** — see
**Re-measuring** below. Do not update a number here from memory.

| | |
|---|---|
| Reference pages | 30 (java 12, data 8, design 10) |
| Reference questions | 419, with 295 follow-ups |
| Concept pages | 34 — 13 foundational, 21 core. **Both tiers closed.** |
| Questions claimed by a concept page | 154 of 419 (36.8%) |
| Diagrams | 46 — 19 reference, 26 concept, 1 on the study-path index |
| Self-check items | 265 |
| Leadership essays | 10 stubs, **zero prose** — user-written, see below |
| Graph | 32 `prerequisites` edges, 21 `unlocks`, 10 roots, 0 unresolved |
| Symptom index | 31 symptoms in 5 groups, reaching all 34 concept pages |

**What is left.** Every tier that was committed to is written. Remaining work is
optional and nothing is promised:

- the ten `leading/` essays — **user-written, not Claude Code's to fill in**
- `localStorage` progress ("mark reviewed, with a date") — the last unbuilt item
  on the study-features list
- Specialist concept pages — a roadmap of names, not a backlog. See
  **The Specialist roadmap**.

Out of scope: accounts, sync, spaced-repetition scheduling, a backend.

## Stack and tooling

**Fumadocs moves quickly.** Do not write setup code from memory or from a blog
post. Read https://fumadocs.dev/docs before configuring search, MDX, or the
source adapter.

| Package | Version |
|---|---|
| next | 16.3.4 |
| react | 19.2.8 |
| fumadocs-core | 16.15.8 |
| fumadocs-mdx | 15.4.0 |
| fumadocs-ui | `npm:@fumadocs/base-ui@16.15.8` |
| typescript | ^7.0.2 |
| mermaid | 11.17.2 |

Record changes here when you upgrade.

- `fumadocs-ui` is aliased to the Base UI variant; imports stay `fumadocs-ui/*`.
- Next 16 means request middleware is `proxy.ts` at the root, not `middleware.ts`.
- OG image generation **is** enabled — `getPageImageUrl()` in `src/lib/source.ts`
  depends on the `og/docs` route. Do not remove it.
- `next-themes` is **not** a dependency and must not become one. `Mermaid.tsx`
  takes `useTheme` from `fumadocs-ui/provider/base`, which re-exports it;
  `next-themes` is not resolvable under pnpm's strict layout.

**Verification: `pnpm types:check`** (`next typegen && tsc --noEmit`) after every
file — faster and stricter than `next build`. `pnpm build` before every commit.

### pnpm on this machine

pnpm 12.3.4 lives at `%PNPM_HOME%\bin` (`C:\Users\admin\AppData\Local\pnpm`),
matching the pinned `packageManager`. A shell started before those environment
variables were set will not see it — `%PNPM_HOME%\bin` is a `REG_EXPAND_SZ`
reference that expands to nothing without `PNPM_HOME`.

**Run `pnpm` from PowerShell, where it is already on `PATH`.** The Windows path
with backslashes does not survive the Bash tool's own pnpm shim. To fix a fresh
shell:

```bash
export PNPM_HOME="C:\Users\admin\AppData\Local\pnpm" && export PATH="$PNPM_HOME/bin:$PATH"
```

**Never reach for `corepack`.** `corepack pnpm` runs without `PNPM_HOME`,
resolves a different store path, and pnpm then wipes and relinks `node_modules`
to reconcile. On Windows that wipe hits file locks, fails half-way, and leaves
the directory unusable. `.claude/launch.json` calls `pnpm` directly for the same
reason — check that entry first if the Browser pane's dev server ever stops
starting.

**Stop the dev server before any `pnpm install` / `pnpm add`.** Next holds file
handles under `node_modules`, so the relink fails with
`ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR ... Access is denied`.

**Reading PowerShell output:** it wraps a native command's stderr as a red
`NativeCommandError` even on success. For `pnpm types:check` the pass signal is
`✓ Types generated successfully` followed by no `tsc` output — not the absence
of red text.

## The two content types

This distinction drives everything. Do not blur it.

**Reference questions (419).** Optimised for recall — claim, mechanism,
trade-off. Their job is fast lookup and self-testing. Conversion from `_source/`
is **structural only**; the answer text is not rewritten. No reference file
contains any linking markup — the links are derived (see **Bidirectional
linking**).

**Concept pages (34).** Deep-study pages on the load-bearing ideas, written to
build a mental model rather than to be recited. One concept page typically
explains 5–15 reference questions.

**Do not expand questions into concept pages.** The tiering is the point: a small
number of deeply understood mechanisms generate correct answers to a large number
of questions. A page exists for a *mechanism*, not to cover a section.

**36.8% coverage is supposed to be low.** Do not treat it as a backlog and do not
raise it by writing pages that restate questions. The useful question is never
"which questions are unclaimed" but **"which load-bearing mechanism has no
page"**. Two thin sections are deliberate and should not be "fixed":

- **`design/design-patterns`** — 16 of 19 unclaimed. Mostly recall by nature;
  "Adapter vs Facade vs Proxy" is a distinction to memorise with no mechanism
  underneath. The part that had one went to `expression-problem`. The rest, on
  what patterns are for and when to remove one, is judgement and belongs in
  `leading/`.
- **`java/testing-practice`** — 9 questions, zero claimed. Q138–Q142 are
  verbatim the leadership-track topics and **must be user-written**. Only
  Q134–Q137 suit a concept page, and that is `testing-strategy`, a Specialist
  name already fixed.

## Repository layout

Code under `src/`, content at the repository root.

```
CLAUDE.md
README.md
LICENSE                            # MIT — code
LICENSE-CONTENT                    # CC BY-NC-SA 4.0 — content
_source/                           # raw markdown + concept drafts, excluded from the build
content/docs/                      # MDX — NOT under src/
  meta.json                        # navigation (root: true)
  index.mdx
  concepts/                        # index.mdx (study path), symptoms.mdx, 34 pages
  java/ data/ design/              # reference Q&A
  leading/                         # 10 stubs, user-written
proxy.ts                           # Next 16 middleware
source.config.ts                   # global MDX options ONLY (mermaid) — no collections
src/
  app/
    docs/[[...slug]]/page.tsx      # the library
    api/search/route.ts            # search index
    og/docs/[...slug]/             # OG images (enabled)
    llms.txt/ llms-full.txt/ llms.mdx/docs/[[...slug]]/
  components/
    mdx.tsx                        # getMDXComponents() — register components HERE
    Question.tsx FollowUp.tsx Mermaid.tsx SelfCheck.tsx
    RelatedQuestions.tsx StudyPath.tsx ConceptPath.tsx SymptomIndex.tsx
  lib/
    source.ts                      # defineDocs macro + loader()
    schema.ts                      # frontmatter Standard Schema
    graph.ts                       # concept dependency graph
    symptoms.ts                    # the symptom index's copy
    shared.ts layout.shared.tsx cn.ts
```

**Three layout facts that contradict most tutorials:**

- Content collections are defined with the **Macro API in `src/lib/source.ts`**,
  not in `source.config.ts`. See https://fumadocs.dev/docs/mdx/macro.
- `source.config.ts` exists but holds **global MDX options only** — it registers
  `remarkMdxMermaid`. This cannot be a collection-level `mdxOptions`, because
  that **replaces** the default plugin set and would drop the plugins building
  `toc` and `structuredData`, silently breaking the ToC and search.
- There is **no `src/mdx-components.tsx`**. Do not create one; nothing imports
  it. `page.tsx` imports `getMDXComponents` from `@/components/mdx`. Adding a
  component means adding it to the object that function returns.

Content stays at the root because Fumadocs' defaults assume `content/docs`.
Navigation is `meta.json` (not Nextra's `_meta.ts`), and every `pages` list is
**explicit** — a page left out builds fine and is silently missing from the
sidebar.

The concept sidebar is **grouped by subject**: a `"---Name---"` entry in `pages`
renders as a group heading (`fumadocs-core` parses `^---(?:\[icon])?(?<name>.+)---`),
so the pages stay one flat list at no cost in folders or file moves. The seven
groups, in order: Language & types, JVM runtime, Concurrency, Relational data,
Distributed data & messaging, Spring & persistence, Design & organisation. **Add
a new page deliberately, under the right heading** — one added after the wrong
separator lands silently in the wrong group.

**Do not try to derive the grouping from `questions:`.** The obvious automation —
group by the plurality track of the claimed anchors — agrees for about thirty of
the thirty-four and misplaces exactly the interesting ones: `persistence-context`
is java-heavy but a data page, `expression-problem` is design-heavy but a
language page. The grouping is a judgement; keep it by hand.

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
prerequisites: [mvcc]
unlocks: [cas-and-contention]
questions: [java/concurrency#q48, java/concurrency#q49]
estimatedStudyTime: 3h
---
```

**Why this needed a schema.** fumadocs' `pageSchema` is a Zod object with
`$strip`: every key it does not declare — `concept`, `tier`, `prerequisites`,
`unlocks`, `questions` — is discarded before reaching `page.data`. That is why
the fields looked inert. `src/lib/schema.ts` replaces it with a hand-written
Standard Schema that preserves unknown keys. It is hand-written rather than
`pageSchema.extend()` because extending needs `zod`, which pnpm's strict layout
does not expose. **Do not reach for zod to add a frontmatter field** — add it to
`DocFrontmatter` in `schema.ts`.

### Gotchas

**Quote any title containing a colon.** `title: Virtual threads: continuations`
is a YAML parse error or a silent misparse. Write
`title: "Virtual threads: continuations, mounting, pinning"`.

**Validate `questions:` against real anchors** rather than trusting them — see
**Re-measuring**.

## The dependency graph

`prerequisites`/`unlocks` build a graph rendered as a study path. Both fields
are **link lists of written pages**. Both must resolve.

- **`unlocks` — the pages that come next**, once this page is understood. Not a
  list of topics this page covers; those are its own sections. The JMM page
  originally listed `volatile` and `safe-publication` here, which are §3 and §5
  *of that page* — the wrong meaning.
- **`prerequisites` — what to read first.** If it is not written yet, use
  `prerequisites: []` and add the edge when the page lands.
- **`prerequisites: []` is legitimate** — some concepts are genuine roots. Do not
  invent a parent to avoid an empty list. Ten pages are roots.
- **`unlocks: []` is legitimate and common** — 20 of the 34 pages carry it,
  because everything they would point at is unwritten. That is correct, not a
  missing edge.
- **A page with `unlocks: []` is not a dead end.** `ConceptPath`'s "Read next" is
  the *union* of a page's `unlocks` and every page naming it as a prerequisite.
  `hashmap` declares `unlocks: []` and still shows `partitioning`, because
  `partitioning` declares `hashmap`. Reach for that union before reaching for a
  new edge.
- The two fields are **not required to mirror each other**, and mostly do (16 of
  the 32 resolving `prerequisites` edges have a matching `unlocks`). The five
  that do not are the interesting ones — a page promising a successor that does
  not consider it a prerequisite.

> **`unlocks` used to double as a roadmap** and was allowed to name unwritten
> pages. That was reversed 2026-09-12 and 84 such promises were stripped. **Do
> not reintroduce one.** Specialist names live in **The Specialist roadmap**,
> which is where a roadmap belongs; adding a name there costs nothing.

**The renderer must not assume either field resolves.** An unresolved entry in
either field, and a prerequisite cycle, each render as a visible drift block —
never throw, never silently drop a node, never render as a working link.
`stageOf()` carries a `walking` stack and treats a back edge as contributing
nothing, so a cycle degrades to a warning rather than a stack overflow. All three
checks are empty today; all three read hand-typed frontmatter, which is why they
exist.

### The study path

Four files, all derived from frontmatter — nothing about the graph is
hand-maintained, so it cannot drift from the pages it describes.

| File | Does |
|---|---|
| `src/lib/graph.ts` | Builds and memoises the graph from `conceptPages()`. Exports `conceptGraph()`, `readingOrderTo()`, `dependantsOf()`, `conceptNodeFor()`, `parseStudyTime()`/`formatStudyTime()`. |
| `src/components/StudyPath.tsx` | The whole graph. Registered in `mdx.tsx`, no props. |
| `src/components/ConceptPath.tsx` | One page's slice. Rendered from `page.tsx`, so no concept page can forget it. |
| `content/docs/concepts/index.mdx` | The page, at `/docs/concepts`. |

**`conceptGraph()` is the whole API** — nodes, `stages`, `danglingPrerequisites`,
`unresolvedUnlocks`, `cycles`. Any future check on the graph (a lint, a CI step)
should call it rather than re-parse frontmatter.

**Stages, not tiers.** A node sits one stage past its deepest prerequisite.
**A stage is a floor, not a queue** — stage 2 means *this page has a two-page
run-up*, not *read all of stage 1 first* — and both the page copy and the
component's comment say so, because the obvious misreading turns a 34-page graph
into a 34-page reading list.

**`tier:` is deliberately not rendered.** It was shown as a badge until
2026-09-12, where it read as a claim about depth that the graph contradicts:
foundational `bounded-contexts` sits at stage 2 while core `stream-pipelines` is
a root. Tier records the *writing queue*, which is a fact about this file, not
about the page a reader is holding. Keep it in frontmatter; do not put it back on
the page.

**`reach` replaced it** — the transitive count of pages with this one behind
them, computed from the same edges and rendered as *"11 pages build on this"*.
Eighteen of the 34 have a reach of 0 and show no badge; that is a leaf, not a
defect.

**`ConceptPath`'s "Read first" is the transitive closure, not the declared
parents** — the declared list is one hop, and the useful question is what the
whole run-up costs. **Placement is deliberate:** `ConceptPath` sits at the *foot*
of a concept page. Prerequisites are more useful before reading, but a concept
page opens with the failure it exists to explain, and burying that opener under a
navigation box costs more than the box gains.

### Bidirectional linking

**One declaration drives both directions**, so they cannot drift:

- **Forward** — `RelatedQuestions` renders the `questions:` list as links, from
  `src/app/docs/[[...slug]]/page.tsx` rather than from MDX, so a concept page
  cannot forget it. An anchor that does not resolve renders visibly as
  `broken reference: …` instead of silently vanishing.
- **Reverse** — `conceptsForPage()` inverts every concept page's `questions:`
  list and passes the map through `QuestionsProvider`; `<Question>` renders "The
  model behind this answer" when its own `id` appears.

Add a concept page, declare its `questions:`, and both directions appear.
**Write nothing on the reference side.**

**A question may be claimed by more than one concept page**, and this works —
fourteen are, and two (`java/jvm-memory-gc#q80`, `java/streams#q47`) are claimed
three times. Nothing needs declaring; do not try to make a question "belong" to
one page. A cosmetic nit follows: the block reads "The model behind this
**answer**" (singular) above a list of two. Copy lives in `Question.tsx`. Left
alone deliberately.

**Claim only what the page actually teaches.** Two drafts claimed a question
whose mechanism they only mentioned in passing (`locking-and-deadlock` on AQS,
`class-loading` on the AOT cache); both were dropped at conversion and became
prose cross-references instead. A wrong claim is cheap to catch before writing
and invisible afterwards.

Anchors are validated per track, and the per-bank numbering restart does not
bite: `#q3` under `data/modelling-indexing` resolves to the data bank's Q3.

> **Measuring reverse links: use `textContent`, not `innerText`.** A reverse link
> lives inside a `<Question>`, which is collapsed by default, so
> `document.body.innerText` reports **zero** on a page rendering them correctly.
> Scope the scan to each `h2[id^=q]` up to the next one and read `textContent` —
> anything looser matches a neighbouring question's block and reports the wrong
> claiming page.

## The symptom index

`/docs/concepts/symptoms` — a third way in, and the only one matching how a
reader actually arrives. The sidebar orders by subject and `/docs/concepts` by
dependency; both assume you already know which subject you are in. You do not,
when you are holding a p99 graph.

| File | Does |
|---|---|
| `src/lib/symptoms.ts` | The copy. 31 symptoms in five groups — In an incident, In the data, Across a service boundary, In the code, In the organisation — each with a `note` and an ordered `pages` list of concept slugs. |
| `src/components/SymptomIndex.tsx` | Renders it, resolving every slug against `conceptGraph()`. Registered in `mdx.tsx`, no props. |
| `content/docs/concepts/symptoms.mdx` | Prose, then `<SymptomIndex />`. |

Rules for adding or editing an entry:

- **Every symptom is an existing page's §1 restated as an observation.** The page
  pattern opens on a concrete failure, so the failures are already written.
  Nothing here invents a scenario.
- **The `note` line is the deliverable, not the links.** It says what the failure
  looks like and what it is not — *"the planner is doing the arithmetic
  correctly"*, *"exit 137 is the kernel, not the JVM"*. Strip those and this is a
  worse sidebar.
- **Order within a symptom is a claim**: the first page is the likeliest
  mechanism, the rest produce the same observation by another route. That is what
  a subject index cannot express.
- **One observation per entry.** Two unrelated causes joined by "or" belong in
  two entries — unless it is *one message* with two causes, which is the point of
  `ClassCastException in a method you never wrote`.
- **It must be a symptom.** "You need every change that happened" is a
  requirement, not something you observe. Reframe it as what you see.
- **Do not use "selectivity" unqualified anywhere outside `btrees-selectivity`.**
  Different sources use it in opposite senses; that page uses it as the fraction
  of rows matched, and a note written in the other sense was backwards.

**It is the only hand-maintained index in the library** — the sidebar is a list
of real files and the graph is derived from frontmatter, but a slug here is
checked by nothing at compile time. So it checks both directions of drift and
renders each visibly: a slug naming no page (a defect), and a concept page no
symptom reaches (not necessarily a defect — a page can be worth reading with no
failure that announces it). Both are empty today. The second fires first:
**adding a concept page means adding a symptom, or deciding deliberately that it
has none**, and that block tells you which happened.

## Concept page structure

The reference implementation is `content/docs/concepts/jmm.mdx` (drafted as
`_source/java-memory-model-concept-page.md`). Every concept page follows its
section pattern:

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
   "why does X break Y" over "what is X".

Sections 6 and 7 are what distinguish this library from the reference Q&A. If a
page is missing either, it isn't finished.

**Section numbers are a pattern, not a template** — the middle expands with the
subject. Pages run 9–12 sections and 1,900–4,600 words. The last four are always
Lab, Leading on this, Where to go deeper, Self-check; **that tail is the part to
hold fixed**. The self-check range is 5–8 and the measured spread is 6–8 — the
range is the spec, not the mode. Do not pad a 7-item page to 8.

**Look for the mechanism before concluding there isn't one.** `conways-law` and
`microservices-org` were both held back as "essays rather than mechanism pages",
and both turned out to have one — coordination cost, and the
conditional-benefit/unconditional-cost asymmetry. Carry that into any future page
that looks like an essay.

### Currency is part of writing a page

Every page written or converted after 2026-09-12 had its version-pinned claims
checked against primary sources, and most needed at least one fix. The failure
modes seen, worth checking for by name:

- **A stale tool recommendation.** Structure101 was acquired and no longer exists
  standalone; JDepend is unmaintained; Google's Service Weaver is archived. **A
  tool still widely cited as current is the commonest staleness in this corpus.**
  If naming a product would date the page for no gain, do not name one.
- **A superseded JEP number**, or a preview that has since finalised, moved, or
  re-previewed unchanged. State the current status rather than guessing at a
  moving target, and say "preview"/"beta"/"alpha" when that is what it is.
- **A floating or stale `docker run` tag.** The corpus pins `postgres:18`,
  `rabbitmq:4.3-management`, `apache/kafka:4.0.0`, `redis:7`. Match them.
- **A lab step that errors rather than merely ages** — one draft shipped
  `SET enable_indexskipscan = off`, a GUC that does not exist. Run the lab step,
  or at least check the option list it belongs to.
- **A feature renamed** (Oracle's cardinality feedback → statistics feedback).
- **A citation that does not exist.** Check editions and report years rather than
  assuming the next one shipped.
- **A statistic half-remembered.** Check figures digit by digit against the
  paper's own table, not against a summary of it.
- **An SEO aggregator repeating a claim the primary source does not make.**
  Discard it and attribute to whoever actually said it.
- **A widely repeated misreading of a primary source.** Amazon's Prime Video post
  is one team moving one monitoring component and is not an organisational
  argument at all; `pg_wal_replay_wait()` is written about as a PostgreSQL 18
  feature and was reverted. Read the source, not the commentary.

### Diagram rules for a concept page

**A concept page links to a reference diagram, it does not copy it.** Two copies
of one mermaid source in two files drift and nothing checks them. If the picture
already exists on a reference answer, add a linking sentence. If the page
genuinely needs its own, it must show something the reference bank does not — an
adjacent mechanism, a worked failure trace, a lab's failure mode.

Six pages link rather than draw (`jmm`, `jvm-memory`, `dependency-inversion`,
`isolation-levels`, `spring-proxy`, `aggregates`) and three carry no diagram at
all, because prose and tables already carry the mechanism (`cas-and-contention`,
`cache-invalidation`, `backpressure`). Both are fine outcomes. `virtual-threads`
does both — it links to `java/concurrency#q62` for mount/unmount and draws its
own for cancellation propagation, which is the shape to aim for when only half
the picture already exists. **Check the claimed anchors for an existing diagram
before drawing one.**

## The Question component

`Question.tsx`, `FollowUp.tsx`, `Mermaid.tsx`, `SelfCheck.tsx`,
`RelatedQuestions.tsx`, `StudyPath.tsx`, `ConceptPath.tsx` and `SymptomIndex.tsx`
are registered in **`src/components/mdx.tsx`** — the scaffold's
`getMDXComponents()` — so MDX files need no imports.

`QuestionsProvider` (exported from `Question.tsx`) wraps `<DocsBody>` in
`page.tsx` and supplies the page-level expand-all control, counting questions but
not their nested follow-ups. MDX needs no boilerplate for it.

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

**Do not put the question text in a `title` prop.** That was built, tested and
rejected — measured on a real page, it failed four ways:

- the ToC is extracted from MDAST at build time, so an `<h3>` rendered by a React
  component never reaches it — every question was missing from "On this page";
- `structuredData` does not index JSX attributes, so searching a question's own
  words returned nothing;
- content inside the component inherited no heading anchor, so search hits linked
  to the top of the page rather than to `#q48`;
- a JSX string attribute cannot carry inline code, and most question titles
  contain some.

`title` survives as an optional prop for a question with no heading of its own.

Requirements, all verified against `content/docs/java/concurrency.mdx`:

- `[#q48]` on the heading sets the anchor. Lowercase. Keep `<Question id>`
  matching it — that is what expands the answer when the page is opened on that
  anchor.
- Answers collapsed by default. Deep-linking expands that one answer and scrolls
  to it; the scroll retries after hydration, because Next restores scroll
  position and would otherwise pull the page back to the top.
- `FollowUp`'s `q` is a plain string. Backtick spans in it are rendered as
  `<code>` by the component — **and nothing else is**, it is deliberately not a
  markdown parser. A `q` containing a double quote must be an expression:
  `q={"What's a \"start gate\" test?"}`.
- Do not wrap the answer body in `not-prose` or `prose-no-margin`. Both strip
  paragraph margins and turn a four-paragraph answer into a wall of text.

### Self-check

**`<Question>` deliberately does not fit.** It hides an *answer*; a self-check
prompt has no answer by design. **Do not put self-check answers on the page.**

`<SelfCheck>` / `<SelfCheckItem>` hide the *pointer* instead: which section
builds the model being tested.

```mdx
<SelfCheck>

<SelfCheckItem n={1} where="§3 The piggyback effect.">

Which specific reordering breaks the guarantee, and which edge does it destroy?

</SelfCheckItem>

</SelfCheck>
```

- `where` is **navigation — a section name, never an answer** — and it is
  optional. Without it the item is a numbered question with no toggle, which is a
  perfectly good self-check.
- Writing a pointer is a judgement about which section answers which question.
  Several turn out to be answered by a *different* section than the obvious one,
  and those are the pointers worth having: a question whose mechanism is in one
  section but whose remedy is in **Leading on this** needs both; a section with
  several bolded sub-parts is better named by the sub-part than the whole
  (`"§3 Write-ahead logging, the checkpoint trade-off"`).
- **`where` is rendered as plain text, not markdown.** Strip backticks and
  emphasis from the heading you are pointing at: `### 3. Why \`RSS\` and heap
  usage diverge` becomes `§3 Why RSS and heap usage diverge.` Characters like `*`
  and `_` are safe verbatim when part of a real name (`count(*)`) precisely
  because there is no parser to trip. A lint flagging them is a false positive.
- **The inverse holds for the children.** The question body *is* parsed as
  markdown, so emphasis, backticks and double quotes render as intended and need
  no escaping. The `FollowUp` `q` escaping rule does not apply.
- `SelfCheckItem` reuses `useCollapsible` from `Question.tsx`, so items with a
  `where` count towards the page-level expand-all control — which is what makes
  that control appear on concept pages, having no `<Question>` of their own.

`RelatedQuestions` needs no markup at all. Do not place it in MDX.

### Search — passed, do not re-litigate

Fumadocs builds its search index from `structuredData` extracted from the MDX
source, not from rendered HTML. **Verified:** a phrase appearing only inside a
collapsed `<Question>` answer, and one only inside a collapsed `<FollowUp>`, are
both returned by `/api/search`. Collapse behaviour does not affect indexing.
Re-run only if the components are restructured.

The search route is `src/app/api/search/route.ts` using
`createFromSource(source)`. The built-in engine is **ZBSearch** (it moved off
`@orama/orama` in 2026), so any snippet older than a few months is suspect. 419
questions across 30 pages is a small index and should not need tuning.

## Conversion rules

All 30 reference sections and all 34 concept pages are converted. **This section
is reference, not a task list** — read it before touching a converted file, or if
a source bank is ever extended.

### Source material

All in `_source/`, excluded from the build.

| Bank | Questions | Track |
|---|---|---|
| `senior-java-interview-questions.md` | 154 | `java/` (12 files) |
| `senior-data-messaging-interview-questions.md` | 145 | `data/` (8 files) |
| `senior-design-architecture-interview-questions.md` | 120 | `design/` (10 files) |

**The section-to-file mapping is recoverable, not recorded here.** Which file
holds a given question is in the frontmatter — all 30 reference pages carry
`questionRange` (`grep -rn questionRange content/docs/java`). Which source
section a file came from: `grep -n '^## [0-9]' <bank>`, and the frontmatter
`title` is that heading verbatim with its `N. ` prefix stripped. **Do not
paraphrase a section name** — an earlier version of this file did, and the names
silently stopped matching the files.

Question numbering **restarts per bank**, so anchor IDs are scoped by file
(`/design/ddd#q46`, never a global `#q46`).

Every question in every source follows the same shape:

```
### Q12. Question text
**Answer.** ...
**Why it matters.** ...            <- most, not all
**Follow-up: <question text>?**
<answer paragraph>                  <- 0 to 3 per question
```

**Do not rewrite, summarise or "improve" answer text.** If a source passage seems
wrong, flag it in the commit message rather than silently editing it.

The `_source/*.mdx` concept drafts are the **writing baseline, not a live
mirror**. Diagrams and self-check markup were added at conversion and exist only
in `content/docs/concepts/`. Nothing checks the two against each other; do not
assume a draft is current.

### Drop the source's own headings

Fumadocs renders the page `<h1>` from the frontmatter `title` and does not read
the body for a heading. Converting a section, **do not copy**:

- the bank's `# ...` H1 — it belongs to the document
- the document blurb and `## Contents` list — its anchors point at a document
  that no longer exists, and Fumadocs generates a ToC automatically
- the `## 5. Concurrency` line itself — it becomes the frontmatter `title`, with
  the numeric prefix stripped

The first body content is the first question heading. Nothing above it.

### Heading levels, anchors and separators

The source's `### QN.` headings become `##`, not `###`. They sat beneath a
`## 5. Concurrency` that the conversion moves into frontmatter, so keeping `###`
skips a level (h1 → h3) and renders the ToC as indented orphans.

Keep the `QN.` prefix — the ToC and search results then identify themselves by
number, which is how the banks cross-reference each other. Append the anchor:

```
### Q48. Explain the Java Memory Model and happens-before.          <- source
## Q48. Explain the Java Memory Model and happens-before. [#q48]    <- MDX
```

Drop the `---` separators between questions; the `<Question>` card border does
that job and they would render as stray `<hr>`s.

### Prefix every internal link with `/docs`

`src/lib/source.ts` sets `baseUrl: /docs`. A link written without the prefix
404s:

```
[Q48](/java/concurrency#q48)         WRONG
[Q48](/docs/java/concurrency#q48)    correct
```

Anchors are lowercase. Consider `createRelativeLink` from `fumadocs-ui/mdx`
(already imported in `page.tsx`) if you prefer paths validated at build time over
absolute ones that fail silently.

### Extending a bank: append, never insert

**New questions go in a new trailing section with the next free numbers,
immediately before `## Closing notes`.**

The temptation is to file new material in the section where it belongs
topically. Do not. Inserting at Q98 renumbers 45 questions across five MDX files,
and every `[#qNN]` anchor, every `questions:` entry pointing into them, and every
prose cross-reference breaks silently. **Anchors are the library's only stable
identifiers; renumbering is not a refactor, it is a break of every inbound link.**

The cost is that a topic can span two non-adjacent sections and two files. That
is the correct trade — section 7 keeps its `(8 → 21)` title, which stays accurate
for what it contains.

Extending a bank means updating, in the source file: the question count in the
blurb, the `## Contents` list, and the new `## N.` heading. Then here: the bank
table and the **Current state** counts. Then `content/docs/<track>/meta.json`,
whose `pages` list is explicit.

## MDX gotchas

MDX parses `<` and `{` as JSX, so `List<String>`, `Map<K,V>`, `<2%` and
`N < 100` in bare prose all break the build.

**Two kinds of hit, two different fixes.** Choose by what the text *is*:

| In the source | Fix | Why |
|---|---|---|
| A code identifier — `List<String>`, `<pid>` | backtick it | it *is* code; monospace is correct |
| A comparison in prose — `<2%`, `N < 100` | write `&lt;` | it is prose; a backtick would restyle the author's sentence |

`&lt;` renders as a literal `<`, so the page reads exactly as the source does.
Backticking a prose comparison quietly violates "structural only". Both are
formatting changes — flag either in the commit message.

**Measured across all 419 questions: exactly one bare `<`** (`recovering <2% of
heap`, java Q77). Every other angle bracket was already fenced or backticked.
Keep the check for new material, do not budget time for it, and **never "fix"
text that is already backticked.**

## Diagrams

Fumadocs does **not** render Mermaid natively. `remarkMdxMermaid` (registered in
`source.config.ts`) rewrites fenced mermaid blocks into `<Mermaid chart="..." />`
before Shiki sees them, and `src/components/Mermaid.tsx` renders them
client-side. Write fenced mermaid blocks; no imports, no JSX.

### Placement

Put each diagram **inside the `<Question>` it illustrates, immediately after the
paragraph it supports** — not at the end of the answer, not before the prose that
explains it. If the mechanism is explained in a `<FollowUp>`, the diagram belongs
in the follow-up.

Fenced blocks work inside JSX children, including a `<FollowUp>` nested in a
`<Question>` — `remarkMdxMermaid` traverses into them. Blank lines around the
fence are still required.

### Verifying — the build tells you nothing

Mermaid runs client-side, so **a syntax error is a blank diagram and a green
build**. `pnpm build` passing is not evidence. Open each one in the browser and
confirm an `svg[id^=mermaid]` exists with no "Syntax error" text.

- **Measure with an explicit viewport.** When the Browser pane is hidden the page
  layout collapses and *every* diagram measures `0x0`, which looks exactly like
  eight broken diagrams. Set a size first (`resize_window`), or check the SVG's
  own `viewBox` — a healthy diagram has a real one even when its
  `getBoundingClientRect()` is zero.
- **A diagram drafted in `_source/` cannot be verified where it sits**, because
  `_source` is outside `content/docs` and is never built. Extract it into a
  throwaway page under `content/docs`, add it to `meta.json`, render, check, then
  delete both. Three of ten drafts failed the phone test on the first pass and
  would have shipped unnoticed.
- **Use `getBoundingClientRect()` per `<text>`, not `getBBox()`**, to check for
  clipped or overlapping labels. Mermaid centres text with a transform, so every
  `getBBox()` comes back symmetric around zero and nothing ever looks clipped.

### Phone-readable, concretely

Top-to-bottom flow, ≤10 nodes, and four rules learned the hard way:

- **Fan-out of more than about three siblings renders landscape.** A node with
  five children lays them out in a row. Keep branching to two or three, or group
  the leaves in a subgraph.
- **Fitting the width is not the same as being readable.** Check the *scale*. One
  diagram fitted a 375px screen with no horizontal scroll — at 42%, with labels
  too small to read. Shortening participant and message labels fixed it.
  Screenshot at 375px and look; do not infer readability from dimensions.
- **Subgraph stacking with invisible links (`~~~`) plus short labels is the
  cheapest route to a full-scale diagram**, and costs nothing to reach for first.
  The diagrams rendering at 99–100% all use it or are a plain chain.
- **A subgraph band holding exactly one node collides its title with the incoming
  arrowhead.** Mermaid centres a subgraph title on the top edge and an edge into
  a lone child enters from directly above, through the text. There is no way to
  offset either. Two or more nodes per band is fine; one is not. Moving the band
  label into the node label (`isolation-levels<br/>stage 2`) fixes it *and*
  improves the scale, because the boxes were the widest thing in the picture.

A `sequenceDiagram` is legitimate where the point *is* a timeline — it is
inherently top-to-bottom. Keep participant labels short; participant count drives
the width.

**`quadrantChart` renders on a fixed 500×500 canvas** regardless of content, so
it never overflows (≈69% at 375px) — but long data-point labels are centred on
their point and run past the plot border if a point sits near x=0 or x=1. Keep
points inside ~0.75 and labels short. **Descriptive text in a quadrant label
cannot contain a colon** — that is invalid syntax and throws at render; put the
description on the data points instead.

**Measured scale at 375px**, worst first, for the shapes that recur:

| Scale | Shape |
|---|---|
| 50% | decision diamond beside a side branch; chain with a fan-out and a loop-back |
| 52–55% | three-sibling fan-out (landscape); three-way fan-out |
| 57–61% | stacked subgraphs of parallel chains; two-branch fork |
| 64–74% | plan tree; chain with one decision diamond; 2×2 quadrant; two disjoint chains |
| 99–100% | stacked subgraphs via `~~~`; plain top-to-bottom chain |

None overflows and the page body never scrolls horizontally. The 50–52% ones are
legible but the tightest in the library — the first place to look if the phone
pass is ever tightened.

### Diagrams break byte-identity

A file with diagrams is no longer byte-identical to its `_source` section, so a
conversion verifier will report a diff. That is expected. The answer prose must
still be untouched — only added fenced blocks may differ.

### Adding a diagram

**Add one only if it shows something the reference bank doesn't already**, and
check the claimed anchors first. The reference bank's 19 are complete; add more
only if a new concept page needs one. Do not add decorative ones.

## The leadership track

Section 9 of the design bank (Q96–Q107) and Q138–Q142 of `java/testing-practice`
cover this as reference Q&A. The `content/docs/leading/` track is separate,
longer-form, and **written by the user, not generated**. Claude Code scaffolds
and prompts with questions; the content must come from real experience or it will
read as generic.

Ten stubs exist, in this order in `content/docs/leading/meta.json`:
`setting-conventions`, `reviewing-for-design`, `one-way-doors`, `writing-an-adr`,
`running-an-incident`, `estimating-and-scope`, `growing-people`,
`technical-strategy`, `saying-no`, `the-boring-option`.

Each holds frontmatter, one prose line saying what the essay should cover, and a
`## Questions to answer` list of six prompts. **Nothing else — writing essay
prose into one of these is the failure mode this track exists to avoid.** Replace
the questions with the essay when you write it; they are scaffolding, not a
permanent section.

**The frontmatter is deliberately minimal: `title`, `description`, `tags`.** No
`concept:` and no `questions:`, and neither should be added to a stub:

- `page.tsx` derives `<ConceptPath>` from `conceptNodeFor(page.data)`, which is
  null without a `concept:` slug — so a stub renders no study-path box, and
  adding one would put an unwritten essay into the dependency graph.
- `questions:` drives **both** directions of the linking. Declaring it on a stub
  would make reference answers render "The model behind this answer" pointing at
  a page with no answer in it.

Cross-reference the reference bank from the essay's prose when it is written, not
from frontmatter.

**The questions are the deliverable, so they are written to resist a generic
answer.** Each set asks for one case that worked and one that did not, and at
least one asks the user to state their own test in a form another person could
apply without them in the room. The last two in every set ask what they got
wrong — that is where the non-generic material is. "How do you approach a code
review?" invites exactly the prose this track exists to avoid; "describe a
comment you left that you later regretted" does not.

`content/docs/index.mdx` describes the track as **scaffolding only — ten topics,
six questions each, no prose**, and says the questions are the page until they
are answered. Update that sentence when the first essay lands.

## The Specialist roadmap

**This list is the only place the Specialist roadmap lives.** Names are fixed
here so a later page cannot invent a second spelling; titles get decided when
someone writes the page. **Do not put any of these into an `unlocks`** — adding a
new Specialist name means adding a bullet here and nothing else.

Grouped by the page that would lead to them:

- **`generics-erasure`** — `collections-api-design`, `variance`, `reflection`, `serialisation-frameworks`
- **`hashmap`** — `concurrent-collections`, `equals-hashcode`, `collection-sizing`, `caching`
- **`jvm-memory`** — `gc-tuning`, `memory-leaks`, `off-heap-memory`
- **`generational-gc`** — `gc-tuning`, `latency-troubleshooting`, `memory-leaks`
- **`jit`** — `latency-troubleshooting`, `benchmarking`, `startup-optimisation`
- **`escape-analysis`** — `performance-tuning`, `value-types`
- **`class-loading`** — `java-agents`, `plugin-architecture`, `startup-optimisation`
- **`stream-pipelines`** — `custom-collectors`, `reactive-streams`, `spliterator-design`
- **`expression-problem`** — `data-oriented-programming`, `api-evolution`, `schema-evolution`
- **`cas-and-contention`** — `false-sharing`, `atomics`, `non-blocking-algorithms`
- **`thread-pools`** — `bulkheads`, `capacity-planning`, `cascading-failure`
- **`backpressure`** — `load-shedding`, `circuit-breakers`
- **`locking-and-deadlock`** — `distributed-locks`, `connection-pooling`, `retry-design`, `saga-pattern`
- **`btrees-selectivity`** — `composite-indexes`, `covering-indexes`
- **`query-planning`** — `statistics-tuning`, `plan-stability`, `composite-indexes`
- **`mvcc`** — `vacuum-and-bloat`, `long-transactions`, `replication-lag`, `write-skew`
- **`the-log`** — `replication`, `cdc-and-outbox`, `event-sourcing`, `crash-recovery`
- **`kafka-internals`** — `multi-region-replication`, `schema-evolution`
- **`consistency-models`** — `consensus-algorithms`, `replication-lag`, `multi-region-replication`
- **`cache-invalidation`** — `hot-keys`
- **`partitioning`** — `sharding`, `consistent-hashing`, `scaling-strategy`, `hot-keys`
- **`idempotency`** — `retries-and-backoff`, `outbox-pattern`, `saga-pattern`, `exactly-once`, `reconciliation`
- **`persistence-context`** — `n-plus-one`, `jpa-performance`, `optimistic-locking`, `cqrs`
- **`spring-proxy`** — `transaction-management`, `aop`, `spring-testing`, `caching-annotations`
- **`bounded-contexts`** — `service-decomposition`, `anti-corruption-layer`, `modular-monolith`, `event-design`
- **`dependency-inversion`** — `anti-corruption-layer`, `modular-monolith`, `hexagonal-architecture`, `testing-strategy`
- **`coupling-and-cohesion`** — `package-design`, `refactoring-strategy`, `architecture-fitness-functions`
- **`conways-law`** — `platform-engineering`
- **`microservices-org`** — `modular-monolith`, `platform-engineering`, `service-decomposition`

**Multiple pages promising one name is normal** — `saga-pattern`, `hot-keys`,
`modular-monolith` and others appear more than once. **A second spelling for one
page is not**: `service-extraction`/`service-decomposition`,
`caching-strategy`/`caching`, `reactive-comparison`/`reactive-streams` and
`optimistic-concurrency`/`optimistic-locking` were all caught as duplicates, and
`microservices-boundaries` was never a concept slug at all — it is the name of a
*reference page*. Check this list before inventing a name.

`retries-and-backoff` against `retry-design` is left as two names because both
were properly registered and they are arguably different pages. Decide when one
is written.

**Whoever writes `modular-monolith` should expect to share
`design/architecture-styles#q55` with `microservices-org`** rather than treat it
as taken.

## Re-measuring

Every count in **Current state** is derivable. Regenerate rather than trusting
prose — this file has been wrong about its own numbers before, in both
directions.

```python
# graph, claims and anchor validity, in one pass. Run from the repo root.
import re, glob, os, collections

def lists(y, k):
    m = re.search(r'^%s:\s*\[(.*?)\]' % k, y, re.M | re.S)
    return [x.strip() for x in m.group(1).split(',') if x.strip()] if m else []

fm = {}
for f in glob.glob('content/docs/concepts/*.mdx'):
    y = re.match(r'^---\n(.*?)\n---', open(f, encoding='utf-8').read(), re.S)
    if not y:
        continue
    y = y.group(1)
    c = re.search(r'^concept:\s*(\S+)', y, re.M)
    if not c:
        continue
    fm[c.group(1)] = dict(pre=lists(y, 'prerequisites'),
                          unl=lists(y, 'unlocks'),
                          q=lists(y, 'questions'))

real = set()
for f in glob.glob('content/docs/*/*.mdx'):
    track = f.replace(os.sep, '/').split('/')[2]
    page = os.path.basename(f)[:-4]
    for a in re.findall(r'\[#(q\d+)\]', open(f, encoding='utf-8').read()):
        real.add('%s/%s#%s' % (track, page, a))

claims = collections.Counter(q for v in fm.values() for q in v['q'])
print('pages', len(fm), 'anchors', len(real), 'claimed', len(claims))
print('prereq edges', sum(len(v['pre']) for v in fm.values()),
      'unlocks edges', sum(len(v['unl']) for v in fm.values()))
print('roots', sorted(s for s, v in fm.items() if not v['pre']))
print('dangling prereq', [(s, p) for s, v in fm.items() for p in v['pre'] if p not in fm])
print('unresolved unlocks', [(s, u) for s, v in fm.items() for u in v['unl'] if u not in fm])
print('invalid question refs', [q for q in claims if q not in real])
print('claimed by >1 page', {k: v for k, v in claims.items() if v > 1})
```

Counts from the shell:

````bash
grep -rho '\[#q[0-9]*\]' content/docs/java content/docs/data content/docs/design | wc -l   # questions
grep -rho '<FollowUp' content/docs | wc -l                                                 # follow-ups
grep -rho '<SelfCheckItem' content/docs | wc -l                                            # self-check items
grep -rc '^```mermaid' content/docs --include=*.mdx | grep -v ':0'                         # diagrams, per file
````

And the MDX hazard scan, ignoring anything already fenced or backticked:

```python
import re
fence = False
for i, l in enumerate(lines, 1):
    if l.lstrip().startswith('```'):
        fence = not fence
        continue
    if fence:
        continue
    if re.search(r'[<{]', re.sub(r'`[^`]*`', '', l)):
        print(i, l)
```

A concept page reached by no symptom, and a symptom naming no page, both render
as visible blocks on `/docs/concepts/symptoms` — read the page rather than
writing a script.

## Working agreement

- Reference Q&A conversion is **structural only**. Script it rather than
  retyping, then diff the result back against the source section and confirm the
  content lines are byte-identical. Retyping answers by hand introduces drift no
  build catches.
- Concept pages are new writing. Match the depth and voice of `jmm.mdx`. Do not
  pad to reach a length.
- Every concept page must have a runnable lab. If you cannot devise one, say so
  rather than inventing a fake exercise.
- **Check currency against primary sources before writing**, not after. See
  **Currency is part of writing a page**.
- Prefer primary sources in "go deeper": specifications, JEPs, named authors.
- Run `pnpm types:check` after every file and `pnpm build` before every commit.
  One commit per page.
- Commit format: `content(java): convert concurrency section`.
- Ask before adding any dependency beyond what the template ships. Added so far:
  `mermaid` (approved). `next-themes` was deliberately **not** added.
- Flag uncertainty explicitly. A page that confidently states something wrong is
  worse than no page — the user will repeat it in an interview.
