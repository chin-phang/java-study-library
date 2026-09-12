import Link from 'next/link';
import {
  conceptGraph,
  dependantsOf,
  formatStudyTime,
  readingOrderTo,
  type ConceptNode,
} from '@/lib/graph';

/**
 * One concept page's slice of the dependency graph: what to read before it, and
 * what it opens up.
 *
 * Server component, rendered from `src/app/docs/[[...slug]]/page.tsx` beside
 * `RelatedQuestions` rather than placed in MDX — so every concept page gets it
 * without boilerplate, and none can forget it. It sits at the foot of the page
 * deliberately: a concept page opens with the failure it exists to explain, and
 * burying that opener under a navigation box would cost more than the box gains.
 *
 * "Read first" is the *transitive* prerequisite closure in reading order, not
 * just the declared parents — the declared list is one hop, and the useful
 * question is what the whole run-up costs.
 */
export function ConceptPath({ node }: { node: ConceptNode | null }) {
  if (!node) return null;

  const graph = conceptGraph();
  const before = readingOrderTo(node.slug, graph);
  const runUp = before.reduce((sum, n) => sum + (n.studyMinutes ?? 0), 0);

  // `unlocks` and `prerequisites` are deliberately not mirror images, so "what
  // comes next" is the union: pages this one promises, plus pages that name it.
  const next = new Map<string, ConceptNode>();
  for (const slug of node.unlocks) {
    const target = graph.bySlug.get(slug);
    if (target) next.set(slug, target);
  }
  for (const dependant of dependantsOf(node.slug, graph)) {
    next.set(dependant.slug, dependant);
  }

  if (before.length === 0 && next.size === 0 && node.unwritten.length === 0) return null;

  return (
    <section className="not-prose mt-6 rounded-xl border border-fd-border bg-fd-card p-4">
      <h2 className="m-0 text-sm font-semibold">Study path</h2>
      <p className="mt-1 text-xs text-fd-muted-foreground">
        From this page&rsquo;s <code className="text-[0.95em]">prerequisites:</code> and{' '}
        <code className="text-[0.95em]">unlocks:</code> frontmatter. See the{' '}
        <Link href="/docs/concepts" className="underline underline-offset-2">
          whole graph
        </Link>
        .
      </p>

      <dl className="m-0 mt-3 flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-fd-muted-foreground">
            Read first
            {before.length > 0 && runUp > 0 ? ` · ${formatStudyTime(runUp)}` : ''}
          </dt>
          <dd className="m-0 mt-1">
            {before.length === 0 ? (
              <span className="text-fd-muted-foreground">
                Nothing — this page is a root, and depends on nothing else in the library.
              </span>
            ) : (
              <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0">
                {before.map((step, i) => (
                  <li key={step.slug} className="flex items-center gap-1.5">
                    {i > 0 ? <span className="text-fd-muted-foreground">→</span> : null}
                    <Link href={step.url} className="underline underline-offset-2">
                      {step.title}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </dd>
        </div>

        {next.size > 0 ? (
          <div>
            <dt className="text-xs font-semibold text-fd-muted-foreground">Read next</dt>
            <dd className="m-0 mt-1">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {[...next.values()].map((target) => (
                  <li key={target.slug}>
                    <Link href={target.url} className="underline underline-offset-2">
                      {target.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}

        {node.unwritten.length > 0 ? (
          <div>
            <dt className="text-xs font-semibold text-fd-muted-foreground">
              Promised, not written
            </dt>
            <dd className="m-0 mt-1 text-xs text-fd-muted-foreground">
              {node.unwritten.map((slug, i) => (
                <span key={slug}>
                  {i > 0 ? ', ' : ''}
                  <code>{slug}</code>
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
