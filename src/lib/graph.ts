import { conceptPages } from './source';
import type { DocFrontmatter } from './schema';

/* ------------------------------------------------------------------------- *
 * The concept dependency graph.
 *
 * Derived entirely from the `concept:` / `prerequisites:` / `unlocks:`
 * frontmatter of the pages under `content/docs/concepts/`. Nothing is
 * hand-maintained here: add a page, declare its edges, and it appears.
 *
 * Two rules from CLAUDE.md ("The dependency graph — settled conventions") are
 * load-bearing, and this module exists to honour them rather than to assume
 * them away:
 *
 *  - `unlocks` may name a page that does not exist yet. It is a roadmap, not a
 *    link list. A dangling `unlocks` target is NORMAL — it must not throw, must
 *    not silently drop the node, and must not render as a broken link. It is
 *    surfaced as `unwritten`, which the renderer shows as a promise. With the
 *    Core tier closed, every remaining one is a Specialist slug, so the
 *    renderer meets dangling edges on day one and always.
 *  - `prerequisites` must resolve to a written page, because it tells a reader
 *    what to study *first*. A dangling one is a dead end, so it is collected
 *    into `danglingPrerequisites` for the renderer to flag visibly.
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
  tier: Tier | null;
  /** Parsed from `estimatedStudyTime` (`3h`, `2h30m`, `90m`); null if absent. */
  studyMinutes: number | null;
  /** How many reference questions this page claims to explain. */
  questionCount: number;
  /** Declared prerequisites that resolve to a written page. */
  prerequisites: string[];
  /** Declared `unlocks` targets that resolve to a written page. */
  unlocks: string[];
  /** Declared `unlocks` targets with no page — promises, not errors. */
  unwritten: string[];
  /** Longest prerequisite chain behind this page. Roots are 0. */
  stage: number;
}

export interface DanglingPrerequisite {
  /** The page declaring it. */
  from: string;
  /** The slug it names, which resolves to nothing. */
  to: string;
}

export interface UnwrittenPage {
  slug: string;
  /** Slugs of the written pages promising it. */
  promisedBy: string[];
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  bySlug: Map<string, ConceptNode>;
  /** Nodes bucketed by `stage`; index 0 holds the roots. */
  stages: ConceptNode[][];
  /** Pages named by an `unlocks` and not yet written. Expected, not an error. */
  unwritten: UnwrittenPage[];
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
  const unwrittenBy = new Map<string, string[]>();
  const bySlug = new Map<string, ConceptNode>();

  for (const [slug, entry] of declared) {
    const prerequisites: string[] = [];
    for (const target of entry.prerequisites) {
      if (declared.has(target)) prerequisites.push(target);
      else danglingPrerequisites.push({ from: slug, to: target });
    }

    const unlocks: string[] = [];
    const unwritten: string[] = [];
    for (const target of entry.unlocks) {
      if (declared.has(target)) {
        unlocks.push(target);
        continue;
      }
      unwritten.push(target);
      const promisers = unwrittenBy.get(target);
      if (promisers) promisers.push(slug);
      else unwrittenBy.set(target, [slug]);
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
      unwritten,
      stage: 0,
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

  const stages: ConceptNode[][] = [];
  for (const node of nodes) {
    (stages[node.stage] ??= []).push(node);
  }
  for (let i = 0; i < stages.length; i++) stages[i] ??= [];

  cached = {
    nodes,
    bySlug,
    stages,
    unwritten: [...unwrittenBy.entries()]
      .map(([slug, promisedBy]) => ({ slug, promisedBy: [...promisedBy].sort() }))
      .sort((a, b) => b.promisedBy.length - a.promisedBy.length || a.slug.localeCompare(b.slug)),
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
