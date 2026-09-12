# Java Study Library

A personal study library for backend Java, data systems and software design —
built to develop senior/lead-level depth, not to memorise interview answers.

It contains two kinds of material:

- **Reference questions** (419) — question, model answer, why it matters, and
  follow-ups. Optimised for recall and self-testing.
- **Concept pages** (34) — deep-study material on the load-bearing ideas,
  each explaining 5–15 of the reference questions. These open with a failure you
  can reproduce, explain why the mechanism was designed that way, and end with a
  lab you run and self-check questions you can't answer from memory alone.

The premise is that a small number of deeply understood mechanisms generate
correct answers to a large number of questions. The Java Memory Model explains
volatile, safe publication, double-checked locking and final field semantics.
MVCC explains vacuum, bloat, long transactions and index-only scans. Those get
concept pages; the rest stay as reference.

## Three ways in

The sidebar orders the concept pages by subject, which assumes you already know
which subject you are in. Two other indexes do not.

- **The study path** (`/docs/concepts`) — all 34 concept pages arranged by
  dependency rather than by subject: ten roots with no prerequisites, and the
  run-up each other page needs. Derived from frontmatter, so it cannot drift
  from the pages it describes.
- **By symptom** (`/docs/concepts/symptoms`) — 31 failures written as you
  actually observe them, in five groups from *In an incident* to *In the
  organisation*, each pointing at the pages that explain it. The way in when
  you are holding a p99 graph and do not yet know what you are looking at.

## Coverage

| Area | Questions |
|---|---|
| Java — language, collections, concurrency, JVM, Spring, JPA, modern Java through 25 | 154 |
| Data & messaging — PostgreSQL, Redis, RabbitMQ, Kafka | 145 |
| Design & architecture — OOP, SOLID, patterns, DDD, microservices | 120 |

419 questions across 30 reference pages, plus 34 concept pages deep-diving the
mechanisms behind them.

## Running it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

```bash
pnpm build      # production build
```

## Structure

```
_source/            raw markdown source for the question banks (not built)
content/docs/       MDX — reference Q&A and concept pages
src/
  app/              routes; app/docs is the library, app/api/search the index
  components/       Question, FollowUp, Mermaid, SelfCheck, StudyPath, SymptomIndex
  lib/              source.ts (content source adapter), graph.ts, symptoms.ts
CLAUDE.md           project conventions — read this before contributing
```

Built with [Fumadocs](https://fumadocs.dev) on Next.js.

## Status

The reference conversion is complete — all 419 questions across 30 pages.
Both concept tiers are closed: 34 pages, 13 foundational and 21 core,
claiming 154 of the 419 questions. That coverage is deliberately partial — a
page exists for a mechanism, not to cover a section. The `leading/` track
(essays on technical leadership) is scaffolded but intentionally empty —
those pages have to come from real experience rather than be generated.

## Licence

This repository is dual-licensed, because it is mostly prose with a little code
around it.

- **Code** — everything under `src/`, plus configuration files — is licensed
  under the [MIT License](LICENSE).
- **Content** — everything under `content/` and `_source/` — is licensed under
  [CC BY-NC-SA 4.0](LICENSE-CONTENT).

In short: use the code however you like. The study material is free to share
and adapt with attribution, for non-commercial purposes, under the same terms.

## A note on accuracy

This is a personal study resource, written to be correct but not peer-reviewed.
If you find something wrong, an issue or a pull request is welcome — corrections
are more useful to me than stars.
