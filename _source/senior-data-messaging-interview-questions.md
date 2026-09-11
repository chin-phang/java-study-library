# Senior Data & Messaging Interview Question Bank

**145 questions on relational databases, Redis/caching, RabbitMQ and Kafka — with model answers, explanations and follow-ups.**

Companion to the Java bank. Same structure: the *Answer* is what you say out loud, *Why it matters* is the reasoning you need to survive being pushed, and the *Follow-ups* are what actually gets asked next.

Examples lean PostgreSQL with InnoDB noted where behaviour differs, because those are the two engines you're most likely to be asked about.

---

## Contents

1. [Data Modelling & Indexing](#1-data-modelling--indexing) (Q1–Q15)
2. [Query Performance & Execution Plans](#2-query-performance--execution-plans) (Q16–Q30)
3. [Transactions, Concurrency & MVCC](#3-transactions-concurrency--mvcc) (Q31–Q45)
4. [Scaling, Replication & Operations](#4-scaling-replication--operations) (Q46–Q60)
5. [Redis & Caching](#5-redis--caching) (Q61–Q85)
6. [RabbitMQ](#6-rabbitmq) (Q86–Q105)
7. [Kafka](#7-kafka) (Q106–Q135)
8. [Cross-Cutting Design Questions](#8-cross-cutting-design-questions) (Q136–Q145)

---

## 1. Data Modelling & Indexing

### Q1. When do you denormalise, and what do you give up?

**Answer.** Normalise by default — 3NF gives you one place to update each fact, which eliminates whole classes of anomaly. Denormalise deliberately when you have a *measured* read problem that can't be solved by indexing or a better query: a join that's hot and expensive, an aggregate recomputed on every page load, or a fan-out read across shards.

What you give up is a single source of truth. Every denormalised copy is a cache with no invalidation protocol unless you build one, so you now need a way to keep it correct — updating both in one transaction, a trigger, a materialised view with a refresh policy, or an async projection you're willing to have be stale.

**Why it matters.** The senior framing: denormalisation is not a modelling style, it's a specific trade of write complexity and consistency risk for read latency. If you can't name what breaks when the copy goes stale, you're not ready to make the trade.

**Follow-up: Where would you denormalise in a payments schema?**
A counter or running balance is the classic case — computing a balance by summing a million ledger entries per request doesn't scale, so you keep a materialised balance row updated in the same transaction as the entry insert, plus a reconciliation job that recomputes from entries and alerts on drift. Denormalise, but keep the derivation authoritative and verify against it.

---

### Q2. Surrogate vs natural keys, and `bigint` vs UUID.

**Answer.** Natural keys (an ISIN, an email, a country code) are meaningful but change — people change email addresses, standards bodies reissue codes — and a changing primary key cascades through every foreign key. Surrogate keys are stable and opaque, which is why they're the default; keep the natural key as a `UNIQUE` constraint so you still get the integrity guarantee.

`bigint` sequences: compact (8 bytes), sequential so inserts go to the end of the index (good locality, minimal page splits), but they're a centralised allocation point and they leak volume information (a competitor can count your orders by placing two).

UUIDs: 16 bytes, generatable client-side without a round trip (which matters for offline clients, sharding, and for setting an entity's identity before persisting — see the JPA `equals` problem). The classic objection is that random UUIDv4 destroys index locality: every insert lands in a random leaf page, causing page splits and a working set that can't stay cached. **UUIDv7** fixes this — it's timestamp-prefixed, so it's roughly sequential while remaining globally unique. That's my default for new distributed systems.

**Follow-up: Why is random UUID insertion so much worse in MySQL than PostgreSQL?**
InnoDB tables are clustered on the primary key, so a random PK means the *entire row* is inserted at a random position in the table, not just an index entry — massive write amplification and fragmentation. PostgreSQL's heap tables store rows in insertion order regardless of PK, so only the index suffers. If you must use UUIDv4 in MySQL, use an auto-increment PK and a unique index on the UUID.

---

### Q3. Explain how a B-tree index works and why it's the default.

**Answer.** A balanced tree where internal nodes hold key ranges and pointers, and leaf nodes hold keys plus row pointers (a heap TID in PostgreSQL, the primary key in InnoDB secondary indexes). Height is typically 3–4 even for hundreds of millions of rows because fan-out per page is large, so a lookup is 3–4 page reads — and the upper levels are almost always cached.

It's the default because it supports the widest range of operations with one structure: equality, range scans (`>`, `BETWEEN`), prefix matching (`LIKE 'abc%'`), ordering (an index scan can satisfy `ORDER BY` without a sort), and `MIN`/`MAX` as a single-leaf lookup. Hash indexes beat it on pure equality, but nothing else.

**Follow-up: What is index selectivity and why does it decide whether the index is used?**
Selectivity is the fraction of rows a predicate matches. Reading via an index costs a tree descent *plus a random heap fetch per matching row*; a sequential scan reads pages in order at much higher throughput. So above roughly 5–20% selectivity (engine and hardware dependent), the sequential scan wins and the planner correctly ignores your index. An index on a `status` column with three values is usually useless on its own — which is why people are surprised their index "isn't working".

---

### Q4. Composite index column order — how do you decide?

**Answer.** The leftmost-prefix rule: an index on `(a, b, c)` can serve predicates on `a`, `(a,b)`, and `(a,b,c)`, but not on `b` alone or `(b,c)`. So order by how the queries use it, not by cardinality alone.

The practical ordering heuristic: **equality columns first, then the range/sort column last**. A query `WHERE tenant_id = ? AND created_at > ? ORDER BY created_at` wants `(tenant_id, created_at)` — putting `created_at` first means the engine can't use `tenant_id` to narrow, and can't produce sorted output within a tenant. Once you hit a range predicate, columns after it in the index can no longer be used for seeking, only for filtering.

**Why it matters.** This is the single highest-leverage indexing skill. Most "we need more indexes" problems are actually "we need the right column order in one index" — and fewer, wider indexes beat many narrow ones because each index is write amplification.

**Follow-up: How many indexes is too many?**
Every index is maintained on every insert, update to an indexed column, and delete. On a write-heavy table, ten indexes can double or triple write cost and inflate WAL. Audit with `pg_stat_user_indexes` (or `sys.schema_unused_indexes` in MySQL) for indexes with zero scans and drop them. Also look for redundant prefixes: if you have `(a,b)` and `(a)`, the second is usually dead weight.

---

### Q5. What is a covering index / index-only scan?

**Answer.** If every column a query needs is present in the index, the engine can answer entirely from the index and skip the heap fetch — removing the random I/O that usually dominates. PostgreSQL calls this an index-only scan; you can add non-key payload columns with `INCLUDE (...)` so they don't bloat the tree's comparison keys or the uniqueness semantics.

PostgreSQL caveat: index-only scans still need to check tuple visibility, so they consult the visibility map. If the table has recently been updated and isn't vacuumed, most pages aren't marked all-visible and you fall back to heap fetches — an index-only scan that isn't. That's why `EXPLAIN ANALYZE` shows `Heap Fetches: N`, and why aggressive autovacuum matters for read performance, not just space.

**Follow-up: Why is this less of a thing in InnoDB?**
Because secondary indexes already contain the primary key, an index on `(a)` covers any query selecting `a` and the PK. And the clustered index *is* the table, so a PK lookup never has a separate heap fetch at all.

---

### Q6. Clustered vs non-clustered indexes — how do PostgreSQL and InnoDB differ structurally?

**Answer.** InnoDB stores rows *inside* the primary key B-tree — the clustered index is the table. Secondary indexes store the indexed columns plus the primary key value, so a secondary index lookup that needs other columns does a second descent into the clustered index ("bookmark lookup"). Consequences: PK lookups are extremely fast, PK choice determines physical order, a wide PK bloats every secondary index, and random PKs fragment the table.

PostgreSQL uses heap tables — rows live in insertion order in an unordered heap, and *all* indexes (including the PK) are secondary, pointing at heap tuple IDs. Consequences: no privileged index, uniform cost, but every index lookup needs a heap fetch unless it's index-only. `CLUSTER` physically reorders a table by an index once, but it doesn't maintain that order.

**Why it matters.** It explains most engine-specific performance advice you'll read. It also explains why PostgreSQL updates are more expensive (a new tuple version means updating *every* index, unless HOT applies) while InnoDB updates in place with an undo log.

---

### Q7. When does adding an index make things worse?

**Answer.** Several ways. Write amplification on every insert/update/delete. Storage and cache pressure — indexes compete with data for the buffer pool, so a rarely-used index evicts hot pages. Planner confusion — more choices means more chances to pick badly, especially with correlated columns. Lock and maintenance cost — building it locks writes unless you use `CREATE INDEX CONCURRENTLY` (which is slower, can fail and leave an invalid index, and can't run in a transaction). And in PostgreSQL, more indexes means updates are less likely to qualify for HOT (heap-only tuple) optimisation, making every update more expensive.

There's also the case where the index is used but shouldn't be: a low-selectivity index scan that does a million random heap fetches is far slower than a sequential scan the planner would have chosen with better statistics.

---

### Q8. Explain partial and functional (expression) indexes.

**Answer.** A **partial index** has a `WHERE` clause and only indexes matching rows: `CREATE INDEX ON payments (created_at) WHERE status = 'PENDING'`. If 0.1% of rows are pending, the index is tiny, stays cached, and costs almost nothing to maintain — perfect for a queue-like access pattern over a huge table.

A **functional index** indexes an expression: `CREATE INDEX ON users (lower(email))`. This is the fix for the most common "why isn't my index used" case — a predicate like `WHERE lower(email) = ?` cannot use a plain index on `email`, because the engine can't invert the function.

**Follow-up: What else silently disables index usage?**
Implicit type casts (`WHERE bigint_col = '123'` may be fine, but `WHERE varchar_col = 123` casts the *column*), leading wildcards (`LIKE '%foo'`), `OR` across different columns (sometimes rescued by a bitmap OR), functions applied to the column, and a mismatched collation. `EXPLAIN` tells you immediately; guessing does not.

---

### Q9. When would you use something other than a B-tree?

**Answer.**
- **Hash** — equality only, smaller and slightly faster than B-tree for that case. Rarely worth it in PostgreSQL now that they're WAL-logged, but valid for large equality-only keys.
- **GIN** — inverted index for composite values: full-text search, `jsonb` containment (`@>`), array membership. Fast reads, expensive writes (mitigate with the pending list / `fastupdate`).
- **GiST** — extensible, for geometric data, ranges, nearest-neighbour, and exclusion constraints (e.g. "no two bookings for the same room with overlapping time ranges" — a constraint you genuinely cannot express otherwise).
- **BRIN** — block range index: stores min/max per block range. Tiny (kilobytes for a billion rows) and only useful when physical order correlates with the column, which is exactly the case for append-only time-series tables. Enormous win for that shape, useless otherwise.
- **Bloom** — cheap multi-column filtering when queries filter on arbitrary subsets of many columns.

**Follow-up: How do you index JSON?**
`jsonb` with a GIN index supports containment and key-existence queries. But if a field inside the JSON is queried constantly with a range or equality predicate, a functional B-tree index on `(payload->>'customer_id')` is usually much better — and the real question is why that field isn't a proper column. Schemaless is a good fit for genuinely variable payloads and a bad fit for fields you filter on daily.

---

### Q10. Should foreign keys and constraints be enforced in the database or the application?

**Answer.** In the database. The database is the only place that sees *every* writer — your service, the batch job, the migration script, the on-call engineer with psql, the data team's backfill. Application-layer enforcement is a convention; a constraint is a guarantee.

The arguments against are real but narrower than people claim: FK checks cost a lookup on write (usually indexed and cheap), they can cause lock contention on the parent row under high concurrency, they complicate sharding (you can't enforce across shards), and they complicate bulk loads and deletion order. The right response to most of them is to keep the constraints and manage the specific case — disable and revalidate during a bulk load, use `ON DELETE` policies deliberately, and accept application-level checks only where the DB genuinely cannot enforce them (cross-shard, cross-service).

**Why it matters.** Every system I've seen with "we enforce it in the application" has orphan rows. The interviewer is checking whether you've cleaned up that data.

**Follow-up: What about `CHECK` constraints and `NOT NULL`?**
Cheap and worth having — they're evaluated in-row with no extra lookup. `NOT NULL` also helps the planner. My rule: make the schema reject data that would be nonsense, so a bug produces a loud constraint violation at the point of the bug rather than a quiet corruption discovered in a report six months later.

---

### Q11. Explain three-valued logic and the traps around NULL.

**Answer.** SQL has TRUE, FALSE and UNKNOWN. Any comparison with NULL yields UNKNOWN, and a `WHERE` clause only keeps rows evaluating to TRUE. So `WHERE col != 'x'` silently excludes rows where `col IS NULL` — one of the most common quiet bugs in reporting.

Other traps: `NOT IN (subquery)` returns *no rows* if the subquery yields a single NULL, because `x NOT IN (1, NULL)` is UNKNOWN, never TRUE. Aggregates skip NULLs, so `COUNT(col)` and `COUNT(*)` differ, and `AVG` divides by the non-null count. `UNIQUE` constraints allow multiple NULLs in most engines (they're not equal to each other). And `NULL = NULL` is UNKNOWN, while `NULL IS NOT DISTINCT FROM NULL` is TRUE — that's the operator you actually want when comparing nullable columns.

**Follow-up: How do you avoid all this?**
Declare `NOT NULL` wherever the domain allows and use `NOT EXISTS` instead of `NOT IN` for anti-joins — it has the correct semantics with NULLs *and* usually a better plan.

---

### Q12. Which column types would you argue about in a schema review?

**Answer.**
- **Money** — `NUMERIC(19,4)` or an integer minor-units column. Never `float`/`double`; the rounding error is real money. (PostgreSQL's `money` type is locale-dependent — avoid it.)
- **Timestamps** — `timestamptz` always, not `timestamp`. `timestamptz` stores a UTC instant and converts on the way in and out; `timestamp` stores a wall-clock reading with no zone, which is almost never what an event timestamp means. This is the single most common schema mistake I see.
- **Strings** — in PostgreSQL, `text` with a `CHECK` on length rather than `varchar(n)` (there's no performance difference and changing the constraint is easier). In MySQL, mind the character set — `utf8` is a 3-byte impostor; you want `utf8mb4`.
- **Enums** — a lookup table with an FK is more flexible than a native enum type (which is painful to alter) and more self-documenting than a bare string.
- **`jsonb` vs columns** — columns for anything you filter, sort, or constrain on; JSON for genuinely open-ended payloads (a raw webhook body, a provider's response you want to keep verbatim).
- **Booleans** — a nullable boolean has three states, which usually means it should be an enum or a timestamp (`deleted_at` rather than `is_deleted`).

---

### Q13. Soft deletes: good idea or bad?

**Answer.** It depends what you're really asking for, and the honest answer is that soft deletes are usually the wrong implementation of a real requirement.

The costs are underestimated: every query must filter `WHERE deleted_at IS NULL` or return ghost data (and someone will forget); unique constraints break (you can't re-register an email that's soft-deleted without a partial unique index); indexes bloat with rows nobody reads; foreign keys still point at "deleted" rows; and GDPR/PDPA erasure requirements mean you may legally *have* to actually delete.

Better options depending on the requirement: an **audit/history table** if you need the record of what happened; an **archive table** with a real move if you need retention with clean live tables; a **status column** if the row is genuinely still part of the domain (a cancelled order isn't deleted, it's cancelled); and a real `DELETE` when the answer is "we just wanted an undo button" — which is better served by a short-lived recycle bin.

**Follow-up: If you must, how do you do it well?**
`deleted_at timestamptz NULL` (not a boolean — you want to know when), partial indexes with `WHERE deleted_at IS NULL` so live queries stay fast, partial unique indexes for the uniqueness problem, and a view or repository-level enforcement so no query can accidentally omit the filter.

---

### Q14. How do you model temporal data — "what was the fee schedule on 3 March"?

**Answer.** Validity intervals: a row per version with `valid_from` and `valid_to` (half-open, `[from, to)` — inclusive start, exclusive end, so intervals compose without off-by-one). A current-row query is `WHERE valid_from <= now() AND (valid_to IS NULL OR valid_to > now())`. In PostgreSQL, `tstzrange` with a GiST exclusion constraint prevents overlapping versions structurally, which is far better than hoping the application doesn't create them.

**Bitemporal** adds a second axis: *valid time* (when the fact was true in the world) and *transaction time* (when we recorded it). You need both when you must answer "what did we believe on 3 March about the rate that applied on 1 March" — which is exactly the question auditors and regulators ask after a backdated correction. In finance this comes up constantly, and retrofitting it is painful, so it's worth deciding up front.

**Follow-up: How does this interact with reporting?**
Reports must specify their as-of times explicitly, or two runs of the same report produce different numbers and nobody can tell whether that's a bug or a correction. Making as-of an explicit parameter is what makes financial reporting reproducible.

---

### Q15. OLTP vs OLAP — how does the modelling differ, and where do you draw the line?

**Answer.** OLTP: normalised, narrow rows, many small indexed lookups, high concurrency, short transactions, row-oriented storage. OLAP: denormalised star/snowflake schemas (fact tables with dimension keys), few large scans, aggregations over billions of rows, columnar storage with compression and vectorised execution.

They conflict directly — indexes that help point lookups don't help full scans, and a big analytical query on your OLTP primary will consume the buffer pool, hold snapshots open (blocking vacuum), and add latency to customer-facing traffic.

The line I draw: analytics never runs on the OLTP primary. Route it to a read replica for light reporting, and to a real warehouse (fed by CDC or batch ETL) for anything heavy. The transitional stage — "just point the BI tool at the replica" — works longer than people expect and fails suddenly when a dashboard query starts taking twenty minutes.

**Follow-up: What about HTAP systems that claim to do both?**
They exist and can be a good fit at moderate scale, but the trade is usually cost and operational maturity. I'd want to see the analytical workload isolated by resource governance, and I'd still test what a runaway query does to transactional p99 before believing the marketing.

---

## 2. Query Performance & Execution Plans

### Q16. How do you read `EXPLAIN ANALYZE`?

**Answer.** Read it inside-out, bottom-up: leaf nodes are scans, parents are joins and aggregations. For each node I look at four things:

1. **Estimated vs actual rows.** A 1000× discrepancy is the root cause of most bad plans — the planner chose a nested loop because it expected 3 rows and got 300,000. Fix the estimate (statistics, extended statistics, a rewritten predicate), not the plan.
2. **Actual time and loops.** The displayed time is *per loop*; total cost is `time × loops`. A 0.05 ms node executed 200,000 times is your 10-second query.
3. **Rows removed by filter.** High values mean you're reading far more than you need — a missing or wrong index.
4. **Buffers** (`EXPLAIN (ANALYZE, BUFFERS)`) — shared hit vs read tells you whether you're cache-resident or hitting disk, which is the difference between "this query is fine" and "this query is fine on my laptop".

I also watch for spills: `Sort Method: external merge Disk: 250MB` means `work_mem` is too low for this query, and raising it (per session) can be a 10× win.

**Follow-up: What's the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?**
`EXPLAIN` shows the plan and estimates without running. `EXPLAIN ANALYZE` actually executes — so on an `UPDATE` or `DELETE` it will modify data unless you wrap it in a transaction and roll back. That's a mistake you only make once.

---

### Q17. Explain sequential scan, index scan, index-only scan, and bitmap heap scan.

**Answer.**
- **Sequential scan** — read every page in order. High throughput per page, and it's the *right* choice for low-selectivity predicates or small tables. Seeing one isn't automatically a bug.
- **Index scan** — descend the tree, then fetch each matching row from the heap. Random I/O per row, so it wins only when few rows match. Preserves index order, so it can satisfy `ORDER BY` for free.
- **Index-only scan** — all needed columns are in the index; no heap fetch (subject to the visibility map, Q5).
- **Bitmap heap scan** — the middle ground. Scan the index, build a bitmap of *pages* to visit, sort it, then read those pages in physical order. This converts random I/O into something closer to sequential, and it lets the planner combine multiple indexes with `BitmapAnd`/`BitmapOr`. It loses index ordering, so it usually implies a separate sort.

**Why it matters.** Knowing that bitmap scans exist explains why the planner sometimes uses two mediocre indexes together instead of one good one, and why adding the right composite index eliminates a `BitmapAnd` and a sort in one move.

---

### Q18. Compare the join algorithms and when each is chosen.

**Answer.**
- **Nested loop** — for each outer row, probe the inner. Optimal when the outer side is tiny and the inner has an index on the join key. Catastrophic when the outer row estimate is wrong: 10 estimated rows becomes 1M actual, and you do a million index probes. This is the single most common cause of a query that was fast yesterday and is 500× slower today.
- **Hash join** — build a hash table on the smaller side, probe with the larger. Great for large, unindexed equi-joins. Needs memory; spills to disk in batches when it exceeds `work_mem`, which is a big slowdown worth spotting in the plan.
- **Merge join** — sort both inputs (or use index order) and walk them together. Good for very large joins where both sides are already sorted, and for range joins. The sort is the cost.

The planner picks by estimated cardinality and available indexes and memory, so the fix for a bad join choice is almost always to fix the estimate or the index, not to hint the join.

**Follow-up: How do you deal with a persistently bad plan?**
In order: `ANALYZE` and check statistics targets; add extended statistics for correlated columns; rewrite the query to be more estimable (materialise a CTE, split into two queries); add or reorder an index; and only as a last resort use engine-specific hints (`pg_hint_plan`, MySQL optimizer hints) or `SET LOCAL enable_nestloop = off` for one statement — with a comment explaining why, because it will rot.

---

### Q19. Why does the planner make bad decisions?

**Answer.** Almost always cardinality estimation error, and it compounds multiplicatively up the plan tree. The specific causes:

- **Stale statistics** — a bulk load or a large delete without `ANALYZE`. Autovacuum's analyze threshold is proportional, so very large tables get analysed rarely.
- **Correlated columns** — the planner assumes independence, so `WHERE city = 'Kuala Lumpur' AND country = 'Malaysia'` is estimated as the product of two selectivities and comes out ~100× too low. Fix with `CREATE STATISTICS ... (dependencies, ndistinct)`.
- **Skewed distributions** — the histogram and most-common-values list have limited resolution; raise `default_statistics_target` (or per-column) for skewed columns.
- **Opaque predicates** — a function the planner can't estimate through, a parameter it can't see, or a join through a `jsonb` extraction.
- **Wrong cost constants** — `random_page_cost` at its default of 4.0 assumes spinning disks. On SSDs, 1.1–1.5 is realistic, and leaving it at 4 systematically biases the planner *away* from index scans.

**Why it matters.** The senior answer treats the planner as a cost model with inputs, not as a black box that's "being stupid". Almost every plan complaint is an input problem.

---

### Q20. What is parameter sniffing / the generic plan problem?

**Answer.** When a prepared statement is planned once and reused, the plan is chosen for either the first parameter values seen (SQL Server-style sniffing) or for a generic estimate. If the data is skewed — `WHERE tenant_id = ?` where one tenant has 10 million rows and the rest have 100 — the plan that's optimal for one is disastrous for the other.

PostgreSQL's behaviour is specific and worth knowing: it uses custom plans for the first five executions, then compares the average custom cost against the generic plan cost, and switches to the generic plan if it isn't worse. You can force either with `plan_cache_mode = force_custom_plan` / `force_generic_plan`.

**Follow-up: How do you fix it?**
Force custom plans for the affected statement; or split the query into two code paths for the skewed and normal cases; or add a partial index for the outlier; or, if the skew is a tenant, consider partitioning by tenant. In SQL Server the classic hints are `OPTIMIZE FOR UNKNOWN` and `RECOMPILE`.

---

### Q21. How do you paginate a large result set?

**Answer.** `LIMIT ... OFFSET n` is O(n) — the engine must generate and discard the first n rows, so page 10,000 reads a million rows to return twenty. It also produces inconsistent results when rows are inserted or deleted between page requests: users see duplicates and skipped rows.

**Keyset (seek) pagination** fixes both. Remember the last row's sort key and continue from it:

```sql
SELECT * FROM payments
WHERE (created_at, id) < (:last_created_at, :last_id)   -- row comparison, stable tiebreak
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

With an index on `(created_at, id)` this is O(log n) regardless of depth, and it's stable under concurrent inserts. The cost: you can't jump to an arbitrary page number, only next/previous — which is fine for infinite scroll and APIs, and negotiable for admin UIs.

**Follow-up: How do you expose this in an API?**
An opaque cursor token — base64 of the sort key values, ideally signed so clients can't forge it into a full table scan. Return `next_cursor` with each page. That's what every well-designed API does (Stripe, GitHub), and it lets you change the underlying sort key without breaking clients.

---

### Q22. `COUNT(*)` on a 500-million-row table takes 40 seconds. What do you do?

**Answer.** First, ask what the number is for. Most "total results" counts exist to render a page count nobody uses.

Options, in order:
- **Don't count.** Show "showing 1–20 of many", or fetch `LIMIT 21` and display "20+".
- **Approximate.** `SELECT reltuples FROM pg_class WHERE relname = 'x'` is free and accurate to within the last autovacuum. Good enough for dashboards.
- **Bounded count.** Count within a `LIMIT 1000` subquery: "1000+ results".
- **Maintained counter.** A summary table updated by trigger or by the application. Correct and fast, but now it's a contention point (every insert updates one row) — mitigate by sharding the counter into N rows and summing, or by incrementing asynchronously.
- **Materialised view** refreshed on a schedule for aggregate dashboards.

**Why it matters.** In PostgreSQL, `COUNT(*)` must visit every tuple to check visibility under MVCC — there's no O(1) row count, unlike MyISAM. Knowing *why* it's slow is what distinguishes this from a memorised trick.

---

### Q23. What does a SQL-level N+1 look like, and how do you batch?

**Answer.** The application loop issuing one query per item: 500 items, 500 round trips, and even at 1 ms each that's half a second of pure latency. The database is not the bottleneck — the round trips are.

Fixes: a single query with `WHERE id = ANY(:ids)` or `IN (...)`; a join that returns everything at once; or `VALUES`-list joins for batch updates. For writes, multi-row `INSERT ... VALUES (...), (...), (...)` or JDBC batching with `rewriteBatchedStatements=true` (MySQL) — the difference is often 20–50×.

**Follow-up: How large should a batch be?**
Big enough to amortise the round trip, small enough to avoid long locks and huge parse times — typically 500–5,000 rows. Beyond that you get diminishing returns and increased transaction duration, which hurts vacuum and lock waits. Chunk very large operations into batches with separate transactions so nothing holds locks for minutes.

---

### Q24. When do window functions beat self-joins or application code?

**Answer.** Whenever you need per-row context from a group without collapsing rows: running totals (`SUM(...) OVER (PARTITION BY account ORDER BY ts)`), ranking (`ROW_NUMBER`, `RANK`, `DENSE_RANK`), gaps between events (`LAG`/`LEAD`), top-N per group, and moving averages.

The classic case is "the latest row per key". The self-join version scans twice and is error-prone with ties; the window version is one pass:

```sql
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at DESC) rn
  FROM balances
) t WHERE rn = 1;
```

In PostgreSQL, `DISTINCT ON (account_id)` is even more concise and often faster.

**Follow-up: What are the performance considerations?**
Each distinct window frame (`PARTITION BY`/`ORDER BY` combination) may need its own sort, so reusing one frame across several window functions is much cheaper than five different ones. An index matching the partition+order can eliminate the sort entirely. And window functions run *after* `WHERE`, which is why you need the subquery to filter on `rn`.

---

### Q25. CTEs: optimisation fence or not?

**Answer.** Historically in PostgreSQL, a `WITH` clause was always materialised — an optimisation fence, which people used deliberately to force a plan and accidentally to destroy one. Since PostgreSQL 12, non-recursive CTEs referenced once and without side effects are inlined by default, and you can control it explicitly with `MATERIALIZED` / `NOT MATERIALIZED`.

That control is genuinely useful: `MATERIALIZED` when the CTE is expensive and referenced multiple times, or when you want to force an expensive filter to happen first; `NOT MATERIALIZED` when you want predicates pushed down into it.

**Recursive CTEs** are for hierarchies and graph traversal — org charts, category trees, bill-of-materials, transitive account relationships. Always bound the depth, because a cycle in the data gives you an infinite loop; the standard defence is carrying a visited-path array and excluding revisits.

---

### Q26. `IN` vs `EXISTS` vs `JOIN` — do they perform differently?

**Answer.** Modern planners usually transform between them, so for simple cases the plans are identical. The differences that persist:

- **`NOT IN` with a nullable subquery column is semantically different** and usually wrong (Q11). `NOT EXISTS` is a proper anti-join and both faster and correct.
- **`JOIN` can duplicate rows** if the right side has multiple matches; `EXISTS` is a semi-join and cannot. If you're adding `DISTINCT` to fix a join, you probably wanted `EXISTS`.
- **`EXISTS` can short-circuit** on the first match, which matters when the inner side is large.

My default: `EXISTS`/`NOT EXISTS` for "does a related row exist", `JOIN` when you actually need columns from the other table.

---

### Q27. How do you find the slow queries in a system you've just inherited?

**Answer.** Not by reading code. `pg_stat_statements` (or MySQL's performance schema / slow query log) aggregates by normalised query text and gives you total time, mean time, calls, and rows. The critical insight: **order by total time, not mean time**. A 5 ms query called 2 million times an hour is a bigger problem than a 30-second report run daily, and it's the one that's invisible in the slow log because it's under the threshold.

Then: `pg_stat_user_tables` for sequential scans on large tables, `pg_stat_user_indexes` for unused indexes, and `pg_stat_activity` / `pg_locks` for what's blocking right now. On the application side, distributed tracing with the SQL statement as a span attribute tells you which endpoint generates which query, which the database can't tell you.

**Follow-up: What do you check first during a live incident?**
Active queries sorted by duration, lock waits (`pg_blocking_pids`), connection count against the limit, and replication lag. Then decide whether to kill the offending query — `pg_cancel_backend` before `pg_terminate_backend`, because terminate kills the connection and can force a client-side reconnect storm.

---

### Q28. What is a hot row and how do you deal with contention on it?

**Answer.** A single row updated by a large fraction of transactions — a global counter, a settlement account balance, a sequence table, an inventory count for a popular item. Every writer serialises on that row's lock, so throughput is bounded by the transaction duration, not by hardware. It also produces deadlocks when combined with other locks in inconsistent orders.

Mitigations:
- **Shorten the lock hold time** — update the hot row as the *last* statement in the transaction, and never hold it across a network call.
- **Shard the counter** — N rows, writers pick one by hash, readers sum. Turns one hot lock into N warm ones. The standard fix for high-throughput counters.
- **Append instead of update** — insert ledger entries and aggregate, rather than mutating a balance. Inserts don't contend.
- **Batch/aggregate** — accumulate in memory or a queue and apply periodically, accepting bounded staleness.
- **Move it out of the DB** — Redis `INCR` for a non-financial counter.

**Why it matters.** In payments this is a real design constraint: a merchant settlement account receiving 5,000 transactions a second cannot be a single mutable balance row.

---

### Q29. How would you implement a job queue in a relational database?

**Answer.** `SELECT ... FOR UPDATE SKIP LOCKED` is the key primitive — it lets each worker grab rows that aren't already locked by another worker, instead of blocking:

```sql
WITH job AS (
  SELECT id FROM jobs
  WHERE status = 'PENDING' AND run_after <= now()
  ORDER BY run_after
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs SET status = 'RUNNING', locked_at = now(), attempts = attempts + 1
FROM job WHERE jobs.id = job.id
RETURNING jobs.*;
```

With a partial index on `(run_after) WHERE status = 'PENDING'`, this stays fast even when the table has hundreds of millions of completed rows. Add a visibility timeout (a sweeper that resets rows stuck in `RUNNING` past a deadline) so a crashed worker's job is retried, an attempts counter with a dead-letter status, and archiving of completed rows so the live set stays small.

**Why it matters.** For moderate throughput this is often the right answer — you get transactional enqueue with your business data for free (no dual-write problem, no outbox needed), plus queryability and existing operational tooling. The limits are throughput (thousands/sec, not millions), table bloat from the churn, and the lack of fan-out. Beyond that, move to a real broker.

**Follow-up: How does this compare to an outbox?**
It's the same mechanism with a different purpose: an outbox is a queue whose consumer publishes to a broker. If a database queue meets your needs end-to-end, you may not need the broker at all — which is a legitimate architectural answer that many teams skip past.

---

### Q30. Give me a query optimisation you actually performed.

**Answer.** (Have a real one ready. The shape that reads well:)

State the symptom with numbers — "a settlement report went from 4 seconds to 6 minutes over three months". State the diagnosis method — "`pg_stat_statements` showed it as top by total time; `EXPLAIN (ANALYZE, BUFFERS)` showed a nested loop with an estimate of 12 rows against 400,000 actual, because the planner assumed `merchant_id` and `currency` were independent". State the fix and the reasoning — "extended statistics on the correlated pair, which changed the plan to a hash join, plus a composite index on `(merchant_id, settled_at)` matching the filter and sort". State the result and the guard — "6 minutes to 900 ms, and I added a regression test asserting query count and a p95 alert on that endpoint so we'd notice next time before the users did".

**Why it matters.** Interviewers use this question to check that your earlier answers came from experience rather than reading. The measurement and the guard-rail at the end matter as much as the fix.

---

## 3. Transactions, Concurrency & MVCC

### Q31. Define ACID precisely.

**Answer.**
- **Atomicity** — all or nothing. Implemented by undo logging / WAL: a partially applied transaction is rolled back on crash recovery.
- **Consistency** — the transaction moves the database from one valid state to another with respect to declared constraints. Note this is largely the *application's* property; the database only enforces what you've declared, which is another argument for real constraints.
- **Isolation** — concurrent transactions don't observe each other's intermediate state. This is the one that's actually a spectrum, not a boolean (Q32).
- **Durability** — a committed transaction survives a crash. Implemented by flushing WAL to stable storage before acknowledging commit.

**Why it matters.** The senior nuance is that C is doing the least work of the four, and I is not what most people assume — nobody runs at `SERIALIZABLE` by default, so "ACID" in practice means "atomic, durable, and isolated in a way you need to understand".

**Follow-up: How is durability actually achieved, and where does it leak?**
WAL is written and `fsync`ed before commit is acknowledged. It leaks when: `synchronous_commit = off` (commits acknowledged before the flush — you lose a fraction of a second of transactions on crash, but never corruption); the disk lies about `fsync` (consumer SSDs with volatile write caches); or replication is asynchronous, so a failover loses whatever hadn't shipped. Each is a legitimate trade you should make consciously.

---

### Q32. Walk me through the isolation anomalies, including write skew.

**Answer.**
- **Dirty read** — reading uncommitted data. Prevented at `READ COMMITTED` and above.
- **Non-repeatable read** — re-reading a row gives a different value. Prevented at `REPEATABLE READ`.
- **Phantom read** — re-running a query returns new rows. Prevented at `SERIALIZABLE` (and by InnoDB's gap locks at `REPEATABLE READ`).
- **Lost update** — two read-modify-write cycles, one silently overwrites the other. **Not** prevented by `READ COMMITTED`. This is the money bug.
- **Write skew** — two transactions read an overlapping set, each checks an invariant that holds, and each writes a *different* row, jointly violating the invariant. Not prevented by snapshot isolation / `REPEATABLE READ`.

The canonical write skew: two doctors both on call, each transaction checks "is at least one other doctor on call?" (yes), and each takes themselves off call. Both commit; nobody is on call. The financial version: two withdrawals from linked accounts where the overdraft rule spans both.

**Why it matters.** Write skew is the anomaly that catches senior engineers, because "we use REPEATABLE READ" feels safe and isn't. The fixes are `SERIALIZABLE`, materialising the conflict (lock a parent row so the transactions actually collide), or a constraint that expresses the invariant.

**Follow-up: How does PostgreSQL implement `SERIALIZABLE`?**
Serializable Snapshot Isolation — optimistic. It tracks read/write dependencies between concurrent transactions and aborts one when it detects a dangerous structure that could produce a non-serializable outcome. So it doesn't block, but it throws `could not serialize access` (SQLSTATE 40001), and **your application must retry the whole transaction**. Systems that adopt `SERIALIZABLE` without a retry wrapper just move the failure to the user.

---

### Q33. Explain PostgreSQL MVCC.

**Answer.** Every row version (tuple) carries `xmin` (the transaction that created it) and `xmax` (the transaction that deleted or superseded it). A transaction takes a snapshot — the set of transaction IDs committed at its start — and a tuple is visible if `xmin` is committed-and-visible in that snapshot and `xmax` is not.

So an `UPDATE` doesn't modify in place: it writes a *new* tuple and marks the old one's `xmax`. Readers never block writers and writers never block readers, which is MVCC's whole selling point. The costs are: dead tuples accumulate and must be reclaimed (VACUUM), and every index must be updated to point at the new tuple unless the **HOT** (heap-only tuple) optimisation applies — which requires the new version to fit on the same page and no indexed column to change.

**Follow-up: Why does an update-heavy table with many indexes perform badly?**
Because HOT can't apply if any indexed column changed, so each update writes N index entries plus a new heap tuple, generating WAL and bloat. Two practical fixes: don't index columns that change frequently, and leave `fillfactor` below 100 on hot tables so there's free space on the page for HOT updates.

---

### Q34. What is VACUUM actually doing, and what happens if it falls behind?

**Answer.** Three jobs: reclaim space from dead tuples for reuse (not returning it to the OS — that's `VACUUM FULL`, which takes an `ACCESS EXCLUSIVE` lock and rewrites the table); update the **visibility map** so index-only scans work and future vacuums can skip all-visible pages; and **freeze** old tuples to prevent transaction ID wraparound.

If it falls behind: table and index bloat (a 10 GB table holding 1 GB of live data — every scan reads ten times the necessary pages); degraded index-only scans; stale statistics from the coupled autoanalyze; and eventually **wraparound protection**, where PostgreSQL refuses new writes to protect data. That last one is a full outage, and it's preceded by weeks of ignored warnings in the log.

**Why autovacuum falls behind, in practice:** long-running transactions or idle-in-transaction sessions (a tuple can't be removed while any snapshot might need it — *one* forgotten open transaction blocks cleanup across the whole database), abandoned replication slots (same effect), unused prepared transactions, cost-limit throttling set for 2010 hardware (`autovacuum_vacuum_cost_limit`), and too few autovacuum workers for the table count.

**Follow-up: How do you monitor it?**
`n_dead_tup` and `last_autovacuum` per table from `pg_stat_user_tables`; `age(datfrozenxid)` against `autovacuum_freeze_max_age` for wraparound headroom; and an alert on the longest-running transaction and on any replication slot whose `restart_lsn` is stalling. Alert on the *oldest transaction*, not just on bloat — it's the leading indicator.

---

### Q35. How does InnoDB's locking differ, and what are gap locks?

**Answer.** InnoDB uses MVCC via undo logs (old versions live in the rollback segment, not in the table), plus row-level locks on index records. Under `REPEATABLE READ`, plain `SELECT`s are non-locking consistent reads from a read view; locking reads (`FOR UPDATE`, `FOR SHARE`) and writes take **next-key locks** — a record lock plus a **gap lock** on the range before it — which prevents phantoms by stopping other transactions inserting into the gap.

Gap locks are the source of most InnoDB deadlock surprises: two transactions inserting different, non-conflicting rows can deadlock because their gap locks overlap. They also mean a `DELETE FROM t WHERE indexed_col = ?` matching zero rows still takes a gap lock, blocking inserts in that range.

**Follow-up: Why does an unindexed `WHERE` clause lock everything?**
Because InnoDB locks the rows it *examines* via the index it uses, not the rows that match your predicate. Without a usable index it scans and locks every row in the table. Adding the right index is a *correctness-adjacent* concurrency fix, not just a performance one — a fact that surprises people the first time.

---

### Q36. How do you diagnose and prevent database deadlocks?

**Answer.** Diagnose from the log — both engines log the full deadlock graph (`log_lock_waits` and the deadlock report in PostgreSQL, `SHOW ENGINE INNODB STATUS` / `innodb_print_all_deadlocks` in MySQL) showing both transactions, their statements, and the locks held and wanted. That's usually enough to spot the inconsistent ordering.

Prevent by: acquiring locks in a **consistent order** (sort account IDs ascending before updating both sides of a transfer — the single most effective fix); keeping transactions short and never spanning user think-time or external HTTP calls; using a single statement where possible (`UPDATE ... WHERE` is atomic, so one statement can't deadlock with itself); taking the most contended lock last; using `SKIP LOCKED` for queue-like access; and adding the indexes that stop lock escalation over scanned rows.

Then: **accept that deadlocks happen and retry**. A deadlock is a normal, expected outcome under concurrency — the loser gets an error (SQLSTATE 40P01 / 1213) and the correct application response is to retry the whole transaction with backoff. Code that treats a deadlock as a fatal error is under-built.

---

### Q37. Why are long-running transactions so damaging?

**Answer.** Well beyond holding locks:
- They pin the oldest snapshot, so **VACUUM cannot reclaim any dead tuple newer than it** — database-wide bloat from one session.
- They hold locks acquired at any point, for their entire duration.
- They extend the window for lost updates and deadlocks.
- On replicas with `hot_standby_feedback`, a long query on the replica blocks vacuum on the *primary*.
- They make failover and deployment riskier, because rollback of a huge transaction takes as long as the work did.

The specific killer is **idle in transaction** — a connection that ran a statement, didn't commit, and went to sleep, usually because the application opened a transaction and then made a network call. Set `idle_in_transaction_session_timeout` to kill those, and alert on them.

**Follow-up: How do you handle a genuinely long batch operation?**
Chunk it: process 10,000 rows per transaction in a loop, with a stable ordering key so it's resumable, throttling between batches, and idempotency so a partial run can be re-run safely. Never a single 4-hour transaction.

---

### Q38. Explain WAL and the commit path.

**Answer.** Write-Ahead Logging: before any data page change reaches disk, a record describing the change is written to the log and flushed. On crash, recovery replays the log from the last checkpoint to restore committed changes and roll back uncommitted ones. This is what makes durability affordable — sequential log writes instead of random data page writes at commit time.

The commit path: modify pages in shared buffers → write WAL records to the WAL buffer → at commit, flush WAL up to the commit LSN (`fsync`) → acknowledge. Dirty data pages are written later by the background writer and at checkpoints. **Group commit** amortises the fsync across concurrent committers, which is why throughput often improves with concurrency up to a point.

WAL is also the foundation of everything else: physical replication ships WAL, point-in-time recovery replays it, and logical decoding/CDC reads it.

**Follow-up: What does a checkpoint do and why does it cause latency spikes?**
It flushes all dirty buffers so WAL before that point can be recycled, bounding recovery time. A checkpoint that flushes gigabytes at once creates an I/O storm. Tuning: raise `max_wal_size` so checkpoints are less frequent, and raise `checkpoint_completion_target` (0.9 default in modern versions) so the writes are spread across the interval rather than bunched.

---

### Q39. Synchronous vs asynchronous replication — what do you actually lose?

**Answer.** **Async**: the primary acknowledges commit before the replica has the WAL. Fast, no coupling to replica health, but a primary failure loses everything not yet shipped — your RPO is the replication lag at the moment of failure, which is exactly when lag is likely to be high.

**Sync**: the primary waits for the replica to confirm (receive, flush, or apply — PostgreSQL's `synchronous_commit` levels `remote_write`, `on`, `remote_apply` differ meaningfully). Zero data loss on failover, at the cost of adding the round-trip to every commit, and — critically — the primary's availability now depends on the replica's. Mitigate with `synchronous_standby_names` naming a quorum (`ANY 1 (a, b, c)`) rather than one specific replica, so any single replica failure doesn't stall writes.

**Why it matters.** The senior point is that this is an explicit RPO decision that belongs to the business, not to the DBA. For a payments ledger I'd argue for synchronous commit to at least one replica in another AZ; for a click-analytics table, async.

---

### Q40. What is replication lag and how does it break your application?

**Answer.** The delay between a commit on the primary and its visibility on a replica. It breaks **read-your-own-writes**: a user submits a payment, is redirected to a details page that reads from a replica, and sees nothing — so they submit again.

Handling it:
- Route reads that must be fresh to the primary (sticky-to-primary for N seconds after a write, per session).
- Use LSN tracking: capture the write's LSN, and have the reader wait for or select a replica that has replayed past it. This is the correct general solution and PostgreSQL exposes the primitives.
- Design the UI to render from the write response rather than re-reading.
- Monitor lag in both bytes and seconds, and take a replica out of rotation when it exceeds a threshold.

**Follow-up: What causes lag to spike?**
A long-running query on the replica conflicting with replay (PostgreSQL either delays replay or cancels the query, controlled by `max_standby_streaming_delay`); single-threaded apply falling behind a write-heavy primary; a bulk operation generating enormous WAL; and network saturation. The replica being read-heavy is itself a common cause, which is the irony of scaling reads with replicas.

---

### Q41. How does failover work and what is split brain?

**Answer.** Failover promotes a replica to primary. The hard parts aren't the promotion, they're: deciding the primary is *actually* dead rather than partitioned (requires a quorum of observers, not a single monitor); ensuring the old primary can't accept writes if it returns (fencing/STONITH); choosing the most advanced replica; and repointing clients (DNS, a proxy like pgpool/HAProxy/PgBouncer, or a virtual IP).

**Split brain** is two nodes both believing they're primary, accepting divergent writes. Recovery means choosing which writes to discard — in a financial system, that is a manual, painful, auditable process. Prevention is quorum-based decisions and hard fencing, never a timeout-based promotion by a single watcher.

**Follow-up: Automatic or manual failover?**
Automatic, if and only if you have proper quorum and fencing — otherwise a network blip causes an outage worse than the one it prevents. I'd rather have a well-drilled 5-minute manual failover than an automatic one nobody has tested. And either way: practise it, in production, on a schedule. An untested failover procedure is a hypothesis.

---

### Q42. What is a distributed transaction at the database level, and when would you use one?

**Answer.** Two-phase commit with prepared transactions (`PREPARE TRANSACTION` in PostgreSQL, XA in MySQL/JTA). Phase 1: all participants prepare and durably promise they can commit. Phase 2: the coordinator tells everyone to commit or abort.

The problem is the blocking window: if the coordinator dies between phases, participants hold locks and prepared transactions indefinitely. In PostgreSQL an orphaned prepared transaction is especially nasty — it pins the oldest snapshot and blocks vacuum forever, so a forgotten 2PC can bloat a database into an outage weeks later. That's why `max_prepared_transactions` defaults to 0.

When I'd use it: essentially never across services. Within one database, use a single transaction. Across services, use a saga with compensations and idempotency, and accept eventual consistency with reconciliation — which is what the payments industry actually does.

---

### Q43. What is CDC and how would you implement it?

**Answer.** Change Data Capture streams row-level changes out of the database. The good implementation reads the transaction log — PostgreSQL logical decoding via a replication slot, MySQL binlog in ROW format — which gives you every committed change in commit order, with no impact on application queries and no missed changes.

The alternatives are worse: polling an `updated_at` column misses deletes, misses intermediate states, and races with clock skew; triggers writing to an audit table double the write cost and are easy to forget on new tables.

Debezium is the standard implementation, publishing to Kafka. Uses: feeding a data warehouse, maintaining search indexes and caches, the outbox pattern (Q136), and migrating between systems with dual-running.

**Follow-up: What are the operational hazards?**
The replication slot is the big one — if the consumer stops, WAL accumulates on the primary until the disk fills and the database stops. Always monitor slot lag and set `max_slot_wal_keep_size`. Also: schema changes flowing through as DDL events your consumers must tolerate, initial snapshot load on a huge table, and the fact that CDC exposes your internal schema as a public interface, which is exactly why the outbox pattern (publishing intentional events rather than raw table changes) is usually better than CDC-on-business-tables.

---

### Q44. Explain CAP and PACELC, and why CAP is often misused.

**Answer.** CAP: during a **network partition**, a system must choose between consistency (linearizability) and availability. That's it — it says nothing about the normal, unpartitioned case, which is where systems spend 99.99% of their time. "We chose AP" as a general description of a system is a misuse.

**PACELC** completes it: *if* Partitioned, choose Availability or Consistency; *Else*, choose Latency or Consistency. The else-branch is the one that actually shapes daily behaviour — synchronous replication trades latency for consistency on every single commit, partition or not.

**Why it matters.** It reframes the design conversation from a one-time architectural label to a per-operation decision: a balance check can tolerate 200 ms of staleness; a duplicate-payment check cannot.

---

### Q45. Compare consistency models.

**Answer.** From strongest:
- **Linearizable / strong** — every operation appears to take effect at a single instant between invocation and response; reads see the latest write. Requires coordination, so it costs latency and availability.
- **Sequential** — all nodes see operations in the same order, but not necessarily real-time order.
- **Causal** — operations related by cause and effect are seen in order everywhere; concurrent operations may be seen in different orders. Often the sweet spot: it preserves "the reply appears after the message" without global coordination.
- **Read-your-writes / monotonic reads** — session guarantees, usually what users actually notice.
- **Eventual** — replicas converge if writes stop. Says nothing about *when*, which is why it's a weak promise in isolation.

**Why it matters.** The senior move is choosing per operation rather than per system. In a payments platform: strong consistency for the ledger and duplicate detection, read-your-writes for anything the user just did, and eventual for analytics, search indexes and notification feeds.

---

## 4. Scaling, Replication & Operations

### Q46. When do read replicas help, and when are they the wrong answer?

**Answer.** They help when your workload is read-dominated, the reads tolerate staleness, and the primary is CPU or I/O bound on reads. They're an easy, low-risk scaling step.

They don't help when: you're **write**-bound (every replica applies every write, so replicas add no write capacity and actually add load to the primary for WAL shipping); your reads need to be fresh (Q40); or your problem is a single bad query, in which case you've just distributed the bad query. They also introduce real complexity — routing logic, lag monitoring, failover semantics, and a whole class of "works on primary, fails on replica" bugs.

**Follow-up: What scales writes?**
In order of preference: reduce write volume (batching, avoiding write amplification from excess indexes, moving non-durable counters to Redis); vertical scaling (still remarkably far — a modern box handles a lot); partitioning to reduce index depth and enable parallel maintenance; separating workloads into different databases by bounded context; and only then sharding, which is a large permanent complexity commitment.

---

### Q47. Why do you need a connection pooler in front of PostgreSQL specifically?

**Answer.** PostgreSQL uses a process per connection, each with its own memory (`work_mem` allocations are per operation, per connection) and a fixed cost in the process table and in snapshot computation. A thousand idle connections consume gigabytes and slow down every transaction's snapshot handling. That's why `max_connections` in the low hundreds is normal, and why the useful concurrency is closer to a few times the core count.

In a microservices world, ten services × ten pods × a 20-connection pool = 2,000 connections against a 200-connection limit. PgBouncer sits in between and multiplexes.

**Pooling modes matter:**
- **Session** — a client holds a server connection for its whole session. Safe, but barely multiplexes.
- **Transaction** — a server connection is assigned per transaction. This is where the big win is (thousands of clients on tens of connections), but it breaks anything relying on session state: `SET`, session-level advisory locks, `LISTEN/NOTIFY`, `WITH HOLD` cursors, and server-side prepared statements (PgBouncer 1.21+ handles prepared statements, but check your version).
- **Statement** — per statement; no multi-statement transactions. Rarely appropriate.

**Follow-up: Do you still need an application-side pool?**
Yes — HikariCP still avoids TCP connect and auth per query, and it's where you enforce your service's own concurrency limit. The two layers do different jobs: Hikari bounds *your* concurrency, PgBouncer bounds the *database's*.

---

### Q48. Explain table partitioning and when it's worth it.

**Answer.** Declarative partitioning splits one logical table into physical partitions by range (time — the most common), list (region, tenant), or hash (even distribution). The planner does **partition pruning**, skipping partitions that can't match the query's predicate.

The real benefits are mostly *operational*, not query speed:
- **Cheap data lifecycle.** `DROP TABLE payments_2024_01` is instant; `DELETE FROM payments WHERE created_at < ...` on 200 million rows generates enormous WAL, bloat, and vacuum work. This alone justifies partitioning for time-series data.
- **Smaller indexes per partition**, so the hot partition's index stays in memory.
- **Parallel maintenance** — vacuum, analyze and reindex per partition.
- Query pruning, when the partition key is in the predicate.

The costs: queries *without* the partition key touch every partition; unique constraints must include the partition key (a real modelling constraint); foreign keys to partitioned tables are limited; partition management must be automated (`pg_partman` or a scheduled job creating future partitions — a forgotten partition means insert failures at midnight); and cross-partition joins can get worse.

**Follow-up: How many partitions is too many?**
Planning time grows with partition count. Modern PostgreSQL handles thousands, but I'd aim for tens to low hundreds — daily partitions for two years is 730, which is fine; hourly for two years is not. Match the granularity to your retention and query patterns.

---

### Q49. How do you shard, and what's the hardest part?

**Answer.** Choose a shard key that (a) appears in almost every query so you can route to one shard, (b) distributes evenly, and (c) keeps data that's accessed together on the same shard. In a payments system that's usually `merchant_id` or `customer_id`, not `payment_id`, because the access pattern is "all of this merchant's activity".

The hardest parts, in order:
1. **Cross-shard queries and transactions.** Anything spanning shards needs scatter-gather (slow, and latency = the slowest shard) and loses atomicity. You design the schema so this is rare, and accept eventual consistency where it isn't.
2. **Resharding.** Modulo-based sharding requires moving nearly all data when you add a shard. Use **consistent hashing** or, better, many **virtual buckets** (e.g. 1024 logical shards mapped to N physical ones) so rebalancing moves only a fraction, and adding capacity is a mapping change plus a data move.
3. **Hot shards.** One enormous merchant lands on one shard. You need per-tenant isolation or the ability to split a shard.
4. **Operations at N×.** Schema migrations, backups, monitoring and failover now happen N times, and partially-failed migrations across shards are their own genre of incident.

**Why it matters.** The senior answer includes "and I'd exhaust everything else first" — partitioning, read replicas, splitting by bounded context, caching, and vertical scaling. Sharding is permanent.

---

### Q50. Design a backup and recovery strategy.

**Answer.** Start from RPO and RTO, agreed with the business, because they determine everything else.

Layers: periodic **base backups** (`pg_basebackup`, pgBackRest, WAL-G) plus continuous **WAL archiving**, which together give **point-in-time recovery** — you can restore to any second, which is what you need when the incident is "a bad migration deleted a column at 14:32" rather than a hardware failure. Replicas are *not* backups: they replicate your mistake instantly.

Then the parts people skip:
- **Test restores on a schedule**, automatically, and measure the restore time. An untested backup is a belief, not a backup. Most backup failures are discovered during the first real restore.
- **Offsite and immutable copies** — ransomware and a compromised account both delete your backups if they can reach them. Object-lock / write-once storage.
- **Retention that matches compliance** — financial records often require years.
- **Logical dumps** occasionally too, because a physical backup can only be restored to a compatible version.

**Follow-up: RPO 0 — how?**
Synchronous replication to at least one node in another failure domain, plus WAL archiving. And be honest that RPO 0 with a single-region failure tolerance costs latency on every commit; the business needs to see that trade.

---

### Q51. What database metrics do you alert on?

**Answer.** Split into saturation, latency, and correctness-adjacent:

- **Connections used / max** — the leading indicator of an application-side stall.
- **Query latency p95/p99 by statement class**, plus the count of queries over a threshold.
- **Replication lag** in bytes and seconds, per replica.
- **Longest transaction age and oldest `idle in transaction`** — leading indicator of bloat and lock storms.
- **Cache hit ratio** and buffer reads — a sudden drop means the working set no longer fits.
- **Dead tuples / bloat estimate per table, and `last_autovacuum`.**
- **Transaction ID age** against wraparound thresholds.
- **Replication slot lag** (unconsumed WAL) and disk free on the WAL volume — this pair kills databases.
- **Deadlock rate and lock wait counts.**
- **Checkpoint frequency and whether checkpoints are "requested" rather than "timed"** — requested means `max_wal_size` is too small.

**Why it matters.** Naming the *leading* indicators (oldest transaction, slot lag, connections) rather than only lagging ones (disk full, CPU) is the senior signal.

---

### Q52. How do you load 500 million rows without taking down production?

**Answer.** Never one big `INSERT` loop. The approach:

- Use the bulk path — `COPY` (PostgreSQL) or `LOAD DATA INFILE` (MySQL), which bypass most per-row overhead. Orders of magnitude faster than `INSERT`.
- **Drop or disable indexes and constraints during the load, rebuild after** — building an index once over the finished data is much cheaper than maintaining it per row. Rebuild with `CONCURRENTLY` if the table is live.
- Load into a **staging table**, validate, then swap or merge. For a partitioned table, load into a detached partition and `ATTACH` it — an instant, atomic publish.
- Chunk into transactions of manageable size, with a resumable checkpoint so a failure doesn't restart from zero.
- Throttle. The load competes with production for I/O and buffer cache; pausing between batches keeps p99 sane. Watch replication lag while loading and back off when it grows — a bulk load is the classic cause of a replica falling hours behind.
- `ANALYZE` afterwards, or every query against the new data gets a plan based on stale statistics.

---

### Q53. Multi-tenancy: database per tenant, schema per tenant, or a tenant column?

**Answer.**
- **Shared tables with a `tenant_id` column** — cheapest to operate, one migration, best resource pooling, easiest cross-tenant analytics. Risks: a single missing `WHERE tenant_id = ?` is a data breach, noisy neighbours affect everyone, and per-tenant restore is hard (you're restoring a subset of rows). Mitigate with row-level security enforced by the database rather than by discipline, and with a repository layer that makes it impossible to write an unscoped query.
- **Schema per tenant** — better isolation and per-tenant restore, but migrations run N times (and partially fail at tenant 340 of 800), and thousands of schemas strain the catalog.
- **Database (or cluster) per tenant** — strongest isolation, per-tenant backup/restore/encryption keys/residency, easy to move a big tenant to bigger hardware. Highest operational cost and worst resource efficiency at small tenant sizes.

**My default:** shared tables with RLS for a self-serve product, and database-per-tenant for a small number of large enterprise customers with regulatory requirements. Many mature products run both tiers.

**Follow-up: What forces the decision in fintech?**
Data residency and regulatory isolation requirements — a Malaysian regulator requiring data in-country, or a bank client requiring their own encryption keys — usually push at least the enterprise tier to separate databases, regardless of what's technically elegant.

---

### Q54. When would you choose a non-relational store?

**Answer.** Match the store to the access pattern:
- **Document (MongoDB)** — self-contained aggregates read and written whole, genuinely variable schemas. Weak fit when you need cross-document joins or multi-document transactional invariants.
- **Wide-column (Cassandra, ScyllaDB)** — enormous write throughput, linear scale, multi-DC active-active, and queries known in advance (you model tables per query). Weak fit for ad-hoc queries and anything needing strong consistency or joins.
- **Key-value (DynamoDB, Redis)** — point lookups by key at scale.
- **Search (Elasticsearch/OpenSearch)** — relevance ranking, full-text, faceting. Not a system of record; treat it as a derived index you can rebuild.
- **Time series (TimescaleDB, InfluxDB, Prometheus)** — append-heavy, time-ordered, downsampling and retention built in.
- **Graph (Neo4j)** — deep multi-hop traversals; fraud rings and ownership networks are the fintech case, where a 5-hop query in SQL is a nightmare.

**Why it matters.** The honest senior position is that PostgreSQL covers a surprising amount of this (JSONB, full-text, PostGIS, TimescaleDB, `pgvector`) and "boring, one system, well understood" beats a polyglot estate you can't staff. Add a specialised store when a specific access pattern is genuinely painful *and* you can articulate how it stays in sync.

---

### Q55. How do you keep a search index or cache in sync with the database?

**Answer.** Never dual-write from the application — that's the same dual-write problem as messaging (Q136), and it silently diverges. Options:

1. **Outbox + async projector** — the write transaction records an event; a consumer updates the index. Atomic with the write, at-least-once delivery, idempotent apply.
2. **CDC** — Debezium tails the log and drives the projector. No application change, but couples the projection to the physical schema.
3. **Periodic full rebuild** — the safety net for both. Any derived store must be rebuildable from the source of truth, and you should exercise that path regularly, not just in a crisis.

Then: version each document with the source row's version or LSN so out-of-order updates don't overwrite newer state, and monitor projection lag as a first-class metric.

**Why it matters.** The rule I'd state: derived stores are *disposable*. If you can't rebuild the search index from PostgreSQL in an afternoon, it has become a system of record by accident, and you have a data loss problem you haven't discovered yet.

---

### Q56. What's your approach to database schema migrations in CI/CD?

**Answer.** Versioned, immutable, checked-in migration files (Flyway/Liquibase), applied by a dedicated job rather than by every application replica at startup — otherwise ten pods race on the same lock and a migration failure becomes a rolling-restart failure.

Rules I enforce in review:
- Every migration must be backward compatible with the currently deployed application version, because both run simultaneously during a rolling deploy. Expand/contract in separate releases.
- No `ALTER` that takes a long exclusive lock without a plan — check the specific engine and version behaviour, use `CREATE INDEX CONCURRENTLY`, and set a `lock_timeout` so a blocked migration fails fast rather than queueing every query behind it.
- Migrations are tested against a production-sized copy and *timed*, so nobody is surprised by a 40-minute lock.
- Data backfills are separate from schema changes, chunked, resumable and idempotent.
- Never edit an applied migration; add a new one.

**Follow-up: What's the `lock_timeout` trick?**
A DDL statement waiting for a lock queues *behind* it every subsequent query on that table, including reads — so one blocked `ALTER` can take down the whole service in seconds. Setting `lock_timeout = '3s'` (and retrying in a loop) means the migration gives up instead of forming a queue. This is one of the highest-value operational details in PostgreSQL.

---

### Q57. How do you handle GDPR/PDPA erasure in a system with backups, replicas, caches and a warehouse?

**Answer.** Deletion in a distributed data estate is a design problem, not a `DELETE` statement. The practical patterns:

- **Crypto-shredding** — encrypt each subject's personal data with a per-subject key; erasure means destroying the key, which renders every copy — backups, warehouse, logs — unreadable without touching them. This is the only approach that scales to immutable backups.
- **Centralise PII** in one service/table with references elsewhere, so there's one place to erase rather than forty.
- **Pseudonymise in derived stores** — the warehouse and event stream carry a subject ID, not a name; erasure of the mapping is sufficient.
- **Retention policies with automated expiry** in every store, including logs and message queues (Kafka topics carrying PII need a retention and compaction story).
- **Document the exceptions** — financial records often have a legal retention obligation that overrides an erasure request, and that conflict needs a documented, defensible position rather than an ad hoc decision.

**Why it matters.** In fintech this is a compliance requirement with real penalties, and "we'll delete the row" is an answer that fails the first audit that asks about the seven-year backup.

---

### Q58. How do you decide between fixing the query, adding an index, caching it, or scaling the hardware?

**Answer.** In that order, roughly, because they differ in cost and permanence:

1. **Fix the query or the access pattern.** Free at runtime, removes the problem. Often it's an N+1, a missing predicate, or fetching 200 columns to display 3.
2. **Index.** Cheap, targeted, but costs writes forever — so I want to see the query volume justify it.
3. **Cache.** Effective but introduces a consistency and invalidation problem, plus a new failure mode (what happens when Redis is down?). Never cache to paper over a query you haven't understood — you'll cache the wrong thing and the miss path will still fall over.
4. **Scale hardware.** Fastest to deploy, buys time, doesn't remove the problem, and has a ceiling. Legitimate as a deliberate stopgap while you do 1–3; illegitimate as a strategy.
5. **Architecture** — partitioning, CQRS, sharding. Highest cost and permanence.

**Why it matters.** The ordering itself is the answer. Candidates who jump to "add Redis" or "shard it" are signalling they'd add complexity before understanding.

---

### Q59. What's the difference between a materialised view and a summary table you maintain yourself?

**Answer.** A materialised view is a stored query result the database refreshes on command — `REFRESH MATERIALIZED VIEW CONCURRENTLY` keeps it readable during refresh (at the cost of needing a unique index and being slower). It's declarative and can't drift from its definition, but PostgreSQL has no incremental refresh, so a full refresh over a huge base table is expensive and the data is only as fresh as the last refresh.

A hand-maintained summary table is updated incrementally — by trigger, by the application in the same transaction, or by a stream consumer. Always fresh (or fresh to a known lag), cheap per update, but it *can* drift, so it needs a reconciliation job that recomputes and compares.

**My rule:** materialised views for reporting that tolerates hourly staleness; incremental summary tables plus reconciliation for anything user-facing or financial. And whichever you choose, the recompute-from-source path must exist and be tested.

---

### Q60. Design the data layer for a payment service handling 5,000 transactions per second.

**Answer.** I'd start by decomposing by access pattern rather than reaching for a single store.

**Write path:** the authoritative ledger in PostgreSQL, append-only entries, partitioned by month, with the transaction and its outbox row committed together. 5,000 TPS of small inserts is well within a single well-tuned primary — inserts don't contend, there's no hot-row update if balances are derived, and the index set is kept minimal. Synchronous replication to a second AZ for RPO 0.

**Idempotency:** a keyed table with a unique constraint, checked in the same transaction (Q121 in the Java bank).

**Balances:** derived, with a maintained per-account materialised balance updated in the same transaction, sharded for any account that becomes hot, and a nightly reconciliation recomputing from entries.

**Read path:** replicas for merchant dashboards; Redis for hot lookups (merchant config, fee schedules, rate limits, fraud counters) with explicit invalidation; Elasticsearch for transaction search, fed from the outbox.

**Async:** Kafka fed by the outbox, keyed by account for ordering, driving notifications, the warehouse, fraud scoring and reconciliation.

**What I'd instrument from day one:** p99 write latency, replication lag, connection pool saturation, outbox lag, unreconciled entry count and age.

**Why it matters.** The strongest version of this answer is unglamorous: one relational database doing the money, everything else derived and disposable. Reaching for Cassandra or a sharded estate at 5,000 TPS is a signal you haven't measured what one machine does.

---

## 5. Redis & Caching

### Q61. Redis is single-threaded — why is it fast, and what does that imply?

**Answer.** Command execution runs on a single thread, so there are no locks, no context switches between commands, and every command is atomic by construction. Speed comes from everything being in memory, an efficient event loop over non-blocking I/O (epoll), simple data structures with O(1) or O(log n) operations, and the absence of coordination overhead. The bottleneck is usually network and syscalls, not CPU.

The implications are the important part:
- **One slow command blocks everything.** A `KEYS *` on a million keys, a `SMEMBERS` on a huge set, a `FLUSHALL`, or an unbounded Lua script stalls every other client. Latency isn't degraded — it's *stopped*.
- **A single instance uses one core**, so you scale by running multiple instances/shards on a box, not by adding cores.
- Redis 6+ added **threaded I/O**, which parallelises reading and writing sockets — but command execution is still single-threaded, so it helps with many connections and large payloads, not with slow commands.

**Follow-up: What commands would you disable in production?**
`KEYS`, `FLUSHALL`, `FLUSHDB`, `CONFIG`, and often `DEBUG` — via `rename-command` or ACLs. Use `SCAN` instead of `KEYS`: it's cursor-based, O(1) per call, and doesn't block, at the cost of weaker guarantees (keys present throughout the iteration are returned; keys added or removed during it may or may not be, and you may see duplicates).

---

### Q62. Walk me through Redis data structures and a real use for each.

**Answer.**
- **String** — cached JSON, counters (`INCR` is atomic), bitmaps via `SETBIT`. Distributed lock via `SET key val NX PX ttl`.
- **Hash** — an object with independently updatable fields (`HINCRBY` for per-field counters). Much more memory-efficient than N strings when small, thanks to the listpack encoding.
- **List** — a simple queue (`LPUSH`/`BRPOP`), a capped recent-activity feed (`LPUSH` + `LTRIM`).
- **Set** — membership and deduplication, plus set algebra (`SINTER` for "customers in both segments"). Random member sampling with `SRANDMEMBER`.
- **Sorted set (ZSET)** — leaderboards, priority queues, sliding-window rate limiting (score = timestamp, `ZREMRANGEBYSCORE` to trim), and time-ordered indexes. The workhorse structure.
- **Stream** — an append-only log with consumer groups: the right choice when you need a queue with acknowledgements and replay inside Redis.
- **HyperLogLog** — approximate distinct counts in 12 KB regardless of cardinality, ~0.81% error. Unique visitors per day across a billion events.
- **Bitmap / Bitfield** — per-user daily flags (365 bits per user per year), feature flags at scale.
- **Geospatial** — radius queries; "ATMs within 2 km".

**Why it matters.** The signal here is choosing the structure that makes the operation atomic and O(log n) rather than fetching data to the application and computing there. A leaderboard done with a ZSET is one command; done with strings it's a race condition.

---

### Q63. How does Redis expire keys?

**Answer.** Two mechanisms working together. **Lazy**: when a key is accessed, Redis checks its TTL and deletes it if expired. **Active**: 10 times a second, Redis samples 20 keys from the set of keys with TTLs, deletes the expired ones, and if more than 25% were expired, repeats immediately — an adaptive loop that bounds the amount of expired-but-present data without scanning everything.

Consequences: memory isn't freed at exactly the TTL, so `used_memory` lags. A large set of keys expiring at the same instant causes a CPU spike and a latency blip. And on replicas, keys aren't expired independently — the primary sends an explicit `DEL` when it expires a key, so replicas can briefly return logically-expired keys to reads (though modern versions filter them out on read).

**Follow-up: Why does a synchronised expiry cause problems?**
If you set a 1-hour TTL on ten thousand keys during a deploy, they all expire in the same second: a CPU spike from active expiry, then a stampede of misses hitting your database simultaneously. Always add **jitter** — `ttl = base + random(0, base * 0.1)`.

---

### Q64. Explain Redis eviction policies and how you'd choose one.

**Answer.** When `maxmemory` is reached, `maxmemory-policy` decides:
- `noeviction` (default) — writes fail with an error. Correct when Redis holds data you cannot lose (a queue, a lock, session state you have no other copy of); you want a loud failure and an alert.
- `allkeys-lru` / `allkeys-lfu` — evict from all keys. Correct for a pure cache.
- `volatile-lru` / `volatile-lfu` / `volatile-ttl` / `volatile-random` — evict only keys with a TTL. Useful for a mixed instance where some keys are persistent state, though mixing durable state and cache in one instance is itself something I'd push back on.

**LRU vs LFU:** Redis's LRU is *approximated* — it samples `maxmemory-samples` keys (default 5) and evicts the oldest among them, because true LRU would need a linked list per access. LFU (Redis 4+) tracks access *frequency* with a probabilistic counter that decays over time, which is much better when you have a stable hot set plus occasional large scans — LRU would let one batch job evict your entire working set, LFU won't.

**My default for a cache:** `allkeys-lfu`.

**Follow-up: How much memory do you leave free?**
Enough for the fork during RDB/AOF-rewrite (copy-on-write can double memory in the worst case for write-heavy workloads), plus client output buffers and replication backlog. Running at 90% of the box with `maxmemory` set to the box size is how you get OOM-killed mid-fork. I'd size `maxmemory` at roughly 50–60% of available RAM if persistence with forking is enabled.

---

### Q65. RDB vs AOF — what durability do you actually get?

**Answer.** **RDB** is a point-in-time binary snapshot, written by forking a child that walks the dataset (relying on copy-on-write). Compact, fast to load on restart, minimal runtime cost — but you lose everything since the last snapshot, so with `save 900 1` your RPO could be 15 minutes.

**AOF** appends every write command to a log. `appendfsync` controls durability: `always` (fsync per command — safest, slowest), `everysec` (default — lose at most one second), `no` (OS decides — fastest, worst RPO). The AOF grows, so it's periodically rewritten (also via fork) into a compact form. Redis 7 uses a multi-part AOF (a base file plus incrementals) which made rewrites much less disruptive.

Running both is common: AOF for recovery fidelity, RDB for fast restarts and backups.

**Why it matters.** The honest framing: even `appendfsync always` doesn't make Redis a database of record, because replication is asynchronous and a failover can lose acknowledged writes. If losing data is unacceptable, the source of truth belongs in a database and Redis holds a derived copy. Deciding that explicitly is the senior move.

**Follow-up: What's the fork latency problem?**
Both RDB snapshots and AOF rewrites `fork()`. On a large instance the fork itself blocks the main thread while the OS copies page tables — potentially hundreds of milliseconds on a 50 GB instance — and then copy-on-write causes memory to balloon under write load. Symptoms are periodic latency spikes correlated with `rdb_last_bgsave_time`. Mitigations: disable transparent huge pages (a big one — THP makes COW copy 2 MB pages instead of 4 KB), smaller instances, and taking snapshots from a replica instead of the primary.

---

### Q66. How does Redis replication and Sentinel HA work?

**Answer.** Replication is asynchronous: the primary streams commands to replicas; replicas serve reads (stale by the replication lag). Initial sync is a full RDB transfer; reconnects use a partial resync from the replication backlog if the offset is still in the buffer, otherwise a full resync (which forks and transfers the whole dataset — expensive, so size `repl-backlog-size` for your network blips).

**Sentinel** is a separate quorum of processes that monitor the primary, agree it's down, elect a leader, promote a replica, and reconfigure the others. Clients ask Sentinel for the current primary address, so they need a Sentinel-aware client.

The gap: because replication is async, a failover **loses any writes not yet replicated**. `min-replicas-to-write` / `min-replicas-max-lag` let you make the primary refuse writes when insufficient replicas are keeping up — trading availability for a bounded RPO — but there's no synchronous mode. This is the specific reason a Redis-based lock or a Redis-held counter is not a correctness mechanism (Q69).

---

### Q67. Explain Redis Cluster.

**Answer.** Data is partitioned across 16,384 **hash slots**; the slot for a key is `CRC16(key) mod 16384`, and each primary owns a slot range. Clients are cluster-aware: they keep a slot→node map and route directly, and on a `MOVED` or `ASK` redirect they update the map. Resharding migrates slots between nodes, key by key, while staying online.

The big constraint: **multi-key operations only work when all keys are in the same slot.** `MGET a b c`, transactions, and Lua scripts touching multiple keys fail across slots. The fix is **hash tags** — only the part inside `{}` is hashed, so `user:{1234}:profile` and `user:{1234}:orders` land on the same slot deliberately. Overuse of one tag creates a hot slot you can't split, so the tag must be a genuinely well-distributed entity key.

Failover: primaries have replicas; on failure, the cluster's nodes gossip, a majority of primaries agree the node is failed, and a replica is promoted. So you need an odd number of primaries and at least 3 to have a meaningful quorum.

**Follow-up: Cluster vs multiple independent instances with client-side sharding?**
Cluster gives online resharding and automatic failover, at the cost of the multi-key restrictions and operational complexity. Client-side sharding is simpler and gives you full freedom per instance, but resharding is a manual project. For a pure cache where you can tolerate a rebuild, client-side consistent hashing is often perfectly adequate — and simpler to reason about.

---

### Q68. Pipelining vs `MULTI/EXEC` vs Lua — when do you use which?

**Answer.**
- **Pipelining** — send N commands without waiting for each reply, amortising round-trip time. Purely a *latency* optimisation: no atomicity, commands from other clients can interleave. A batch of 100 GETs goes from 100 RTTs to 1.
- **`MULTI`/`EXEC`** — queues commands and executes them atomically as a unit, with nothing interleaved. But it's not a transaction in the database sense: there's no rollback (a command that fails at runtime doesn't undo the others), and you can't make a decision based on an intermediate result. `WATCH` gives optimistic locking — the transaction aborts if a watched key changed — so you can implement check-then-set with a retry loop.
- **Lua scripts (`EVAL`)** — executed atomically on the server, and crucially you can *branch on values you read*. This is the right tool for any read-decide-write operation: rate limiters, conditional lock release, atomic dequeue-and-move.

**Why it matters.** The rule: if the logic needs to look at a value before deciding what to write, `MULTI` cannot do it and Lua can. Almost every correct Redis-based rate limiter or lock is a Lua script for exactly this reason.

**Follow-up: What are the constraints on Lua scripts?**
They block the server for their duration, so they must be short and bounded — no unbounded loops over a large key space. They must be deterministic (older versions rejected non-deterministic commands; modern ones use effect-based replication, which relaxed this). All keys the script touches must be declared in `KEYS` so Cluster can route it, and they must hash to the same slot. Use `EVALSHA` with `SCRIPT LOAD` to avoid shipping the source every call. Redis 7 Functions are the more structured successor.

---

### Q69. Is a Redis-based distributed lock safe?

**Answer.** Not for correctness. The standard implementation is `SET lock:key <random-token> NX PX 30000`, with release via a Lua script that deletes only if the token matches (so you never release someone else's lock).

That handles the obvious bugs, but not the fundamental one: **a lock with a TTL is a lease**. If your process pauses — a GC pause, a hypervisor steal, a network partition, an OS scheduling stall — past the TTL, the lock expires, another process acquires it, and now two processes both believe they hold it. The client cannot detect its own pause, so no amount of clock-checking fixes this. Redlock (the multi-instance algorithm) doesn't fix it either; Kleppmann's critique of Redlock is exactly this point, and it's a good thing to be able to summarise.

The correct fix is **fencing tokens**: the lock grants a monotonically increasing token, and the *protected resource* rejects writes with a token lower than one it has already accepted. But if the resource can do that, it can usually do the concurrency control itself — which means you should have used a database constraint or a conditional update instead.

**My position:** Redis locks are fine as an *optimisation* — preventing duplicate work in a cron, avoiding two workers doing the same expensive cache refresh — where a rare double execution is harmless. They are not acceptable where a double execution means a double payout. There, use the database's own atomicity, or make the operation idempotent so double execution doesn't matter.

---

### Q70. Compare caching patterns: cache-aside, read-through, write-through, write-behind.

**Answer.**
- **Cache-aside (lazy loading)** — the application checks the cache, and on a miss reads the database and populates the cache. The most common pattern. Pros: only requested data is cached, cache failure degrades to slow rather than broken. Cons: every miss pays the full latency, the first request after an invalidation is slow, and stale data persists until TTL or invalidation.
- **Read-through** — the cache itself loads from the backing store on a miss, so the application only talks to the cache. Cleaner application code, but the cache becomes a dependency in the critical path and needs to know how to load.
- **Write-through** — writes go to the cache, which synchronously writes to the database. Cache is always consistent, but every write pays both latencies, and you cache data that may never be read.
- **Write-behind (write-back)** — writes go to the cache and are flushed to the database asynchronously. Excellent write throughput and absorbs spikes, but a cache failure loses acknowledged writes. Only acceptable for data you can afford to lose — never a ledger.
- **Refresh-ahead** — proactively refresh popular entries before they expire, so users rarely see a miss. Good for predictable hot keys, wasteful otherwise.

**My default:** cache-aside with TTL plus explicit invalidation on write. It fails safe, and the failure mode is understandable at 3am.

---

### Q71. What's the correct order: invalidate the cache before or after writing the database?

**Answer.** **Delete after the database write**, and delete rather than update.

Delete-before-write races: you delete, another thread reads a miss, loads the *old* value from the database, and populates the cache — then your write commits. The cache now holds stale data indefinitely. Delete-after-write narrows the window substantially but doesn't eliminate it (a reader that started before your write can still write back a stale value after your delete).

Techniques to close the remaining gap:
- **Delete rather than update.** Updating the cache from two concurrent writers can apply them out of order and leave the older value; deleting means the next reader loads the truth.
- **Short TTL as a backstop** — the gap self-heals in seconds, which is usually acceptable.
- **Delayed double delete** — delete, write, then delete again after a short delay to clear anything a racing reader repopulated.
- **Invalidate from the write-ahead log via CDC or an outbox** — the invalidation is then ordered with the commit, which is the actually-correct solution.
- **Version stamps** — store the row's version alongside the cached value and reject writes to the cache carrying an older version.

**Why it matters.** "Cache invalidation is hard" is a joke; being able to enumerate the specific race and its mitigations is the interview answer.

---

### Q72. What is a cache stampede and how do you prevent it?

**Answer.** A popular key expires and a thousand concurrent requests all miss simultaneously, all query the database with the same expensive query, and the database falls over — often taking the recovery with it, because every retry does the same thing.

Mitigations:
- **Per-key mutex / single-flight** — the first miss acquires a short lock and recomputes; others either wait briefly or serve the stale value. This is the standard fix, and Redis is the natural place for the lock (an optimisation-grade lock, so its weaknesses don't matter here).
- **Probabilistic early expiration** — each reader recomputes with probability increasing as the TTL approaches, so one lucky request refreshes the value before it expires and nobody ever sees a miss. Elegant, and no lock needed.
- **Serve stale while revalidating** — keep the value past its logical TTL and refresh in the background; readers never block.
- **TTL jitter** — prevents *many different keys* expiring simultaneously (which is a related but distinct problem, sometimes called cache avalanche).
- **A request coalescer in the application** — deduplicate identical in-flight loads within a process before they even reach Redis.

---

### Q73. What is cache penetration, and how does it differ from a stampede?

**Answer.** Penetration is when requests are for keys that **don't exist** — so the cache never populates and every request hits the database. It's the standard shape of a malicious probe (requesting random user IDs) but it also happens innocently with deleted entities or bad client-side pagination.

Fixes:
- **Cache the negative result** with a short TTL — a sentinel meaning "not found". Short, because the entity may be created later; and be careful not to cache a "not found" that was actually a database error.
- **Bloom filter** in front of the cache — a compact probabilistic structure that answers "definitely not present" or "possibly present". No false negatives, so a definite-no can be rejected without touching the database. Ideal for a large, mostly-static key space.
- **Validate the key shape** before looking it up at all — if IDs are UUIDs, reject anything that isn't one for free.
- **Rate limit per client**, since the malicious version is a volume attack.

**Follow-up: And cache avalanche?**
Many keys expiring at once, or the cache itself going down, sending the full load to the database in an instant. Defences: TTL jitter, a small in-process L1 cache so a Redis outage doesn't mean 100% miss, a circuit breaker plus load shedding in front of the database, and warming the cache before taking traffic after a restart.

---

### Q74. What's the hot key problem and how do you fix it?

**Answer.** One key receives a disproportionate share of traffic — a celebrity user, a flash-sale product, a global config key read on every request. In Redis Cluster, a key lives in exactly one slot on one node, so that node saturates while the rest of the cluster idles. You cannot shard your way out of it, because the key is atomic.

Fixes:
- **Local (L1) cache** in the application with a very short TTL (1–5 seconds). This is the highest-leverage fix: a hot key by definition is read constantly, so a 1-second local cache removes 99% of the Redis traffic while bounding staleness. Redis client-side caching (RESP3 tracking) automates the invalidation.
- **Key replication** — store `hotkey:0..N` copies and have clients read a random one, writing to all. Multiplies read capacity, complicates writes.
- **Read replicas** for the shard, if reads dominate.
- **Fix the access pattern** — if every request reads a global config key, the config belongs in application memory refreshed periodically, not in Redis.

**Follow-up: How do you find hot keys?**
`redis-cli --hotkeys` (needs LFU), `MONITOR` sampled briefly (never leave it running — it's a firehose that itself degrades the server), the `LFU` counters via `OBJECT FREQ`, or client-side instrumentation, which is usually the most practical.

---

### Q75. What's the big key problem?

**Answer.** A single key holding an enormous value — a 500 MB list, a set with ten million members, a hash with a million fields. Problems: any operation touching it whole (`LRANGE 0 -1`, `SMEMBERS`, `HGETALL`, `DEL`) blocks the single thread for a long time; it makes memory distribution across a cluster uneven; it saturates network on transfer; and expiring or deleting it causes a latency spike.

Fixes: split into chunks (`key:part:1..N`), use a structure that supports incremental access (a ZSET read by rank ranges, or a Stream), delete asynchronously with `UNLINK` instead of `DEL` (which frees memory in a background thread), and set a size ceiling in the application so the structure can't grow unbounded.

**Follow-up: How do you find them safely?**
`redis-cli --bigkeys` (it uses SCAN and sampling, so it's safe on a live instance) or an offline analysis of an RDB dump with `rdb_tools`, which has zero production impact and gives you a full memory breakdown.

---

### Q76. Implement a distributed rate limiter in Redis.

**Answer.** Token bucket in a Lua script, so the read-decide-write is atomic:

```lua
-- KEYS[1]=bucket  ARGV: rate, capacity, now, requested
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or tonumber(ARGV[2])
local ts     = tonumber(b[2]) or tonumber(ARGV[3])
local delta  = math.max(0, tonumber(ARGV[3]) - ts)
tokens = math.min(tonumber(ARGV[2]), tokens + delta * tonumber(ARGV[1]))
local allowed = tokens >= tonumber(ARGV[4])
if allowed then tokens = tokens - tonumber(ARGV[4]) end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', ARGV[3])
redis.call('EXPIRE', KEYS[1], 60)
return { allowed and 1 or 0, tokens }
```

Alternatively a sliding-window log with a ZSET: `ZREMRANGEBYSCORE` to drop old entries, `ZCARD` to count, `ZADD` to record — also in one script. More accurate, more memory.

Operational decisions that matter as much as the algorithm: what happens when Redis is unavailable (fail open for availability, fail closed for protection — decide per endpoint and make it explicit); a local first-tier limit so obvious rejects don't cost a round trip; and returning `429` with `Retry-After` and `X-RateLimit-*` headers so well-behaved clients self-regulate.

---

### Q77. Redis Streams vs Pub/Sub vs Lists for messaging.

**Answer.**
- **Pub/Sub** — fire-and-forget broadcast. No persistence, no acknowledgement, no replay: a subscriber that's disconnected for 200 ms misses those messages permanently. Fine for cache invalidation broadcasts and live-presence updates; never for anything you need delivered.
- **Lists** (`LPUSH`/`BRPOP`) — a simple work queue with at-most-once semantics by default: `BRPOP` removes the message, so a worker crash loses it. `BLMOVE` into a processing list gives you reliable-queue semantics with a recovery sweep. Workable, but you're building broker features yourself.
- **Streams** — an append-only log with consumer groups, per-consumer pending entry lists (PEL), explicit `XACK`, `XAUTOCLAIM` for recovering messages from dead consumers, and replay from any ID. This is the right choice when you need a real queue inside Redis.

**Follow-up: When would you use Redis Streams instead of Kafka?**
When you're already running Redis, the volume is modest, retention needs are short, and you value one less system. Streams are memory-resident (bounded by `MAXLEN`), have weaker durability, and lack Kafka's ecosystem, partitioning model, and retention economics. For an event backbone, use Kafka. For a low-latency internal work queue in a service that already depends on Redis, Streams are pragmatic.

---

### Q78. How does Redis memory usage work — why is my 100-byte value costing 200 bytes?

**Answer.** Per-key overhead: the key string, a `robj` wrapper, the dict entry with pointers, TTL storage in a second dict, and jemalloc's size-class rounding. That's roughly 50–100 bytes per key before your data. Millions of small keys are therefore dominated by overhead.

The big lever is **encodings**. Small collections use compact contiguous representations — listpack for small hashes, lists and sorted sets; intset for all-integer sets — which are dramatically smaller than the hashtable/skiplist forms. The thresholds are configurable (`hash-max-listpack-entries`, `-value`, etc.), and crossing one converts the structure permanently (it never converts back).

So the classic optimisation is **bucketing**: instead of a million string keys `user:123:name`, use ten thousand hashes of a hundred fields each, keyed by `user:{id/100}`. The hashes stay listpack-encoded and you can save 5–10× memory. Instagram's well-known write-up on this is worth citing.

**Follow-up: How do you analyse it?**
`MEMORY USAGE <key>` for a single key, `MEMORY DOCTOR`, `INFO memory` for the overall picture including fragmentation ratio, and `--bigkeys`/RDB analysis for a breakdown. Watch `mem_fragmentation_ratio`: well above 1.0 means allocator fragmentation (activedefrag can help); *below* 1.0 means Redis is swapping, which is catastrophic for latency and should be prevented outright.

---

### Q79. How do you diagnose Redis latency spikes?

**Answer.** In order of likelihood:

1. **Slow commands** — `SLOWLOG GET`, plus `INFO commandstats` for per-command aggregate latency. Look for `KEYS`, big-key operations, expensive Lua.
2. **Fork latency** — correlate spikes with `rdb_last_bgsave_time_sec` / AOF rewrites. Disable transparent huge pages; this is the single most common configuration cause.
3. **Swapping** — check for any swap usage at all; Redis and swap are incompatible.
4. **Eviction pressure** — running right at `maxmemory` means every write triggers eviction work.
5. **Expiry storms** — many keys expiring at once (Q63).
6. **Network / client** — `CLIENT LIST` for large output buffers, and connection churn from a client that isn't pooling.
7. **Blocked clients** on `BLPOP`/`WAIT`, and replica sync activity.

`redis-cli --latency` and `--intrinsic-latency` separate "the server is slow" from "the box's scheduler is slow", which is a genuinely useful distinction on noisy virtualised hardware.

---

### Q80. Redis vs Memcached.

**Answer.** Memcached is a pure multi-threaded key-value cache: strings only, no persistence, no replication, LRU eviction, and a slab allocator. It scales vertically across cores better than a single Redis instance and has slightly lower overhead for the simplest use case.

Redis gives you rich data structures, atomic server-side operations, Lua, persistence, replication, cluster, pub/sub and streams. For most teams, the data structures alone decide it — the ability to do a leaderboard, a rate limiter, or a set intersection atomically on the server is worth more than a marginal throughput difference.

I'd choose Memcached only for a large, simple, purely ephemeral fragment cache where multi-core throughput per node matters and nothing else does.

---

### Q81. When would you *not* add a cache?

**Answer.** When the underlying query is fast and the hit rate would be low — you've added a network hop, a serialisation cost and a failure mode for nothing. When the data must be strictly correct on every read (a balance check before a transfer). When invalidation is genuinely hard and staleness has real consequences. When write volume exceeds read volume, so entries are invalidated before they're reused. And when the cache would be masking a problem you should fix — a missing index, an N+1, a query fetching 200 columns.

The other thing I'd raise: a cache changes your failure modes. Once you depend on a 95% hit rate, a cold cache after a restart or a Redis failover means 20× the normal database load, instantly. So any cache in the critical path needs: a bounded-concurrency miss path, a circuit breaker, and a tested answer to "what happens when the cache is empty at peak?" Teams discover this during an incident far more often than during design.

**Follow-up: How do you decide the TTL?**
From the business tolerance for staleness, not from a technical instinct. Ask "if this is 30 seconds out of date, what does the user see, and does it matter?" Fee schedules can be minutes; a fraud counter can be seconds; an account balance shown before a transfer should not be cached at all.

---

### Q82. What is client-side caching in Redis 6+?

**Answer.** RESP3 **tracking**: the client caches values locally, and the server remembers which keys each client has cached and pushes an invalidation message when they change. You get local-memory read latency with server-driven invalidation instead of blind TTLs.

Two modes: default tracking (the server tracks per-client keys — accurate, but costs server memory) and **broadcast mode** (the server broadcasts invalidations for key prefixes without tracking individuals — cheap, but noisier). There's also an opt-in mode where the client explicitly declares which keys it's caching.

**Why it matters.** It's the principled fix for the hot key problem (Q74) — the two-tier cache with a correctness story instead of a "1-second TTL and hope". The trade-off is complexity and a window of staleness between the write and the invalidation arriving.

---

### Q83. How would you use Redis for session storage, and what are the pitfalls?

**Answer.** A hash per session keyed by session ID, with a TTL refreshed on access to implement sliding expiry. It's a good fit: sessions are small, hot, naturally expiring, and tolerate loss better than most data.

Pitfalls: `maxmemory-policy` must not be `allkeys-lru`, or an unrelated cache surge will evict live sessions and log everyone out — this is the argument for separating cache and session instances entirely. Persistence configuration matters more than for a pure cache, because a restart logs out every user. Big session objects (people put entire shopping carts and user profiles in there) become a bandwidth and memory problem. And storing anything sensitive means it's sitting in memory and in RDB files, so encrypt or tokenise it.

Also: session affinity is no longer needed once sessions are in Redis, which is the point — but check that the framework isn't still writing local session state alongside it.

---

### Q84. How do you monitor Redis?

**Answer.** From `INFO` plus client-side instrumentation:
- **Hit ratio** (`keyspace_hits` / (hits + misses)) — the single number that says whether the cache is doing its job. A collapsing hit rate is usually the first sign of an eviction or invalidation problem.
- **`used_memory` vs `maxmemory`, `evicted_keys`, `expired_keys`** — eviction climbing means you're undersized.
- **`mem_fragmentation_ratio`** and any swap usage.
- **Latency percentiles from the client**, plus `SLOWLOG` length growth.
- **`connected_clients`, `blocked_clients`, `rejected_connections`** — connection leaks show here first.
- **`instantaneous_ops_per_sec`** and per-command stats.
- **Replication**: `master_link_status`, `master_repl_offset` minus the replica's offset, and `rdb_bgsave_in_progress`.
- **Cluster**: slot coverage and node state.

Alert on eviction rate, hit ratio drop, replication link down, and memory above ~75% of `maxmemory`.

---

### Q85. Design a two-tier cache for a service serving 50,000 requests per second.

**Answer.** **L1** in-process (Caffeine): a few thousand entries, size-bounded, TTL of 1–10 seconds depending on staleness tolerance. It absorbs hot keys, survives a Redis outage, and costs nothing per read. **L2** Redis: larger, shared across instances, TTL in minutes, so a new pod or an L1 eviction doesn't hit the database.

The design decisions that matter:
- **Invalidation** — Redis pub/sub or client-side tracking to invalidate L1 across all pods on a write; otherwise L1's TTL is your consistency bound, which must be acceptable to the business.
- **Miss path protection** — single-flight per key so a stampede on L1 miss doesn't become N concurrent Redis calls, and again at L2 so it doesn't become N database queries.
- **Negative caching** with a short TTL for penetration.
- **Jittered TTLs** at both levels.
- **Graceful degradation** — Redis timeouts are short (tens of milliseconds) and a Redis failure falls through to the database behind a circuit breaker and a concurrency limiter, not into an unbounded thundering herd.
- **Measure per tier**: L1 hit rate, L2 hit rate, and origin QPS. The number that matters operationally is origin QPS at a cold start, because that's your worst case.

**Why it matters.** A strong answer treats the *cold-cache* case as the design constraint. Anyone can describe a cache that works when it's full.

---

## 6. RabbitMQ

### Q86. Explain the AMQP model.

**Answer.** Publishers never publish to queues — they publish to an **exchange** with a **routing key**. The exchange applies its type's rules against its **bindings** to decide which **queues** receive a copy. Consumers subscribe to queues. That indirection is the point: publishers know nothing about who consumes, and you can add or remove consumers by changing bindings without touching the producer.

The default exchange (`""`) is a direct exchange with an implicit binding from every queue to its own name, which is why `basicPublish("", "my-queue", msg)` appears to publish straight to a queue. Convenient, and a habit that hides the model from people until they need routing.

A **connection** is a TCP connection; **channels** are lightweight multiplexed sessions within it. Open one connection per process (or a small pool) and a channel per thread — never a connection per message, and never share a channel across threads.

---

### Q87. Compare the exchange types.

**Answer.**
- **Direct** — routes when the routing key matches the binding key exactly. Point-to-point and simple round-robin work distribution.
- **Fanout** — copies to every bound queue, ignoring the routing key. Broadcast: cache invalidation, notifying every service of an event.
- **Topic** — pattern matching on dot-separated routing keys, with `*` (one word) and `#` (zero or more words). `payment.authorised.MY` can be consumed by bindings `payment.#`, `payment.*.MY`, or `#`. This is the workhorse for event-driven systems and the one I'd default to, because it leaves room to add consumers with narrower interests later.
- **Headers** — routes on header key/value matching with `x-match: any|all`, ignoring the routing key. Useful when routing depends on multiple independent attributes; slower and rarer.

Plus the **consistent hash exchange** plugin, which distributes messages across queues by hashing the routing key — the way to get Kafka-like per-key ordering with parallel consumers in RabbitMQ.

**Follow-up: How do you design routing keys?**
Hierarchical, most-general-first: `<domain>.<entity>.<event>.<qualifier>`, e.g. `payments.transaction.authorised.MY`. That lets subscribers bind at whatever granularity they need. Treat routing keys as a public interface — once consumers bind to them, changing the scheme is a breaking change.

---

### Q88. Explain acknowledgements and prefetch.

**Answer.** With `autoAck=false`, a message is delivered but stays "unacknowledged" until the consumer sends `basic.ack`. If the channel or connection dies first, the broker requeues it — that's the at-least-once guarantee. `basic.nack`/`basic.reject` with `requeue=false` sends it to a dead-letter exchange if configured, or drops it.

**Prefetch** (`basic.qos`) caps how many unacknowledged messages a consumer may hold. It is the single most important RabbitMQ tuning knob:
- Unlimited (the default) — the broker pushes everything it can to the first consumer, which buffers thousands of messages in memory, breaks fair distribution across consumers entirely, and loses them all back to a requeue if it dies.
- Prefetch 1 — perfectly fair, but a round trip per message, so throughput suffers badly on fast consumers.
- The sweet spot for typical work is 10–100, higher for very fast consumers on a high-latency network. The rough model: prefetch ≈ (processing rate × round-trip time), rounded up.

**Follow-up: When should you use `autoAck=true`?**
Only when losing messages is genuinely acceptable — metrics, logs, live presence updates. It's "fire and forget" from the broker's side: it deletes the message on delivery, so a consumer crash loses everything in flight.

**Follow-up: What if processing takes 10 minutes?**
Long-running work holds an unacknowledged message the whole time. Check the consumer timeout (`consumer_timeout`, default 30 minutes in modern versions — exceeding it closes the channel and requeues, which produces a confusing infinite-retry loop). The better pattern is to ack quickly, record the job in a database, and process from there — the queue delivers work, the database tracks state.

---

### Q89. How do you guarantee a message isn't lost?

**Answer.** Four things must all be true, and people usually get three:

1. **Durable exchange and queue** — survive broker restart.
2. **Persistent messages** (`delivery_mode=2`) — written to disk. A persistent message on a non-durable queue is still lost.
3. **Publisher confirms** — the broker acks the publish once it's safely handled. Without this, `basicPublish` is fire-and-forget over TCP: the broker can be down and your publish "succeeds".
4. **Consumer acknowledgement after processing**, not before.

And the honest caveat: even with all four, a single broker's disk can die. Real durability needs replication — **quorum queues** (Q91), which replicate via Raft across nodes.

**Follow-up: Publisher confirms vs transactions?**
AMQP transactions (`tx.select`/`tx.commit`) are synchronous and roughly 250× slower — they're effectively unusable at volume. Confirms are asynchronous: you publish continuously and handle `ack`/`nack` callbacks, tracking outstanding sequence numbers so you can republish on `nack` or on connection loss. That's the pattern to use. Note confirms are per-channel and asynchronous, so a naive "publish then wait for confirm" per message throws away the benefit.

---

### Q90. Explain dead-letter exchanges and how you'd build a retry mechanism.

**Answer.** A queue with `x-dead-letter-exchange` set republishes messages to that exchange when they are: rejected/nacked with `requeue=false`, expired via TTL, or dropped because the queue hit `x-max-length`. The dead-lettered message carries an `x-death` header recording the reason, the original queue, and a count.

The naive retry — nack with `requeue=true` — is a trap: the message goes straight back to the head of the queue and is redelivered immediately, in a tight loop, at full CPU, forever.

The standard delayed-retry pattern is a **wait queue**: the main queue dead-letters to a retry queue that has a message TTL and *no consumer*, and whose own DLX points back at the main exchange. Messages sit there for the TTL, expire, and get routed back. Chain several with increasing TTLs (5s, 30s, 5m) for exponential backoff, count attempts from the `x-death` header, and after N attempts route to a real dead-letter queue for human inspection.

Alternatively, the **delayed message exchange plugin** lets you set a per-message delay directly, which is much simpler if you can install plugins.

**Follow-up: What do you do with the DLQ?**
It must be monitored and alerted on — an unwatched DLQ is a data loss mechanism with extra steps. Each message needs enough context to diagnose (original routing key, error, stack trace, trace ID) and a replay tool to re-publish after a fix. And a growing DLQ during an incident is often your best signal of what broke.

---

### Q91. Quorum queues vs classic mirrored queues.

**Answer.** Classic mirrored queues replicated by a leader/mirror protocol that had well-known failure modes: it could lose messages during partition recovery, synchronisation of a new mirror blocked the queue, and the semantics under partition were subtle. They're deprecated and removed in RabbitMQ 4.x.

**Quorum queues** use Raft: a leader plus followers, with a majority required to commit. They give predictable, well-understood behaviour under partition and failure — a message confirmed to the publisher is on a majority of nodes. They also add poison-message handling via a delivery-limit (`x-delivery-limit`), which automatically dead-letters a message that's been redelivered too many times — a genuinely useful built-in.

Trade-offs: they're always durable (no transient option), they use more memory and disk per message, they need an odd number of replicas (3 or 5), and they don't support some classic features — priorities historically, and they're less suited to very large backlogs than **streams**.

**My default:** quorum queues for anything that matters, classic (non-mirrored) for genuinely transient work where loss is fine and throughput matters.

**Follow-up: What are RabbitMQ Streams?**
An append-only, replicated log (3.9+) with non-destructive reads and offset tracking — Kafka-like semantics inside RabbitMQ. Use them when you need many consumers reading the same messages, replay, or very large backlogs that would be pathological for a queue. Queues are for work distribution; streams are for event history.

---

### Q92. What happens when a queue grows to millions of messages?

**Answer.** Classic queues historically kept message *metadata* (and, for non-lazy queues, bodies) in memory, so a large backlog drove memory up until the broker hit its high watermark and applied **flow control** — blocking publishers. That's the "RabbitMQ went unresponsive" incident: a slow consumer creates a backlog, memory fills, the broker blocks publishers, and the entire upstream system stalls.

**Lazy queues** (and the queue-v2 behaviour that became the default in 3.12) page messages to disk aggressively, trading per-message latency for stable memory under deep backlogs. Quorum queues behave similarly by design.

The real answer, though, is that a deep queue is a symptom, not a condition to be tuned around. Options: scale consumers, set `x-max-length` or `x-max-length-bytes` with a dead-letter policy so the queue has a bounded size and overflow is explicit, set a message TTL so stale work expires, and apply backpressure at the producer.

**Why it matters.** RabbitMQ is a *queue* — designed for messages to pass through, not to accumulate. Kafka is a *log* — designed for retention. Using RabbitMQ as a buffer for a persistently under-provisioned consumer is using the wrong tool, and it fails in a way that takes your producers down with it.

---

### Q93. What ordering guarantees does RabbitMQ give?

**Answer.** A single queue with a single consumer preserves publish order. Add a second consumer and ordering is gone — messages are distributed round-robin and processed concurrently. Requeues also break order: a nacked message goes back near the head and is redelivered after messages that were published later.

To get per-entity ordering with parallelism, you need consistent routing to distinct queues: the **consistent hash exchange** plugin routes by hashing the routing key so all messages for one account land on one queue, each served by one consumer. That's the same partitioning idea as Kafka, implemented differently — and it's the answer when someone says "RabbitMQ can't do ordering".

**Single Active Consumer** on a queue is the other tool: multiple consumers attach but only one receives messages at a time, with automatic failover. You get ordering plus hot standby, at the cost of no parallelism within a queue.

**Follow-up: Should you even require global ordering?**
Almost never. Design consumers to be commutative or idempotent where possible, and require ordering only per entity. Requiring global ordering means one consumer, which means your throughput ceiling is one consumer's throughput forever.

---

### Q94. How do you scale consumers, and what limits it?

**Answer.** Competing consumers on one queue: add processes, each taking messages from the same queue. Prefetch tuning controls fairness. That scales until you hit one of these:

- **The queue itself is a bottleneck** — a single queue is served by a single Erlang process on a single node, so there's a ceiling (tens of thousands of messages/sec, depending on size and durability). Beyond that, shard across multiple queues with a consistent hash exchange or the sharding plugin.
- **The downstream is the bottleneck** — usually the database. Adding consumers just moves the queue from RabbitMQ to your connection pool, and often makes things worse through lock contention.
- **Ordering requirements** — per-entity ordering caps parallelism at the number of queues/partitions.

**Follow-up: How do you decide the consumer count?**
Little's Law again: concurrency = target throughput × per-message latency. 1,000 msg/s at 50 ms each needs 50 concurrent consumers. Then check that the downstream can take 50 concurrent operations — if the database pool is 20, you've built a queue in front of a queue.

---

### Q95. How does RabbitMQ handle network partitions?

**Answer.** A cluster is not partition-tolerant by default; you configure `cluster_partition_handling`:
- **`ignore`** — do nothing. Both sides continue independently, and you get split brain with divergent queue state. Only acceptable when the network genuinely cannot partition.
- **`pause_minority`** — nodes in the minority pause themselves (refusing clients) until the partition heals. This is the CP-ish choice and my default: it prevents split brain, at the cost of the minority being unavailable. Requires 3+ nodes to be meaningful.
- **`autoheal`** — after the partition heals, a winning partition is chosen and the losers restart, discarding their state. Available, but it means accepting data loss on the losing side.

Quorum queues handle this properly at the queue level via Raft — they simply can't commit without a majority — which is another argument for them.

**Also worth knowing:** RabbitMQ clustering is designed for a low-latency LAN. Do not stretch a cluster across regions. Use **Federation** (loose, asynchronous linking of exchanges/queues across brokers, tolerant of latency and outages) or **Shovel** (a configured process that moves messages from one broker to another) for cross-datacentre topologies.

---

### Q96. How do you make a RabbitMQ consumer idempotent?

**Answer.** You must, because delivery is at-least-once: a consumer that processes a message and dies before acking will see it again.

Give each message a stable business identifier (not a broker-generated delivery tag, which changes on redelivery) in a header — a payment ID, or a producer-generated UUID. Then either:
- **Make the operation naturally idempotent** — `UPDATE ... SET status='SETTLED' WHERE id=? AND status='PENDING'` is safe to run twice; a status check plus a separate write is not.
- **Dedupe with a database constraint** — insert the message ID into a processed-messages table with a unique index *in the same transaction* as the side effect. A duplicate hits the constraint and is acked without reprocessing. The transaction is what makes this correct; a Redis `SETNX` check outside the transaction has a window.
- **Version/state machine checks** — reject a message whose expected prior state doesn't match, which also protects against out-of-order delivery.

Expire the dedupe table by time, and size that window comfortably larger than your maximum possible redelivery delay.

**Follow-up: What about the `redelivered` flag?**
It's a hint, not a guarantee — it can be false on a genuine redelivery after a broker restart or failover. Never build correctness on it. Use it for logging and metrics only.

---

### Q97. What do you monitor in RabbitMQ?

**Answer.**
- **Queue depth and its rate of change** per queue — depth alone is a lagging indicator; a rising slope is the alert you want.
- **Publish rate vs deliver/ack rate** — the gap is your accumulating backlog.
- **Unacknowledged message count** — high and static means consumers are stuck, not slow.
- **Consumer count per queue** — an alert on zero consumers catches a whole class of silent failure.
- **Message age / time in queue** — often more meaningful to the business than count ("payments are being confirmed 40 minutes late").
- **Memory and disk alarms / flow-control state** — `blocked` or `blocking` connections mean publishers are being throttled, which will surface as latency in an apparently unrelated service.
- **File descriptors and socket usage**, connection and channel counts (channel leaks are a common application bug).
- **Cluster node status, partition events, and quorum queue leader/follower health.**
- **DLQ depth**, always.

---

### Q98. RabbitMQ or Kafka — how do you choose?

**Answer.** They solve different problems, and the choice usually comes down to whether messages are *work* or *facts*.

**RabbitMQ** is a smart broker with dumb consumers: complex routing, per-message acknowledgement and redelivery, priorities, TTLs, delays, and a natural fit for task distribution and RPC-ish workflows. Messages are consumed and gone. Best when you need flexible routing, per-message lifecycle control, and low-latency work dispatch to a variable pool of workers.

**Kafka** is a dumb broker with smart consumers: an ordered, partitioned, retained log. Consumers track their own offsets, so multiple independent consumer groups read the same data, replay is trivial, and throughput is enormous. Best for event streaming, event sourcing, stream processing, and any case where several teams want the same events and new consumers will appear later.

**Concretely, in a payments platform:** Kafka for the event backbone (payment lifecycle events consumed by ledger, fraud, analytics, notifications, warehouse — each independently, with replay). RabbitMQ for command-style work with complex routing and per-message retry semantics — document generation, provider callbacks, scheduled retries.

**Follow-up: Isn't running both an anti-pattern?**
It's a real cost, and I'd start with one. But the failure mode of forcing everything into one is worse: RabbitMQ used as an event store accumulates unbounded backlogs (Q92), and Kafka used for per-message delayed retry with priorities requires reimplementing a broker in your consumer. If you can only have one, Kafka is the more general foundation for an event-driven architecture — you can build work queues on it; you can't easily build a durable replayable log on RabbitMQ queues.

---

### Q99. What are the common RabbitMQ client mistakes?

**Answer.**
- **A connection per message or per operation.** Connections are expensive (TCP + AMQP handshake + Erlang process). One long-lived connection per process, channels per thread.
- **Sharing a channel across threads** — channels are not thread-safe; symptoms are corrupt frames and unexplained channel closures.
- **Unlimited prefetch** (Q88).
- **Not handling connection recovery.** Networks blip. Use the client's automatic recovery, and re-declare topology on recovery — but be aware that in-flight unacked messages are redelivered, so recovery and idempotency are the same problem.
- **Declaring queues with different arguments than they were created with** — this throws a channel-level `PRECONDITION_FAILED` and closes the channel, which surfaces as a mysterious startup failure after someone changes a TTL in code.
- **Ignoring publisher confirm nacks** or, more commonly, never enabling confirms.
- **Doing the work inside the delivery callback** on the client's I/O thread, blocking the connection's heartbeat and causing the broker to drop the connection as unresponsive.

---

### Q100. How do you do a zero-downtime change to a queue's configuration?

**Answer.** Most queue arguments (TTL, max length, dead-letter exchange) are immutable after declaration, so you cannot just change the code — a redeclare with different arguments fails.

Two approaches. **Policies** are the clean one: RabbitMQ policies apply settings like TTL, max-length, DLX and queue type to queues matching a pattern, and they can be changed at runtime without redeclaring. Prefer policies over queue arguments for anything you might want to tune, precisely for this reason.

Where the change genuinely requires a new queue (changing queue type from classic to quorum, for instance): declare the new queue, bind it alongside the old one so both receive new messages, start consumers on the new queue, let the old queue drain to zero, then unbind and delete it. Shovel can move a residual backlog. It's the same expand/contract discipline as a schema migration.

---

### Q101. Design a reliable email/notification sending pipeline on RabbitMQ.

**Answer.** Topology: a topic exchange `notifications`, with routing keys like `notification.email.transactional`. Quorum queues per channel type (email, SMS, push) so a provider outage in one doesn't block others — a bulkhead. Each queue has a DLX pointing at a retry chain with 30s/5m/30m TTLs, and a terminal DLQ after ~5 attempts.

Correctness: the producer writes the notification intent to the database and publishes from an outbox (so we never send an email for a transaction that rolled back, and never lose one that committed). Each message carries a notification ID; the consumer dedupes on it, since the provider will happily send twice. Ideally we pass the ID to the provider as *their* idempotency key too.

Operations: rate limiting per provider (a Redis token bucket) because providers throttle and a 429 storm becomes a retry storm; a circuit breaker so a dead provider doesn't burn the retry budget; consumer prefetch tuned to the provider's latency; and metrics on queue age, DLQ depth, provider error rates and per-notification-type latency.

The part people forget: **suppression and compliance** — unsubscribes, quiet hours, and a hard cap on how many times one recipient can be messaged, checked at send time rather than at enqueue time, because a message may sit in a retry queue for an hour before it's sent.

---

### Q102. What is RabbitMQ flow control and when does it bite?

**Answer.** RabbitMQ applies backpressure at two levels. **Credit-based flow control** between internal Erlang processes throttles a publisher whose messages are being accepted faster than downstream processes can handle them — you see connections in state `flow`. That's healthy and self-regulating.

**Resource alarms** are the blunt one: when memory exceeds `vm_memory_high_watermark` (default 0.4 of RAM) or free disk falls below `disk_free_limit`, the broker **blocks all publishing connections entirely** until the alarm clears. Publishers just stop, often with no error — they hang. To a service developer this looks like "the broker is down" while the management UI shows it running fine.

**Why it matters.** The failure chain is: slow consumer → backlog → memory alarm → publishers blocked → producing services' thread pools fill → cascading outage in services that never talked to a consumer. Defences: bound queue lengths, monitor memory and alarm state, use lazy/quorum queues so backlogs live on disk, and make publishers handle `connection.blocked` notifications explicitly rather than hanging.

---

### Q103. How do you handle a poison message?

**Answer.** A message that always fails — malformed payload, references a deleted entity, triggers a bug. Without protection it's redelivered forever, consuming a consumer slot and filling logs.

Detection: count redeliveries. With quorum queues, `x-delivery-limit` does this for you and dead-letters automatically. Otherwise count from the `x-death` header across the retry chain, or maintain an attempts counter keyed by message ID.

Handling: after N attempts, route to a DLQ with full diagnostic context, alert, and continue. Then classify — a permanent failure (bad schema, business rule violation) should fail fast on the first attempt rather than retrying five times, whereas a transient failure (downstream timeout) should retry. Distinguishing the two in the consumer's exception handling is what stops a DLQ from filling with things that would have succeeded and a retry queue from spinning on things that never will.

---

### Q104. How would you implement priority handling?

**Answer.** Two options. Native **priority queues** (`x-max-priority`, typically 1–10; more priority levels cost CPU and memory) sort within the queue. The catch is that priority only applies to messages *in the queue* — anything already prefetched to a consumer is committed, so a high prefetch defeats priority entirely. With `x-max-priority` you generally want a low prefetch. Also, unacked messages and the interaction with lazy queues make priorities behave less predictably at depth.

The alternative — usually better at scale — is **separate queues per priority** with consumers that poll high-priority first, or dedicated consumer pools per class. That's explicit, observable per class, and avoids starvation surprises. Add a rule so low priority isn't starved indefinitely (e.g. consume 9 high : 1 low, or promote by age).

**Why it matters.** The senior instinct is to ask *why* there are priorities: often it's because one class of work is latency-sensitive and another is bulk, and the right answer is separate queues with separately-scaled consumers — a bulkhead — rather than a shared queue with a sort order.

---

### Q105. Compare RabbitMQ's delivery guarantees to what your application actually needs.

**Answer.** RabbitMQ gives you at-most-once (autoAck) or at-least-once (manual ack, durable, confirms). It does not give exactly-once, and neither does anything else across a network boundary.

So the design question is what your consumer does with a duplicate. For an idempotent operation (setting a status, upserting a projection), at-least-once is complete. For a non-idempotent one (sending money, sending an email, incrementing a counter), you must add deduplication or an idempotency key — the broker cannot solve it for you, because the duplicate arises from the acknowledgement gap that exists in any protocol.

**Why it matters.** The clean formulation to give an interviewer: *the broker guarantees delivery; the consumer guarantees effect.* Every "exactly once" system is at-least-once delivery plus an idempotent or transactional consumer, whatever the marketing says.

---

## 7. Kafka

### Q106. Explain Kafka's architecture and storage model.

**Answer.** A **topic** is split into **partitions**; each partition is an ordered, immutable, append-only log stored as a series of **segment** files on disk, with sparse offset and timestamp indexes alongside. Each message has a monotonically increasing **offset** within its partition.

Each partition has a leader broker and follower replicas. Producers and consumers talk to the leader; followers fetch to stay in sync. Consumers within a **consumer group** each own a disjoint set of partitions and track their own offsets, so consumption is a cursor into a retained log rather than a destructive read. Different groups read the same data independently — that's the feature that makes Kafka an event backbone rather than a queue.

Since 3.3+, cluster metadata is managed by **KRaft** (a Raft quorum of controllers) instead of ZooKeeper, which was removed entirely in Kafka 4.0.

**Follow-up: Why is Kafka fast despite writing to disk?**
Sequential I/O — appending to a log is close to memory speed on modern hardware and fast even on spinning disks, unlike the random I/O a database does. It writes to the OS **page cache** rather than maintaining its own cache, so the OS handles readahead and writeback, and recently-written data is served from memory without a copy. And **zero-copy** (`sendfile`) sends bytes from page cache straight to the socket without passing through user space. Plus batching and compression amortise per-message overhead.

**Follow-up: When does zero-copy not apply?**
With TLS (the data must be encrypted in user space) and when the broker has to recompress or re-format records for an older client protocol version. Both are worth knowing because they explain sudden throughput drops after enabling encryption or after a client downgrade.

---

### Q107. Walk me through the producer's send path.

**Answer.** `send()` is asynchronous. The record is serialised, the partitioner picks a partition (by key hash, or sticky-batching round-robin when there's no key), and it's appended to an in-memory batch in the record accumulator. A background I/O thread drains batches and sends them to brokers.

The knobs that matter:
- **`batch.size`** — max bytes per partition batch. Bigger batches mean better compression and throughput.
- **`linger.ms`** — how long to wait for more records before sending. Default 0 (send immediately). Setting it to 5–20 ms trades a little latency for much better batching and is often the single biggest throughput win.
- **`compression.type`** — `lz4` or `zstd` are the practical choices; `zstd` compresses hardest, `lz4` is fastest. Compression happens per batch, so it interacts with batch size, and it reduces both network and *disk* usage since brokers store the compressed batch.
- **`buffer.memory`** and **`max.block.ms`** — when the buffer fills (because the broker is slow), `send()` blocks up to `max.block.ms` then throws. That's your backpressure signal, and applications that ignore it fail badly.
- **`acks`** and **`retries`** — durability (Q108).

**Follow-up: How do you guarantee ordering with retries?**
Historically you had to set `max.in.flight.requests.per.connection=1`, because a retried batch could land after a later one. With the **idempotent producer** enabled (`enable.idempotence=true`, the default since 3.0), the broker deduplicates and reorders by sequence number, so ordering is preserved with up to 5 in-flight requests. That's a much better throughput/ordering trade and worth knowing as a version-specific fact.

---

### Q108. Explain `acks`, ISR and `min.insync.replicas`.

**Answer.** `acks` controls when the producer considers a write successful:
- `acks=0` — never waits. Fastest, and messages vanish silently on any failure.
- `acks=1` — the leader has written it (to its page cache, not necessarily fsynced). If the leader dies before followers replicate, the message is lost.
- `acks=all` — every replica in the **in-sync replica set (ISR)** has it.

The ISR is the set of replicas caught up with the leader within `replica.lag.time.max.ms`. A replica that falls behind is removed from the ISR; it rejoins when it catches up.

The subtlety: `acks=all` alone is not enough. If replicas fail and the ISR shrinks to just the leader, `acks=all` means "the leader acknowledged" — one copy. **`min.insync.replicas=2`** with replication factor 3 forces the broker to *reject* the write when fewer than two replicas are in sync, so you never acknowledge a write that only exists once. That combination — RF=3, `min.insync.replicas=2`, `acks=all` — is the standard durable configuration, and it tolerates one broker failure while remaining writable.

**Follow-up: What is unclean leader election?**
If all in-sync replicas are lost, `unclean.leader.election.enable=true` allows an out-of-sync replica to become leader — restoring availability by **discarding** committed messages. It's false by default and should stay false for anything financial: you'd rather the partition be unavailable than silently lose acknowledged transactions. Knowing this is an availability-vs-durability choice you make deliberately is the point.

---

### Q109. Explain the idempotent producer and Kafka transactions.

**Answer.** The **idempotent producer** assigns each producer a PID and epoch, and each record a monotonically increasing sequence number per partition. The broker tracks the last sequence per (PID, partition) and discards duplicates, so a retry caused by a network timeout doesn't append twice. This gives exactly-once *delivery to a partition* for a single producer session, at essentially no cost — hence it being the default now.

**Transactions** extend this across multiple partitions and across the consume-process-produce cycle. With a `transactional.id`, the producer can atomically write to several partitions and commit consumer offsets in the same transaction. The broker writes control markers into the log, and consumers with `isolation.level=read_committed` skip records from aborted transactions and don't read past the last stable offset.

That is Kafka's exactly-once semantics (EOS), and its scope must be stated precisely: **it is exactly-once for read-from-Kafka, process, write-to-Kafka.** It does not extend to your database or an external HTTP call. For those you still need idempotency at the sink.

**Follow-up: What does EOS cost?**
Latency (consumers can only read up to the last stable offset, so an in-flight transaction delays visibility), throughput overhead from control records and coordination, and operational complexity — a `transactional.id` per producer instance, and zombie fencing via epochs when a producer is replaced. Use it where the guarantee is worth it, not by default.

---

### Q110. How do consumer groups and rebalancing work?

**Answer.** Consumers in a group send a `JoinGroup` to the **group coordinator** (a broker). One member becomes the leader and computes the partition assignment; the coordinator distributes it via `SyncGroup`. Each partition is owned by exactly one consumer in the group, so group parallelism is capped at the partition count — extra consumers idle.

Rebalances trigger when a member joins, leaves, or is deemed dead (missed heartbeats past `session.timeout.ms`, or exceeded `max.poll.interval.ms` between polls).

**Eager** rebalancing is stop-the-world: every consumer revokes *all* partitions, then the new assignment is computed and distributed. On a large group with state, that's a multi-second consumption outage every time one pod restarts. **Cooperative incremental** rebalancing (`CooperativeStickyAssignor`) only revokes the partitions that actually need to move, so most consumers keep working throughout. It's the default for Streams and the right choice for consumers too.

**Follow-up: How do you stop rebalance storms?**
- **Static membership** (`group.instance.id`): a restarting consumer rejoins with the same identity, and if it returns within `session.timeout.ms` no rebalance happens at all. This is the fix for rolling deploys causing N rebalances.
- Raise `max.poll.interval.ms` or lower `max.poll.records` so slow processing doesn't look like death. Better still, don't do long work on the poll thread.
- Use the cooperative assignor.
- Fix the actual cause — usually a consumer whose processing time occasionally spikes past the interval.

---

### Q111. How do you commit offsets, and what are the trade-offs?

**Answer.** Offsets are stored in the internal `__consumer_offsets` topic, keyed by (group, topic, partition).

- **Auto-commit** (`enable.auto.commit=true`) commits periodically on poll. Simple, and gives at-most-once-ish behaviour with a surprise: it commits offsets for records you fetched, so a crash mid-batch loses the unprocessed remainder. Fine for metrics, wrong for anything important.
- **Manual commit after processing** — `commitSync` (blocks, retries, simple, slower) or `commitAsync` (fast, no retry — a failed async commit followed by a rebalance means reprocessing). Common pattern: `commitAsync` in the loop, `commitSync` in the `finally` before closing.
- **Store the offset with your side effect** — commit the offset into your own database, in the same transaction as the work, and seek to it on assignment. This is the strongest option for a database sink, because it makes the offset and the effect atomic.

Whichever you choose, committing *after* processing gives at-least-once, which means the consumer must be idempotent.

**Follow-up: What happens with no committed offset?**
`auto.offset.reset` decides: `latest` (skip everything that exists — a new consumer group silently misses history, which surprises people during deploys), `earliest` (read from the start — a new group replays everything, which surprises people differently), or `none` (throw). Also relevant: if a group is inactive past `offsets.retention.minutes`, its offsets are deleted and it resets — a classic cause of "our consumer reprocessed a week of data after the holiday".

---

### Q112. How do you choose the number of partitions?

**Answer.** Partition count sets your maximum consumer parallelism per group and your key-level ordering granularity. Estimate from throughput: if one consumer instance handles 5 MB/s and you need 50 MB/s, you need at least 10 partitions — then add headroom for growth, because increasing partitions later has a serious consequence.

Costs of too many: more open file handles and memory on brokers, longer leader election and controller failover, more end-to-end latency (replication is per-partition), more overhead per producer batch (batching is per-partition, so 1,000 partitions means smaller batches and worse compression), and slower rebalances.

**The reason to think hard up front:** adding partitions changes `hash(key) % partitions`, so **existing keys start routing to different partitions**, and per-key ordering is broken for the transition — messages for one account can be processed out of order across two partitions. There's no online repartitioning that preserves key ordering; the safe path is a new topic with the new partition count and a controlled migration.

**Rule of thumb:** start with something like 2–3× your expected peak consumer count, in the tens rather than the hundreds for most services, and revisit deliberately.

---

### Q113. Explain retention and log compaction.

**Answer.** Two independent policies. **`delete`** removes segments older than `retention.ms` or beyond `retention.bytes` — time or size based, applied at segment granularity (so a message can outlive its retention until its segment closes).

**`compact`** retains at least the *latest* value for every key, forever, deleting superseded versions. A record with a null value is a **tombstone**, marking the key as deleted; tombstones are themselves retained for `delete.retention.ms` so consumers have a chance to see them before cleanup.

Compaction turns a topic into a durable changelog you can replay to rebuild current state — which is exactly what Kafka Streams uses for state stores, what Connect uses for offsets, and what makes a compacted topic a viable source for materialising a table.

You can also use `compact,delete` together for "keep the latest per key, but drop anything older than 90 days".

**Follow-up: What are the gotchas?**
Compaction is asynchronous and lags — the "dirty" head of the log always contains duplicates, so consumers must tolerate seeing multiple versions of a key. `min.cleanable.dirty.ratio` controls how aggressively the cleaner runs. Keys must be set (a null key can't be compacted). And a compacted topic grows with your *key space*, so a topic keyed by something unbounded (a request ID) will grow forever — a common and expensive mistake.

---

### Q114. What is consumer lag, and how do you deal with it?

**Answer.** Lag = the partition's log-end offset minus the consumer group's committed offset — how many records behind you are. Measure it per partition, not just as a group total, because one lagging partition (a hot key, a stuck consumer) is invisible in the aggregate.

I'd also measure **time lag** — the age of the last processed record — because "50,000 messages behind" means nothing to a business stakeholder while "settlement events are 12 minutes late" means everything.

Causes and fixes:
- **Not enough consumers** — scale up, capped by partition count.
- **Slow processing** — profile the consumer; usually a downstream call or an N+1. Batch downstream writes.
- **Skew** — one partition much hotter than others because of key distribution. Requires a better key or a repartition.
- **Rebalance churn** — the consumer keeps stopping (Q110).
- **A poison message** blocking a partition — the whole partition stalls behind it, which is the most important structural difference from RabbitMQ.
- **Downstream saturation** — adding consumers makes it worse.

**Follow-up: How do you recover from a huge backlog?**
Decide first whether you need the data. If it's stale (a real-time price feed), seek to the end and skip — often the right business call. If you need it, temporarily scale consumers to the partition count, increase `max.poll.records` and batch downstream writes, and consider a temporary parallel consumer group writing to a side path. And afterwards, fix whatever let it build without alerting.

---

### Q115. A single message keeps failing and it's blocking the partition. What do you do?

**Answer.** This is Kafka's fundamental trade: ordering per partition means a stuck message stops everything behind it. There's no per-message ack or redelivery like RabbitMQ.

The standard pattern is a **dead-letter topic**: try N times with backoff in the consumer, then publish the record (plus error context, original topic/partition/offset, and trace ID) to a DLT, commit the offset, and continue. Then monitor and alert on DLT depth, and provide a replay tool.

Refinements worth mentioning:
- **Distinguish retryable from permanent failures.** A deserialisation error will never succeed — send it straight to the DLT. A downstream timeout should be retried in place, because sending it to a DLT loses ordering.
- **Retry topics with increasing delays** (`retry-5s`, `retry-1m`, `retry-10m`) for retryable failures, so the main partition isn't blocked while waiting. This is Spring Kafka's non-blocking retry model.
- **Be explicit that ordering is sacrificed** the moment a message goes to a retry or dead-letter topic. If per-key ordering is a hard requirement, you must instead pause the partition and stop — accepting unavailability rather than reordering. That's a business decision, and for a payments ledger the answer is often "stop and page someone".

---

### Q116. How does Kafka replication actually work?

**Answer.** Each partition has a leader and `replication.factor - 1` followers. Followers issue fetch requests to the leader exactly like consumers do, and the leader tracks each follower's fetch position. A follower within `replica.lag.time.max.ms` is in the ISR.

The **high watermark** is the highest offset replicated to all ISR members. Consumers can only read up to the high watermark — this is what prevents you from reading a message that could still be lost if the leader fails. The **log end offset** is the leader's latest appended offset; the gap between the two is un-replicated data.

On leader failure, the controller elects a new leader from the ISR. Because the new leader has everything up to the high watermark, no acknowledged (`acks=all` with `min.insync.replicas`) data is lost. Follower truncation and leader epochs handle the edge cases where a returning replica has divergent data.

**Follow-up: What is rack awareness and why does it matter?**
`broker.rack` lets Kafka spread a partition's replicas across racks/availability zones, so an AZ failure doesn't take out all replicas of a partition. Without it, random assignment can put all three replicas of some partition in one AZ, and you'll only discover it during an outage. Consumers can also fetch from the closest replica (`client.rack`), cutting cross-AZ data transfer costs substantially — a real operational win people miss.

---

### Q117. What is a schema registry and which compatibility mode do you choose?

**Answer.** A registry stores versioned schemas (Avro, Protobuf, JSON Schema) and the serialiser writes a small schema ID into each record rather than the full schema. Consumers fetch the schema by ID to deserialise. The registry enforces compatibility rules at *registration* time, so an incompatible schema is rejected in CI rather than breaking consumers in production.

Modes:
- **BACKWARD** (default) — a new schema can read data written with the previous schema. Upgrade **consumers first**. Allows deleting fields and adding optional fields.
- **FORWARD** — the previous schema can read data written with the new one. Upgrade **producers first**. Allows adding fields and deleting optional ones.
- **FULL** — both. The most restrictive and the safest.
- **`_TRANSITIVE`** variants check against *all* previous versions, not just the latest — which is what you actually want if consumers may be many versions behind, and is the mode most people should be using without realising.

**Why it matters.** The choice is really "who upgrades first", which is an organisational question. In a large estate where you don't control consumers, BACKWARD_TRANSITIVE is the pragmatic default. And the rule that makes it all work: **always give new fields a default value**, so both sides can cope with their absence.

---

### Q118. Explain Kafka Streams' core concepts.

**Answer.** A **KStream** is an unbounded record stream (each record is an independent event). A **KTable** is a changelog interpretation of the same log — the latest value per key, a materialised table. `GlobalKTable` is fully replicated to every instance, so it can be joined without co-partitioning (good for small reference data like currency or fee tables).

Stateful operations (aggregations, joins, windows) use local **state stores**, by default RocksDB on local disk, backed by a **changelog topic** in Kafka. That changelog is what makes the state fault-tolerant: if an instance dies, another restores the store by replaying the compacted changelog. **Standby replicas** keep a warm copy so failover doesn't require a full restore, which is the difference between seconds and hours on a large state store.

Joins require **co-partitioning** — both sides must have the same number of partitions and the same keying strategy — otherwise related records land on different instances. Kafka Streams inserts automatic **repartition topics** when you change the key, which is why a `selectKey` before a join silently adds a whole extra topic and network hop.

**Follow-up: When would you use Kafka Streams over a plain consumer?**
When you need stateful stream processing — windowed aggregations, stream-table joins, deduplication over a time window — and want the fault tolerance handled for you. For simple stateless transformations or writing to a database, a plain consumer is simpler and easier to reason about. Streams brings real operational weight (state store sizing, restore times, rebalance behaviour) that isn't justified by a `map` and a `filter`.

---

### Q119. How do you handle windowing and late-arriving data?

**Answer.** Window types: **tumbling** (fixed, non-overlapping), **hopping** (fixed, overlapping by an advance interval), **sliding** (windows defined by record proximity), and **session** (activity separated by an inactivity gap — the right model for user sessions and for grouping a burst of related payment attempts).

Late data is governed by **grace period**: how long after a window closes you'll still accept records that belong to it. Kafka Streams uses **event time** by default (from the record timestamp), not processing time, so out-of-order arrival within the grace period is handled correctly. Records later than the grace period are dropped and counted in a metric you should be watching.

`suppress(Suppressed.untilWindowCloses(...))` emits only the final result per window instead of an update per record — essential when the downstream is an alerting system or a customer-facing notification, because otherwise you emit a running total that keeps changing.

**Why it matters.** The trade is fundamental: a longer grace period means more complete results and higher latency plus more state retained. There is no correct answer, only a business decision about how late a payment can arrive and still count toward the right day.

---

### Q120. What do you monitor in a Kafka cluster?

**Answer.** Broker side:
- **Under-replicated partitions** and **offline partitions** — the two most important cluster health numbers. Non-zero under-replicated means a replica is struggling; offline means data is unavailable.
- **ISR shrink/expand rate** — flapping indicates network or GC problems.
- **Active controller count** — must be exactly 1 across the cluster.
- **Request handler idle ratio and network processor idle ratio** — the broker's saturation signals.
- **Disk usage and growth rate per broker**, log flush latency.
- **Leader imbalance** — one broker hosting a disproportionate number of leaders.
- **Produce/fetch request latency percentiles.**

Client side:
- **Consumer lag** per group and per partition (Burrow or your own exporter), plus time lag.
- **Producer**: record error rate, retry rate, buffer available bytes, batch size and compression ratio.
- **Rebalance rate** per consumer group — a sudden spike is usually the root cause of a lag alert.
- **DLT depth.**

**Follow-up: What's the single most useful alert?**
Consumer lag *trend* on business-critical groups, expressed as time. It's the closest thing to a direct measure of "is the system doing its job", and it catches broker problems, consumer problems, and downstream problems alike.

---

### Q121. How would you size a Kafka cluster?

**Answer.** From four numbers: peak write throughput (MB/s), replication factor, retention period, and read fan-out.

**Storage** = write MB/s × retention seconds × replication factor, plus headroom (I'd plan for 60–70% max utilisation, because a full disk takes a broker down and rebalancing needs space). 50 MB/s × 7 days × RF 3 ≈ 90 TB.

**Network** = write × (RF − 1) for replication, plus write × consumer group count for reads. Read fan-out is the number people forget — five consumer groups on a 50 MB/s topic is 250 MB/s of egress, likely more than your ingest.

**Brokers**: enough for the storage and network, plus enough that losing one (or an AZ) leaves you with capacity and a valid ISR. Minimum 3 for RF 3; realistically more for headroom. Spread across AZs with rack awareness.

**Memory**: Kafka wants a modest JVM heap (6–8 GB is typical — it doesn't cache in heap) and as much OS page cache as possible, because consumers reading recent data should never touch disk.

**Follow-up: What's the most common sizing mistake?**
Ignoring fan-out, and ignoring that a lagging consumer reads *old* data, which isn't in page cache — so it causes disk reads that compete with the write path. One backfilling consumer can degrade the whole cluster's latency, which is why tiered storage and consumer quotas exist.

---

### Q122. What is tiered storage and why does it matter?

**Answer.** Kafka can offload older log segments to object storage (S3/GCS) while keeping recent segments on local disk, presenting a single continuous log to clients. It decouples storage from compute: you can retain months or years without provisioning brokers for that capacity.

The operational benefits are bigger than the cost saving. Broker recovery and rebalancing get dramatically faster, because a new broker only has to replicate the local tier instead of terabytes of history. And it makes long retention a realistic default, which changes what you can do — replaying six months of events to rebuild a projection stops being a special project.

The trade-off: reads from the remote tier are much slower and have different cost characteristics, so a consumer replaying from the beginning behaves differently from one tailing the head.

---

### Q123. Should you use Kafka as a database or for event sourcing?

**Answer.** Kafka is a good **event log** and a poor **database**. It gives you durable ordered retention, replay, and multiple independent readers — which is most of what event sourcing needs. What it lacks: arbitrary queries (you can only read a partition sequentially), point lookups by anything but offset, secondary indexes, and transactional reads across entities.

So the workable pattern is Kafka as the event log plus **materialised views** — projections built by consumers into PostgreSQL, Elasticsearch, or a Kafka Streams state store queried via interactive queries. Read from the view, write to the log.

Honest limitations to raise:
- **Compaction is not a substitute for a database.** A compacted topic keyed by an unbounded key space grows forever.
- **Schema evolution over years of retained events** is genuinely hard — you'll be deserialising 2019's schema in 2026, and upcasting is code you must maintain.
- **GDPR erasure** in an immutable append-only log is a real problem; crypto-shredding is the usual answer (Q57).
- Rebuilding a projection means replaying everything, which must be fast enough to be a viable recovery path.

**Why it matters.** The strong answer is enthusiastic about the pattern and specific about the costs. Teams that adopt event sourcing without a plan for schema evolution and erasure regret it about eighteen months in.

---

### Q124. Kafka Connect — when is it the right tool?

**Answer.** Connect is a framework for moving data between Kafka and other systems without writing consumer/producer code: source connectors (Debezium for CDC, JDBC) and sink connectors (JDBC, Elasticsearch, S3, BigQuery). It handles offset management, restarts, scaling across a worker cluster, and Single Message Transforms for light reshaping.

Use it for standard integrations — CDC into Kafka, Kafka into a warehouse or search index — where a well-maintained connector exists. It saves a lot of undifferentiated code and gives you consistent operational behaviour.

Don't use it when the logic is genuinely custom (Connect's SMTs are deliberately limited; complex logic belongs in Streams or a service), when you need per-record business decisions, or when a connector's semantics don't match your needs — sink connectors' delivery guarantees vary, and "exactly once" for a JDBC sink usually means idempotent upsert by key rather than a real transaction.

**Follow-up: What's the operational reality?**
Connect is a distributed system with its own cluster, config topics, and failure modes. Connector task failures are quiet unless you monitor them — alert on connector and task state, not just the workers being up. And connector quality varies dramatically between the well-maintained ones and the community ones.

---

### Q125. How do you do Kafka across multiple datacentres?

**Answer.** Don't stretch a single cluster across high-latency links unless the latency is genuinely low (a metro-area multi-AZ setup is fine and normal; cross-region is not) — replication is synchronous to the ISR, so every `acks=all` write pays the round trip.

For cross-region: **MirrorMaker 2** (built on Connect) replicates topics between clusters asynchronously, with configurable topic renaming, offset translation for consumer group failover, and cycle detection for active-active. Confluent's Cluster Linking does the same with byte-for-byte offset preservation, which makes consumer failover much cleaner.

The hard parts aren't the replication, they're: **offsets don't map identically across clusters** without help (so a failed-over consumer may reprocess or skip); active-active topologies risk cycles and conflicting writes to the same key; and you must decide per topic whether you're doing DR (one-way, cold standby) or genuine active-active (much harder, needs conflict resolution and, usually, region-affinity for keys).

**Follow-up: What's your DR plan for Kafka?**
Define the RPO honestly — asynchronous mirroring means the RPO is your mirroring lag, and there's no synchronous cross-region option that doesn't destroy write latency. Then decide: for an event backbone, the source of truth is usually the upstream database, so DR for Kafka can mean "re-emit from the outbox after failover" rather than replicating every byte. That's often simpler and more reliable than a mirrored cluster nobody has failed over to.

---

### Q126. What are the most common Kafka production incidents?

**Answer.**
- **Consumer lag from a rebalance loop** — slow processing exceeding `max.poll.interval.ms`, so the consumer is evicted, rebalance, reprocess, evict again. The signature is lag climbing while consumers look healthy.
- **A single hot partition** — poor key distribution (e.g. keying by a tenant where one tenant is 60% of volume). Lag on one partition, others fine.
- **Disk full on a broker** — retention set too generously, or a consumer's replication falling behind. Brokers handle a full disk badly.
- **Under-replicated partitions** from a slow or GC-thrashing broker, which then risks dropping below `min.insync.replicas` and rejecting writes.
- **Poison message blocking a partition** (Q115).
- **A consumer group offset reset** after inactivity, replaying everything from `earliest` — the "why did we send 400,000 duplicate emails" incident, which is really a missing idempotency incident.
- **Schema incompatibility** breaking every consumer of a topic at once, because someone bypassed the registry or used the wrong compatibility mode.
- **Producer buffer exhaustion** blocking application threads when brokers slow down, turning a Kafka degradation into an application-wide outage.

**Why it matters.** Naming the *signature* of each — what the graphs look like — is what makes this an experience answer rather than a list.

---

### Q127. How do you tune a consumer for throughput?

**Answer.** Increase `fetch.min.bytes` and `fetch.max.wait.ms` so the broker returns fuller batches instead of many small responses. Raise `max.partition.fetch.bytes` and `max.poll.records` so each poll does more work. Then — the biggest lever — **batch the downstream side effect**: one bulk insert of 500 rows instead of 500 individual inserts is usually a 20× improvement, and it's the reason most consumers are slow.

Then decouple processing from polling: poll on one thread, hand work to a bounded executor, and manage offsets carefully so you only commit what's genuinely complete (the offset of the lowest incomplete record). This is where correctness bugs enter, so it needs care — but it's how you get parallelism beyond the partition count within a single consumer.

Finally, make sure you're not fighting yourself: more consumers than partitions does nothing, and adding parallelism against a saturated database makes things worse.

**Follow-up: How do you parallelise within a partition without losing per-key ordering?**
Hash the key to one of N in-process worker queues, so each key is always handled by the same worker in order, while different keys proceed in parallel. Then commit the offset only when all records up to that point are done. This gives you key-level ordering with intra-partition parallelism — the pattern used by parallel consumer libraries.

---

### Q128. What security controls does Kafka support?

**Answer.** **Encryption in transit** via TLS (note it disables zero-copy, costing throughput). **Authentication** via TLS mutual auth, SASL/SCRAM, SASL/GSSAPI (Kerberos), or SASL/OAUTHBEARER. **Authorisation** via ACLs on topics, consumer groups, and cluster operations — or RBAC in commercial distributions. **Quotas** per client/user for produce/fetch bandwidth and request rate, which double as a noisy-neighbour defence.

**Encryption at rest** is not a Kafka feature — you use disk encryption, or you encrypt payloads at the application level, which is what you'd do for card data so brokers and operators never see plaintext. Application-level encryption also interacts with compaction and schemas, so it needs designing rather than bolting on.

**Follow-up: What's the practical governance problem?**
Topic-level ACLs are coarse — a consumer either reads the whole topic or none of it. So a topic carrying PII plus non-PII forces you to grant broad access. The fix is at design time: separate topics by sensitivity, keep PII out of widely-consumed event streams, and reference it by ID so consumers that need it fetch it through an audited service.

---

### Q129. What's the difference between a Kafka consumer and a Kafka Streams application operationally?

**Answer.** A plain consumer is stateless from Kafka's perspective: restart it anywhere, it resumes from its committed offsets. Scaling is adding pods up to the partition count.

A Streams application has **local state** on disk. That changes the operations profile substantially: restarting an instance on a fresh node means restoring the state store from the changelog topic, which for a large store can take a long time — during which those partitions aren't processed. Mitigations are standby replicas (`num.standby.replicas`), persistent volumes so restarts reuse local state, and `static membership` so a rolling restart doesn't trigger reassignment at all.

You also inherit RocksDB tuning (memory, compaction, open files), changelog topic sizing, and the fact that repartition topics silently multiply your Kafka traffic.

**Why it matters.** Teams adopt Streams for the programming model and get surprised by the operational model. Being able to name state restore time as a deployment concern is a strong signal.

---

### Q130. How would you migrate a topic to a new schema or a new partition count?

**Answer.** For a **compatible schema change**, use the registry: add optional fields with defaults, upgrade in the order the compatibility mode requires, done.

For a **breaking change or a partition-count change**, treat it as expand/contract with a new topic:
1. Create `payments.v2` with the new schema/partitioning.
2. Producers dual-write to both, or a Streams job mirrors v1 → v2 with the transformation.
3. Migrate consumers one at a time to v2, verifying results against v1.
4. Once all consumers are on v2, stop producing to v1 and let it age out by retention.

The tricky part is the cutover for stateful consumers, which may need their state rebuilt from v2 — so plan the replay, and if the topic is compacted, verify that replaying it produces the same state.

**Follow-up: How do you verify the migration?**
Run both paths in parallel and compare outputs — a reconciliation job asserting that v1-derived and v2-derived results match for a period. In financial systems this dual-run verification is standard and it's what makes the cutover a non-event.

---

### Q131. Explain the CAP position of Kafka.

**Answer.** Kafka is a CP-leaning system per partition, with the trade-off exposed as configuration. With `acks=all`, `min.insync.replicas=2`, RF=3, and `unclean.leader.election=false`, a partition becomes **unavailable for writes** rather than accepting a write that might be lost — that's choosing consistency over availability under partition. Flip `unclean.leader.election` to true and you've chosen availability, accepting potential data loss.

Reads are bounded by the high watermark, so consumers never see a record that isn't replicated to the ISR — that's the consistency guarantee on the read side.

**Why it matters.** It's a good example of the general point (Q44) that CAP isn't a property of a system but a per-configuration, per-operation trade — and Kafka makes it unusually explicit.

---

### Q132. What's the relationship between Kafka partitions and database sharding?

**Answer.** Structurally the same idea and the same failure modes: a key function distributes data across independent units, and everything follows from key choice. Both give you parallelism within a unit and ordering/atomicity only within a unit. Both suffer hot spots from skewed keys. Both make cross-unit operations expensive. And both make changing the unit count painful because the key mapping changes.

The useful consequence: aligning them is powerful. If your Kafka partition key and your database shard key are the same (`account_id`), then a consumer for a partition talks to one shard, which means local transactions, no cross-shard coordination, and cache locality. Misaligning them means every message fans out across shards.

**Why it matters.** This is the kind of cross-domain observation that reads as senior — recognising that partitioning is one idea appearing in four different systems, so the reasoning transfers.

---

### Q133. When is Kafka the wrong choice?

**Answer.**
- **Low volume.** Running a Kafka cluster (or paying for a managed one) for 100 messages a second is a lot of operational surface for something a database table or a managed queue would do.
- **You need per-message operations** — priorities, individual delays, selective acknowledgement, per-message TTL. Kafka has none of these, and reimplementing them in consumers is painful.
- **Request/reply.** People do build it, but it's an awkward fit; use HTTP or gRPC.
- **You need a queryable store.** Kafka is not a database (Q123).
- **Very large messages.** Kafka is tuned for records in the kilobytes; multi-megabyte payloads hurt broker memory and replication. Use the claim-check pattern — put the blob in S3 and publish the reference.
- **Strict global ordering across all data** — that means one partition and no parallelism.

**Follow-up: What's the simplest thing that could work?**
For a lot of internal async work, a database table with `SELECT ... FOR UPDATE SKIP LOCKED` (Q29) is enough, and it comes with transactional enqueue for free. I'd want to see the volume, fan-out and replay requirements before adding a broker at all.

---

### Q134. Design an event-driven payments platform on Kafka.

**Answer.** **Topics** by domain and lifecycle, not by consumer: `payments.transaction.v1` (state changes), `payments.ledger.v1` (accounting entries), `payments.notification-request.v1` (commands). Keyed by `account_id` (or `merchant_id`) so per-account ordering holds and the partition key aligns with the database shard key.

**Producing**: the payment service commits the business change and an outbox row atomically, and a relay (Debezium or a poller) publishes. That eliminates dual-write, and the outbox row is the intentional event — not a raw table change — so the topic's schema is a designed contract rather than an accident of the schema.

**Consuming**: independent groups for the ledger projection, fraud scoring, notifications, the warehouse sink, and reconciliation. Each is idempotent, deduping on the event ID in the same transaction as its side effect. Retry topics with backoff for transient failures; a DLT with alerting for the rest.

**Schema**: Avro with a registry, `BACKWARD_TRANSITIVE`, all new fields defaulted. No PII in the event payload — a customer reference that consumers resolve through an audited service, which also solves the erasure problem.

**Durability**: RF 3 across AZs with rack awareness, `min.insync.replicas=2`, `acks=all`, no unclean election.

**Observability**: lag as *time* per group, DLT depth, outbox lag, and an end-to-end trace ID propagated in headers from the HTTP request through every consumer.

**And the reconciliation**: a periodic job comparing the ledger projection against the transactional source, alerting on any divergence. In a financial system, the assumption that the pipeline is working is not a substitute for checking that it is.

---

### Q135. Kafka vs RabbitMQ vs SQS vs a database table — give me the decision tree.

**Answer.**
- **Do you need replay, multiple independent consumers, or retention of events as a historical record?** → Kafka. Nothing else does this well.
- **Do you need complex routing, per-message priorities/delays/TTL, or fine-grained per-message acknowledgement?** → RabbitMQ.
- **Do you just need a reliable queue with minimal operations, at cloud scale, and you're on AWS?** → SQS (with FIFO queues if you need ordering and dedup, accepting the lower throughput ceiling). The lowest operational burden by a wide margin.
- **Is the volume modest, the consumers are yours, and the work is already transactional with your database?** → a table with `SKIP LOCKED`. Zero new infrastructure, transactional enqueue, and full queryability.
- **Is it a broadcast where loss is acceptable?** → Redis pub/sub, or just an HTTP call.

**The meta-answer:** start from the guarantees you need (ordering scope, delivery semantics, retention, fan-out, latency) and the operational capacity you have, not from the technology. And be willing to say that the boring option is correct — a lot of "we need Kafka" is really "we need an async boundary", and the cost of running a broker nobody on the team has operated before is a real engineering cost that belongs in the comparison.

---

## 8. Cross-Cutting Design Questions

### Q136. Implement the transactional outbox end to end.

**Answer.** Schema: `outbox(id uuid pk, aggregate_type, aggregate_id, event_type, payload jsonb, headers jsonb, created_at, published_at null)`, with a partial index on `(created_at) WHERE published_at IS NULL` so the unpublished set stays tiny regardless of table size.

Write path: the business change and the outbox insert commit in **one local transaction**. That's the whole point — no dual write, no lost events, no orphan events.

Relay, two options:
- **Polling publisher** — a loop selecting unpublished rows `ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 500`, publishing, then marking published. Simple, no extra infrastructure, easy to reason about, and adds a small latency (poll interval). `SKIP LOCKED` lets you run several publishers safely.
- **CDC (Debezium)** tailing the WAL for inserts on the outbox table. Lower latency, no polling load, but adds Debezium/Connect as infrastructure and a replication slot you must monitor (Q43).

Either way, delivery is **at-least-once** — a crash between publish and mark-published republishes — so consumers must dedupe on the event ID.

Housekeeping people forget: delete or partition-drop published rows (the table grows fast and its index matters), alert on the **age of the oldest unpublished row** (the single best health metric for the pattern), and preserve ordering per aggregate by publishing with the aggregate ID as the Kafka key.

**Follow-up: Why not just publish the CDC stream of the business tables directly?**
Because that makes your internal schema a public contract — every consumer breaks when you rename a column, and they receive changes rather than meaningful business events. The outbox row is a deliberately designed event with its own version and lifecycle. CDC-on-business-tables is fine for feeding a warehouse; the outbox is right for integration events.

---

### Q137. Write an idempotent consumer.

**Answer.** The core is that the dedupe check and the side effect must be **atomic**, which means they share a transaction:

```sql
BEGIN;
INSERT INTO processed_events (event_id, consumer, processed_at)
VALUES (:eventId, :consumer, now());   -- unique(event_id, consumer)
-- if this raises a unique violation, we've already handled it: rollback and ack

UPDATE accounts SET balance = balance + :amt WHERE id = :account;
INSERT INTO ledger_entries (...) VALUES (...);
COMMIT;
```

On a unique violation, roll back and acknowledge — the work was already done. Because both statements are in one transaction, there's no window where the marker exists but the effect doesn't, or vice versa.

Refinements: key the marker by `(event_id, consumer)` so multiple consumers can each process the same event; partition or time-expire the table (retention comfortably longer than your maximum redelivery window, including a full replay); and where the operation is naturally idempotent (`SET status = 'SETTLED' WHERE id = ? AND status = 'PENDING'`), skip the marker entirely — a conditional update is cheaper and simpler than a dedupe table.

**Follow-up: Why not check Redis first?**
A `SETNX` in Redis is outside the database transaction, so there's a window where you've marked it processed and then failed to do the work — and now the event is permanently lost. Redis is a fine *optimisation* in front of the database check (avoiding a query for obvious duplicates), but the authoritative check must be transactional with the effect.

---

### Q138. How do you achieve ordering across services?

**Answer.** First, challenge the requirement — global ordering is expensive and usually unnecessary. What's almost always needed is **per-entity ordering**: all events for one account, in order.

Get it by partitioning consistently on the entity key: Kafka partition key = account ID, one consumer per partition, database shard key = account ID (Q132). Then per-account ordering holds end to end with full parallelism across accounts.

Where you can't guarantee ordering, design consumers to tolerate disorder:
- **Version/sequence numbers** per aggregate, with consumers rejecting or buffering out-of-order events.
- **Idempotent, commutative operations** — "set balance to X as of version N" instead of "add 5".
- **State machine guards** — reject a transition whose prior state doesn't match, and let the retry mechanism handle the reordering.

**Why it matters.** Systems that assume ordering they haven't actually guaranteed are the ones that produce impossible states — a `payment.captured` processed before `payment.authorised` creating an orphan capture. Making the guard explicit is cheap; discovering the assumption in production is not.

---

### Q139. How does backpressure work end to end?

**Answer.** Backpressure means a slow component makes the *producer* slow down rather than silently accumulating work. Every unbounded buffer in a system is a place where backpressure has been converted into an eventual OOM or an unbounded latency.

Layer by layer:
- **Client → API**: rate limits and 429s, plus concurrency limits so you shed load instead of queueing.
- **API → thread pool**: bounded queues with an explicit rejection policy, not `Integer.MAX_VALUE`.
- **Service → database**: a bounded connection pool with a short acquisition timeout — the pool *is* the concurrency limit, and it should fail fast rather than queue.
- **Producer → broker**: Kafka's `buffer.memory` + `max.block.ms` blocks the producer; RabbitMQ's flow control blocks publishers. Both are backpressure, and both must be handled rather than treated as errors.
- **Broker → consumer**: consumers pull (Kafka) or use prefetch (RabbitMQ), so they naturally control their own rate.
- **Consumer → downstream**: bulkheads and circuit breakers so a slow dependency doesn't consume every consumer thread.

**Why it matters.** The single design rule: **bound every queue**. An unbounded queue turns "we're slower than expected" into "we're down", and it does so at the worst possible moment.

---

### Q140. Design the pipeline from OLTP to analytics.

**Answer.** CDC (Debezium) from the operational database into Kafka, landed raw into object storage and a warehouse, then transformed there (ELT rather than ETL — load raw first, transform in the warehouse where you have compute and can re-run). dbt or equivalent for the transformation layer, versioned and tested like code.

Design points I'd emphasise:
- **Never let analytics query the OLTP primary** (Q15). CDC is the isolation.
- **Keep the raw landing zone immutable** — if a transformation is wrong, you re-derive rather than re-extract. This is what makes the pipeline recoverable.
- **Handle late and out-of-order data explicitly** with event-time processing and a defined lateness window; a payment recorded at 23:59 that arrives at 00:03 belongs to yesterday.
- **Schema evolution** — the warehouse must tolerate new columns; a strict schema breaks nightly on the first upstream deploy.
- **Data quality checks as first-class jobs** — row counts against source, null rates, referential checks, and a reconciliation of financial totals against the ledger. Alert on these like you alert on service errors.
- **PII handling** — mask or tokenise at ingestion, and have a documented erasure path (Q57).

**Follow-up: What's the most common failure?**
Silent divergence. Nobody notices the pipeline has been dropping 0.3% of rows for six weeks until finance queries a number that doesn't match. The fix is reconciliation with alerting, not better pipeline code.

---

### Q141. Something is slow. It touches an API, a cache, a database and a queue. How do you find it?

**Answer.** Start with the trace, not with a theory. A distributed trace of a slow request shows which span dominates in seconds, which replaces an hour of guessing. If tracing isn't in place, that's the first fix, and I'd say so.

Failing that, work outside-in with the layer-specific signals:
- **Is it latency or saturation?** Rising latency with flat throughput and growing queue depth means saturation somewhere — find the bounded resource (thread pool, connection pool, partition count).
- **Cache**: hit rate. A drop means you're now doing N× the database work; check for an invalidation bug, an eviction storm, or a cold start.
- **Database**: `pg_stat_statements` by total time, active query durations, lock waits, replication lag.
- **Queue**: consumer lag as time, rebalance rate, DLQ depth.
- **The application**: async-profiler flame graph, GC log, thread dump.

**The thing I'd emphasise:** the slow component is often not the broken one. A slow consumer might be slow because the database is contended, which is contended because a cache is missing, which is missing because a deploy changed a key format. Follow the causal chain rather than optimising the first thing that looks slow.

---

### Q142. How do you design for replay and reprocessing?

**Answer.** Assume from day one that you will need to re-derive everything, because you will — a bug in a projection, a new consumer that needs history, a corrupted downstream store.

Requirements: **retention** long enough to cover the recovery window (which is an argument for generous Kafka retention or tiered storage); **idempotent consumers**, so replay doesn't double-apply; **isolation of side effects**, so a replay doesn't re-send 400,000 emails — this is the one that bites people, and the design answer is that consumers with external side effects must either be excluded from replay or gated by a "replay mode" flag; **deterministic transformations**, so replaying yesterday's events produces yesterday's results (which means no `now()` in the logic, and versioned reference data); and **the ability to run a new consumer group in parallel** to build a new projection while the old one still serves traffic, then cut over.

**Why it matters.** "Can you rebuild it?" is the question that separates an event-driven architecture from a pile of queues. If the answer is no, your events are just messages.

---

### Q143. What observability do you need across data and messaging systems?

**Answer.** The unifying idea is that every asynchronous hop must carry the trace context, and every queue must expose *age*, not just depth.

Concretely: trace IDs propagated in message headers (W3C `traceparent`) and into database query comments, so a slow query can be attributed to a request. Per-hop latency, so you can see where a payment spent its 8 seconds. Queue/topic age as a time-based SLO ("no event older than 60 seconds unprocessed"). Outbox age. Reconciliation divergence counts. And per-dependency saturation metrics — pool usage, lag, prefetch utilisation.

The alerts that matter are the ones tied to business outcomes: settlement events late, unreconciled entries growing, DLQ non-empty. CPU and memory alerts tell you about the machine; those tell you about the product.

**Follow-up: What's the most under-instrumented thing you see?**
Age. Everyone graphs queue depth; almost nobody graphs how old the oldest unprocessed item is. Depth is ambiguous — 10,000 messages might be four seconds of work or four hours — but age is directly meaningful and directly alertable.

---

### Q144. How do you introduce a new datastore or broker into an existing system safely?

**Answer.** Incrementally, with a reversible path at each step:

1. **Justify it against the alternatives** (Q58 ordering), and write down what specific problem it solves and what you'd have to see to conclude it was the wrong call.
2. **Shadow first** — dual-write or dual-read with the new system in the non-authoritative path, comparing results. This finds semantic differences without risk.
3. **One low-risk use case** to build operational muscle: runbooks, monitoring, backup/restore, failover rehearsal, and someone other than the person who introduced it who can operate it.
4. **Expand behind a flag**, with a documented rollback that has actually been tested.
5. **Own the exit** — know how to get the data out and how to turn it off.

The honest constraint: every new system is a permanent operational commitment — upgrades, CVEs, on-call knowledge, capacity planning, and a hiring requirement. A team of six should think very hard before running four datastores.

---

### Q145. Give me the architecture you'd defend for a mid-size payments platform, and its weakest point.

**Answer.** PostgreSQL as the single system of record for money — ledger, idempotency keys, outbox — partitioned by time, RF via synchronous replication to a second AZ, RPO 0. Redis for hot reads, rate limiting and short-lived coordination, treated as disposable. Kafka as the event backbone, fed by the outbox, keyed by account, with independent consumer groups for ledger projection, fraud, notifications and the warehouse. Elasticsearch for transaction search, rebuildable from Kafka. Reconciliation jobs comparing every derived store back to PostgreSQL.

**The weakest point**, and I'd name it before being asked: the single PostgreSQL primary is the scaling and availability ceiling for writes. It's the right choice at this size — one place where money is correct, one transaction boundary, no distributed consensus in the critical path — but it means write capacity is bounded by one machine and failover is the highest-risk operation in the system. So the plan is: know the current headroom in writes/sec, rehearse failover on a schedule, and have a documented partitioning-by-tenant path that we've costed but haven't built.

**Why it matters.** The strongest possible answer to any architecture question includes what you'd expect to break first and what you're doing about it. Confidence without a named weakness reads as inexperience.

---

## Closing notes

**Say what you'd measure.** Nearly every question here has a version of the answer that ends "…and then I'd check X". Naming the metric or the tool is what separates a memorised answer from an operational one.

**Name the trade, not just the technique.** Synchronous replication buys RPO 0 and costs commit latency. A cache buys latency and costs consistency. Partitioning buys parallelism and costs ordering scope. If you can state both sides, the follow-up question is easy.

**Bound everything.** Queues, pools, retries, batch sizes, result sets, cache entries. A remarkable proportion of production incidents in these four systems reduce to something unbounded meeting something slow.

**Prefer the boring answer where it fits.** "One PostgreSQL instance, well tuned, with a table-based queue" is a defensible answer at volumes that surprise people, and being willing to give it — while showing you know exactly when it stops working — reads as more senior than reaching for a distributed system.

**Have one real story per section.** The deadlock you traced, the cache stampede that took down checkout, the rebalance loop, the queue that filled and blocked publishers. Interviewers are calibrating whether you've operated these systems or read about them, and one specific incident does that better than ten correct definitions.
