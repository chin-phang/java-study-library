/* ------------------------------------------------------------------------- *
 * The symptom index.
 *
 * A third way into the concept pages, next to the two that already exist: the
 * sidebar (by subject) and `/docs/concepts` (by dependency). Neither matches
 * how a reader actually arrives. Nobody opens this library wanting "the
 * relational group"; they open it holding a p99 graph, a duplicate charge, or
 * an index the planner will not use.
 *
 * Every symptom below is the opening failure of some page's section 1 — the
 * pages are written that way deliberately — restated in the words you would use
 * *before* you know the cause. `note` is the misdiagnosis: what it looks like
 * and is not. That line is the whole value of the index; without it this is a
 * list of links.
 *
 * This is the one hand-maintained index in the library — a slug here is not
 * checked by the compiler, unlike `prerequisites`/`unlocks`, which the graph
 * resolves. `SymptomIndex` therefore checks both directions of drift: a slug
 * naming no page, and a page no symptom reaches. Both are empty today.
 * ------------------------------------------------------------------------- */

export interface Symptom {
  /** What you observed, before you know what caused it. */
  symptom: string;
  /** What it looks like and is not — one line. */
  note: string;
  /** Concept slugs, most likely first. */
  pages: string[];
}

export interface SymptomGroup {
  /** Where you are standing when you notice it. */
  where: string;
  symptoms: Symptom[];
}

export const SYMPTOM_INDEX: SymptomGroup[] = [
  {
    where: 'In an incident',
    symptoms: [
      {
        symptom:
          'Latency climbs for minutes, then everything times out — no exception, nothing failed',
        note: 'The queue in front of the work grew until the wait was the latency. Nothing throws, because a queue that accepts everything never has to.',
        pages: ['backpressure', 'thread-pools'],
      },
      {
        symptom: 'One slow dependency takes down endpoints that never call it',
        note: 'It did not fail, it got slow — and a shared pool makes slow contagious in a way that failing is not.',
        pages: ['thread-pools', 'backpressure', 'virtual-threads'],
      },
      {
        symptom:
          'The container killed the JVM. The heap graph is flat and there is no OutOfMemoryError',
        note: '-Xmx bounds one of several regions the process pays for. Exit 137 is the kernel, not the JVM.',
        pages: ['jvm-memory', 'class-loading'],
      },
      {
        symptom: 'GC time is high, and allocating less is not helping',
        note: 'Short-lived allocation is nearly free; what costs is what survives. Allocation rate is the wrong number to be looking at.',
        pages: ['generational-gc', 'escape-analysis'],
      },
      {
        symptom: 'Memory grows with every redeploy until someone restarts it',
        note: 'One strong reference into a dead deployment pins its loader, and the loader pins every class it defined.',
        pages: ['class-loading', 'jvm-memory'],
      },
      {
        symptom: 'Three times faster in the benchmark, unchanged in production',
        note: 'The benchmark let the JIT assume things your production call site invalidates. A second implementation of the interface is enough.',
        pages: ['jit', 'escape-analysis'],
      },
    ],
  },
  {
    where: 'In the data',
    symptoms: [
      {
        symptom: 'The index is there and the planner ignores it',
        note: 'When the predicate matches most of the table, reading it straight through beats reading most of it through an index. The planner is doing the arithmetic correctly.',
        pages: ['btrees-selectivity', 'query-planning'],
      },
      {
        symptom:
          'A report that ran in four seconds for a year now takes six minutes. Nothing was deployed',
        note: 'An estimate moved and the plan flipped with it. The unchanged query text is what makes this one hard to see.',
        pages: ['query-planning', 'mvcc'],
      },
      {
        symptom:
          'The table takes tens of gigabytes for a few hundred thousand rows, and count(*) crawls',
        note: 'Nothing was deleted, and that is the problem: old row versions are still there because something is still holding them.',
        pages: ['mvcc', 'isolation-levels'],
      },
      {
        symptom: 'Money is missing. Every transaction committed and nothing errored',
        note: 'Both read the same balance, both computed from what they read, and the second write erased the first. Committed is not the same as serialisable.',
        pages: ['isolation-levels', 'aggregates', 'locking-and-deadlock'],
      },
      {
        symptom: 'Deadlocks under load that no test reproduces',
        note: 'Each call is correct; two of them in opposite order are not. A unit test calls it once.',
        pages: ['locking-and-deadlock', 'isolation-levels'],
      },
      {
        symptom: 'A write shows on one screen and a stale value on another, for hours',
        note: 'The invalidation and the write raced, and the loser put a stale value back under a fresh TTL.',
        pages: ['cache-invalidation', 'consistency-models'],
      },
      {
        symptom: 'A user writes, reloads, and sees the old value',
        note: 'The read went to a replica. No isolation level fixes replication lag — read-your-writes is a different guarantee.',
        pages: ['consistency-models', 'cache-invalidation'],
      },
    ],
  },
  {
    where: 'Across a service boundary',
    symptoms: [
      {
        symptom: 'The customer was charged twice and no line of code is wrong',
        note: 'The timeout is the third outcome: the caller cannot tell success from failure, so it retried a success.',
        pages: ['idempotency', 'consistency-models'],
      },
      {
        symptom: 'Messages are redelivered, or the consumer group keeps rebalancing',
        note: 'An acknowledgement is a broker-side fact about delivery, never an application-side fact about work completed.',
        pages: ['broker-semantics', 'kafka-internals'],
      },
      {
        symptom: 'One partition, key or shard is hot while the rest sit idle',
        note: 'The same hashing idea in five systems, and the same failure in all five: the key carries the skew.',
        pages: ['partitioning', 'kafka-internals', 'cache-invalidation'],
      },
      {
        symptom: 'You have the current state, and nobody can say how it got there',
        note: 'Crash recovery, replication, CDC and a message log are one data structure seen from four angles — and it is the one you did not keep.',
        pages: ['the-log', 'kafka-internals', 'idempotency'],
      },
    ],
  },
  {
    where: 'In the code',
    symptoms: [
      {
        symptom: '@Transactional, @Async or @Cacheable did nothing at all',
        note: 'The annotation is on a call the proxy never sees — a self-invocation goes straight to the target.',
        pages: ['spring-proxy', 'persistence-context'],
      },
      {
        symptom: 'The ORM saved something you never saved, or dropped a change you made',
        note: 'Dirty checking writes what the context believes, and merge() returns a different instance from the one you changed.',
        pages: ['persistence-context', 'spring-proxy'],
      },
      {
        symptom: 'Loading one entity loads half the database',
        note: 'Every association got mapped because mapping is easy, so the transactional boundary became the whole object graph.',
        pages: ['aggregates', 'persistence-context', 'bounded-contexts'],
      },
      {
        symptom: 'One thread never sees a write another thread definitely made',
        note: 'Not a JVM bug — a legal reordering. Visibility between threads needs a happens-before edge, and nothing in the code creates one.',
        pages: ['jmm', 'cas-and-contention'],
      },
      {
        symptom: 'A parallel stream gives a different answer on every run',
        note: 'No exception and no crash, just a different number each time: the reduction is not associative, so the order the splits combine in changes the result.',
        pages: ['stream-pipelines', 'jmm'],
      },
      {
        symptom: 'Lock-free turned out slower than the lock it replaced',
        note: 'At 32 threads a CAS is a cache-line auction — and two unrelated counters sharing one line pay it too.',
        pages: ['cas-and-contention', 'partitioning'],
      },
      {
        symptom: 'A map lookup collapsed from microseconds to seconds',
        note: 'Either the keys were chosen to collide, or a key’s hashCode changed after it was inserted.',
        pages: ['hashmap', 'partitioning'],
      },
      {
        symptom:
          'ClassCastException in a method you never wrote — or a class that cannot be cast to itself',
        note: 'Two unrelated mechanisms behind one message: a synthetic bridge-method cast, or the same name defined by two loaders.',
        pages: ['generics-erasure', 'class-loading'],
      },
      {
        symptom:
          'Adding one operation means editing forty files — or adding one type means editing forty switches',
        note: 'You get cheap new types or cheap new operations, not both. Which one is cheap is a decision your design already made.',
        pages: ['expression-problem', 'coupling-and-cohesion'],
      },
    ],
  },
  {
    where: 'In the organisation',
    symptoms: [
      {
        symptom: 'One change needs six teams and a release call',
        note: 'Ask whether the boundary you drew matches the boundary that owns it. Thirty lines of co-change data settles it.',
        pages: ['conways-law', 'coupling-and-cohesion', 'microservices-org'],
      },
      {
        symptom: 'The class everyone edits and nobody owns',
        note: 'One noun carrying several meanings in one type. The fix is to split the meaning, not the file.',
        pages: ['bounded-contexts', 'coupling-and-cohesion', 'aggregates'],
      },
      {
        symptom: 'You cannot test a business rule without a database',
        note: 'The rule depends on the mechanism. Inverting that dependency is what makes it testable.',
        pages: ['dependency-inversion', 'coupling-and-cohesion'],
      },
      {
        symptom: 'Every thread is parked on I/O and throughput is capped far below the CPU',
        note: 'The pool is sized for the cost of a platform thread — a constraint that held for twenty years and stopped holding.',
        pages: ['virtual-threads', 'thread-pools'],
      },
      {
        symptom: 'Splitting into services did not make anything faster to ship',
        note: 'The benefit is conditional on independent ownership. The cost is unconditional.',
        pages: ['microservices-org', 'conways-law', 'bounded-contexts'],
      },
    ],
  },
];
