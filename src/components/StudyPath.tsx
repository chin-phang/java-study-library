import Link from 'next/link';
import {
  conceptGraph,
  formatStudyTime,
  type ConceptGraph,
  type ConceptNode,
} from '@/lib/graph';
import { cn } from '@/lib/cn';

/**
 * The concept dependency graph, rendered as a study path.
 *
 * Server component, built from `prerequisites:` / `unlocks:` frontmatter by
 * `@/lib/graph`. Place `<StudyPath />` in MDX; it takes no props and needs no
 * data, so it cannot drift from the pages it describes.
 *
 * Stages are the graph's own shape, not a curriculum someone typed: a page sits
 * one stage past its deepest prerequisite. Everything in stage 1 is readable the
 * moment its single parent is read — the stages are a floor, not a queue, and
 * the copy says so.
 *
 * Both edge fields name written pages only. An entry in either that resolves to
 * nothing is drift, and renders as a visible defect rather than being dropped —
 * as does a prerequisite cycle. All three blocks are empty today; they exist
 * because the graph is hand-typed frontmatter.
 *
 * `tier:` is deliberately not rendered. It records which pages were drafted
 * first, and as a badge beside a stage number it read as a claim about depth
 * that the graph contradicts — foundational `bounded-contexts` and `the-log`
 * sit at stage 2, while core `stream-pipelines` and `expression-problem` are
 * roots. `reach` is shown instead: derived, exact, and the thing tier was
 * reaching for.
 */

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[0.7rem] leading-4 whitespace-nowrap',
        'border-fd-border text-fd-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

function SlugLinks({ slugs, graph }: { slugs: string[]; graph: ConceptGraph }) {
  return (
    <>
      {slugs.map((slug, i) => {
        const node = graph.bySlug.get(slug);
        return (
          <span key={slug}>
            {i > 0 ? ', ' : ''}
            {node ? (
              <Link href={node.url} className="underline underline-offset-2">
                {node.title}
              </Link>
            ) : (
              <code>{slug}</code>
            )}
          </span>
        );
      })}
    </>
  );
}

function NodeCard({ node, graph }: { node: ConceptNode; graph: ConceptGraph }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-fd-border bg-fd-card p-3">
      <Link href={node.url} className="text-sm font-semibold underline-offset-2 hover:underline">
        {node.title}
      </Link>

      <div className="flex flex-wrap gap-1.5">
        {node.reach > 0 ? (
          <Tag className="border-fd-primary/40 text-fd-primary">
            {node.reach} page{node.reach === 1 ? ' builds' : 's build'} on this
          </Tag>
        ) : null}
        {node.studyMinutes ? <Tag>{formatStudyTime(node.studyMinutes)}</Tag> : null}
        {node.questionCount > 0 ? (
          <Tag>
            {node.questionCount} question{node.questionCount === 1 ? '' : 's'}
          </Tag>
        ) : null}
      </div>

      {node.prerequisites.length > 0 ? (
        <p className="m-0 text-xs text-fd-muted-foreground">
          After <SlugLinks slugs={node.prerequisites} graph={graph} />
        </p>
      ) : null}

      {node.unlocks.length > 0 ? (
        <p className="m-0 text-xs text-fd-muted-foreground">
          Leads to <SlugLinks slugs={node.unlocks} graph={graph} />
        </p>
      ) : null}
    </li>
  );
}

function Stage({
  index,
  nodes,
  graph,
}: {
  index: number;
  nodes: ConceptNode[];
  graph: ConceptGraph;
}) {
  if (nodes.length === 0) return null;

  const minutes = nodes.reduce((sum, node) => sum + (node.studyMinutes ?? 0), 0);
  const heading =
    index === 0 ? 'Stage 0 — no prerequisites, start anywhere' : `Stage ${index}`;
  const subtitle =
    index === 0
      ? 'Nothing in the library precedes these, so any of them is a legitimate first page.'
      : `Readable once this page's own prerequisites are read — not once the whole of stage ${index - 1} is.`;

  return (
    <section className="mt-8">
      <h3 className="m-0 text-sm font-semibold">{heading}</h3>
      <p className="mt-1 mb-0 text-xs text-fd-muted-foreground">
        {nodes.length} page{nodes.length === 1 ? '' : 's'}
        {minutes > 0 ? ` · ${formatStudyTime(minutes)}` : ''} — {subtitle}
      </p>
      <ul className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {nodes.map((node) => (
          <NodeCard key={node.slug} node={node} graph={graph} />
        ))}
      </ul>
    </section>
  );
}

export function StudyPath() {
  const graph = conceptGraph();
  const roots = graph.stages[0]?.length ?? 0;
  const edges = graph.nodes.reduce((sum, node) => sum + node.prerequisites.length, 0);

  return (
    <div className="not-prose my-6">
      <dl className="m-0 grid grid-cols-2 gap-2 p-0 sm:grid-cols-4">
        {[
          ['Pages', String(graph.nodes.length)],
          ['Roots', String(roots)],
          ['Prerequisite edges', String(edges)],
          ['Study time', formatStudyTime(graph.totalStudyMinutes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-fd-border bg-fd-card p-3">
            <dt className="m-0 text-xs text-fd-muted-foreground">{label}</dt>
            <dd className="m-0 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {graph.danglingPrerequisites.length > 0 ? (
        <section className="mt-6 rounded-xl border border-fd-error/50 p-3 text-sm text-fd-error">
          <h3 className="m-0 text-sm font-semibold">Dangling prerequisites</h3>
          <p className="mt-1 mb-2 text-xs">
            A <code>prerequisites</code> entry must name a written page — it tells a reader what to
            study first, so one that resolves to nothing is a dead end. Fix the frontmatter, or use{' '}
            <code>prerequisites: []</code> until the page exists.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
            {graph.danglingPrerequisites.map(({ from, to }) => (
              <li key={`${from}->${to}`}>
                <code>{from}</code> names <code>{to}</code>, which is not written
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {graph.unresolvedUnlocks.length > 0 ? (
        <section className="mt-6 rounded-xl border border-fd-error/50 p-3 text-sm text-fd-error">
          <h3 className="m-0 text-sm font-semibold">Unresolved unlocks</h3>
          <p className="mt-1 mb-2 text-xs">
            <code>unlocks</code> names the pages that come next, and every entry must be a written
            page — it is a link list, not a roadmap. A slug with no page behind it is drift: a page
            renamed, or a promise typed into frontmatter out of habit.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
            {graph.unresolvedUnlocks.map(({ slug, namedBy }) => (
              <li key={slug}>
                <code>{slug}</code> — named by{' '}
                {namedBy.map((namer, i) => (
                  <span key={namer}>
                    {i > 0 ? ', ' : ''}
                    <code>{namer}</code>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {graph.cycles.length > 0 ? (
        <section className="mt-6 rounded-xl border border-fd-error/50 p-3 text-sm text-fd-error">
          <h3 className="m-0 text-sm font-semibold">Prerequisite cycle</h3>
          <p className="mt-1 mb-2 text-xs">
            A cycle has no reading order. Stages were computed with the back edge ignored.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
            {graph.cycles.map((cycle) => (
              <li key={cycle.join('>')}>
                <code>{cycle.join(' → ')}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {graph.stages.map((nodes, index) => (
        <Stage key={index} index={index} nodes={nodes} graph={graph} />
      ))}

    </div>
  );
}
