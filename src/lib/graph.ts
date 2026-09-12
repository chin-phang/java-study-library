import { conceptPages } from './source';
import type { DocFrontmatter } from './schema';

/* ------------------------------------------------------------------------- *
 * The concept dependency graph.
 *
 * Derived entirely from the `concept:` / `prerequisites:` / `unlocks:`
 * frontmatter of the pages under `content/docs/concepts/`. Nothing is
 * hand-maintained here: add a page, declare its edges, and it appears.
 *
 * Both edge fields now name written pages only (settled 2026-09-12 — `unlocks`
 * used to be a roadmap that could name unwritten Specialist pages, and 84 such
 * promises were stripped from the frontmatter when that was reversed). So:
 *
 *  - `prerequisites` must resolve to a written page, because it tells a reader
 *    what to study *first*. A dangling one is a dead end.
 *  - `unlocks` must resolve to a written page, because it is now a link list
 *    rather than a roadmap. A dangling one is drift — a page renamed, or a
 *    Specialist promise typed into frontmatter out of habit.
 *
 * Neither is *assumed* to hold. An unresolved entry in either field is
 * collected and handed to the renderer to flag: it must never throw, never
 * silently drop the node, and never render as a working link. The same goes for
 * a prerequisite cycle. None of the three fires today; all three are hand-typed
 * frontmatter, which is why the code does not trust them.
 *
 * The two fields are deliberately not mirror images of each other, so no
 * inference runs in either direction.
 * ------------------------------------------------------------------------- */

export type Tier = 'foundational' | 'core' | 'specialist';

export interface ConceptNode {
  /** The `concept:` slug — the identity the whole graph references. */
  slug: string;
  title: string;
  url: string;
  /**
   * The declared `tier:`. It records the *writing queue* — which pages were
   * drafted first — not a claim about the page a reader is holding, so nothing
   * renders it. `reach` below is the measured version of what it gestures at,
   * and the two disagree in seven places: `generics-erasure` and `idempotency`
   * are foundational and nothing is behind them, while core `isolation-levels`
   * (3) outranks foundational `jmm` and `thread-pools` (2).
   */
  tier: Tier | null;
  /** Parsed from `estimatedStudyTime` (`3h`, `2h30m`, `90m`); null if absent. */
  studyMinutes: number | null;
  /** How many reference questions this page claims to explain. */
  questionCount: number;
  /** Declared prerequisites that resolve to a written page. */
  prerequisites: string[];
  /** Declared `unlocks` targets that resolve to a written page. */
  unlocks: string[];
  /** Declared `unlocks` targets naming no page. Should be empty; drift if not. */
  unresolvedUnlocks: string[];
  /** Longest prerequisite chain behind this page. Roots are 0. */
  stage: number;
  /**
   * How many pages have this one somewhere behind them — the transitive closure
   * of the `prerequisites` edges pointing at it. 0 for a page nothing builds
   * on, which is eighteen of the thirty-four and is not a defect.
   */
  reach: number;
}

export interface DanglingPrerequisite {
  /** The page declaring it. */
  from: string;
  /** The slug it names, which resolves to nothing. */
  to: string;
}

export interface UnresolvedUnlock {
  slug: string;
  /** Slugs of the pages naming it. */
  namedBy: string[];
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  bySlug: Map<string, ConceptNode>;
  /** Nodes bucketed by `stage`; index 0 holds the roots. */
  stages: ConceptNode[][];
  /** `unlocks` entries naming nothing. Should be empty; flagged if not. */
  unresolvedUnlocks: UnresolvedUnlock[];
  /** `prerequisites` entries naming nothing. Should be empty; flagged if not. */
  danglingPrerequisites: DanglingPrerequisite[];
  /**
   * Prerequisite cycles, as the slugs involved. Should be empty. Collected so a
   * cycle degrades to a flagged warning rather than a stack overflow.
   */
  cycles: string[][];
  totalStudyMinutes: number;
}

/** `3h`, `2h30m`, `90m` -> minutes. Unparseable or absent -> null. */
export function parseStudyTime(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

/** `3h`, `2h 30m`, `45m` — for display. */
export function formatStudyTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

let cached: ConceptGraph | null = null;

/** Build (and memoise) the graph from the concept pages' frontmatter. */
export function conceptGraph(): ConceptGraph {
  if (cached) return cached;

  const declared = new Map<
    string,
    { data: DocFrontmatter; url: string; prerequisites: string[]; unlocks: string[] }
  >();

  for (const page of conceptPages()) {
    const data = page.data as DocFrontmatter;
    const slug = data.concept;
    if (!slug || declared.has(slug)) continue;
    declared.set(slug, {
      data,
      url: page.url,
      prerequisites: data.prerequisites ?? [],
      unlocks: data.unlocks ?? [],
    });
  }

  const danglingPrerequisites: DanglingPrerequisite[] = [];
  const unresolvedBy = new Map<string, string[]>();
  const bySlug = new Map<string, ConceptNode>();

  for (const [slug, entry] of declared) {
    const prerequisites: string[] = [];
    for (const target of entry.prerequisites) {
      if (declared.has(target)) prerequisites.push(target);
      else danglingPrerequisites.push({ from: slug, to: target });
    }

    const unlocks: string[] = [];
    const unresolvedUnlocks: string[] = [];
    for (const target of entry.unlocks) {
      if (declared.has(target)) {
        unlocks.push(target);
        continue;
      }
      unresolvedUnlocks.push(target);
      const namers = unresolvedBy.get(target);
      if (namers) namers.push(slug);
      else unresolvedBy.set(target, [slug]);
    }

    bySlug.set(slug, {
      slug,
      title: entry.data.title,
      url: entry.url,
      tier: entry.data.tier ?? null,
      studyMinutes: parseStudyTime(entry.data.estimatedStudyTime),
      questionCount: entry.data.questions?.length ?? 0,
      prerequisites,
      unlocks,
      unresolvedUnlocks,
      stage: 0,
      reach: 0,
    });
  }

  // Longest path from a root, guarded against a cycle the frontmatter should
  // never contain but might: a back edge contributes nothing and is recorded.
  const cycles: string[][] = [];
  const settled = new Set<string>();
  const walking: string[] = [];

  const stageOf = (slug: string): number => {
    const node = bySlug.get(slug);
    if (!node) return 0;
    if (settled.has(slug)) return node.stage;

    const revisit = walking.indexOf(slug);
    if (revisit !== -1) {
      cycles.push([...walking.slice(revisit), slug]);
      return 0;
    }

    walking.push(slug);
    let stage = 0;
    for (const prerequisite of node.prerequisites) {
      stage = Math.max(stage, stageOf(prerequisite) + 1);
    }
    walking.pop();

    node.stage = stage;
    settled.add(slug);
    return stage;
  };

  for (const slug of bySlug.keys()) stageOf(slug);

  const nodes = [...bySlug.values()].sort(
    (a, b) => a.stage - b.stage || a.title.localeCompare(b.title),
  );

  // Transitive dependants — how much of the library sits behind each page.
  // Iterative and guarded by `seen`, so a cycle terminates here too.
  const dependants = new Map<string, string[]>();
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      const named = dependants.get(prerequisite);
      if (named) named.push(node.slug);
      else dependants.set(prerequisite, [node.slug]);
    }
  }

  for (const node of nodes) {
    const seen = new Set<string>();
    const stack = [...(dependants.get(node.slug) ?? [])];
    for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
      if (next === node.slug || seen.has(next)) continue;
      seen.add(next);
      stack.push(...(dependants.get(next) ?? []));
    }
    node.reach = seen.size;
  }

  const stages: ConceptNode[][] = [];
  for (const node of nodes) {
    (stages[node.stage] ??= []).push(node);
  }
  for (let i = 0; i < stages.length; i++) stages[i] ??= [];

  cached = {
    nodes,
    bySlug,
    stages,
    unresolvedUnlocks: [...unresolvedBy.entries()]
      .map(([slug, namedBy]) => ({ slug, namedBy: [...namedBy].sort() }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    danglingPrerequisites,
    cycles,
    totalStudyMinutes: nodes.reduce((sum, node) => sum + (node.studyMinutes ?? 0), 0),
  };

  return cached;
}

/**
 * Everything to read before `slug`, in an order that never puts a page ahead of
 * its own prerequisites. Depth-first post-order over `prerequisites`, so the
 * deepest root comes first; the visited set also makes it cycle-safe.
 */
export function readingOrderTo(slug: string, graph = conceptGraph()): ConceptNode[] {
  const out: ConceptNode[] = [];
  const seen = new Set<string>([slug]);

  const walk = (current: string) => {
    const node = graph.bySlug.get(current);
    if (!node) return;
    for (const prerequisite of node.prerequisites) {
      if (seen.has(prerequisite)) continue;
      seen.add(prerequisite);
      walk(prerequisite);
      const resolved = graph.bySlug.get(prerequisite);
      if (resolved) out.push(resolved);
    }
  };

  walk(slug);
  return out;
}

/** Every written page that names `slug` as one of its own prerequisites. */
export function dependantsOf(slug: string, graph = conceptGraph()): ConceptNode[] {
  return graph.nodes.filter((node) => node.prerequisites.includes(slug));
}

/** The node for a page, if that page is a concept page. */
export function conceptNodeFor(
  data: { concept?: string },
  graph = conceptGraph(),
): ConceptNode | null {
  return data.concept ? (graph.bySlug.get(data.concept) ?? null) : null;
}
