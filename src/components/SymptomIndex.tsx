import Link from 'next/link';
import { conceptGraph, type ConceptGraph } from '@/lib/graph';
import { SYMPTOM_INDEX } from '@/lib/symptoms';

/**
 * The symptom index — the concept pages entered by the failure you are holding,
 * rather than by subject (the sidebar) or by dependency (`/docs/concepts`).
 *
 * Server component. Place `<SymptomIndex />` in MDX; it takes no props. The
 * copy lives in `@/lib/symptoms`, the links are resolved against the graph, so
 * a renamed page shows up here as a defect rather than as a dead link.
 *
 * Unlike `StudyPath`, half of this *is* hand-maintained: the symptom text and
 * its slug list are typed, not derived. So both directions of drift are checked
 * and rendered rather than assumed away — a slug naming no page, and a page no
 * symptom reaches. Neither fires today.
 */

function PageLinks({ slugs, graph }: { slugs: string[]; graph: ConceptGraph }) {
  return (
    <p className="m-0 mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
      {slugs.map((slug) => {
        const node = graph.bySlug.get(slug);
        return node ? (
          <Link
            key={slug}
            href={node.url}
            className="rounded-full border border-fd-border px-2 py-0.5 text-fd-muted-foreground hover:border-fd-primary/50 hover:text-fd-primary"
          >
            {node.title}
          </Link>
        ) : (
          <span key={slug} className="rounded-full border border-fd-error/50 px-2 py-0.5 text-fd-error">
            <code>{slug}</code> — no such page
          </span>
        );
      })}
    </p>
  );
}

export function SymptomIndex() {
  const graph = conceptGraph();

  const named = new Set<string>();
  const unknown: { slug: string; symptom: string }[] = [];
  for (const group of SYMPTOM_INDEX) {
    for (const entry of group.symptoms) {
      for (const slug of entry.pages) {
        if (graph.bySlug.has(slug)) named.add(slug);
        else unknown.push({ slug, symptom: entry.symptom });
      }
    }
  }

  const unreached = graph.nodes.filter((node) => !named.has(node.slug));
  const total = SYMPTOM_INDEX.reduce((sum, group) => sum + group.symptoms.length, 0);

  return (
    <div className="not-prose my-6">
      <p className="m-0 text-xs text-fd-muted-foreground">
        {total} symptoms · {named.size} of {graph.nodes.length} concept pages reached
      </p>

      {unknown.length > 0 ? (
        <section className="mt-6 rounded-xl border border-fd-error/50 p-3 text-sm text-fd-error">
          <h3 className="m-0 text-sm font-semibold">Symptom names no page</h3>
          <p className="mt-1 mb-2 text-xs">
            The index is hand-typed. A slug with no page behind it is a renamed or deleted page, and
            renders above as a defect rather than as a working link.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
            {unknown.map(({ slug, symptom }) => (
              <li key={`${slug}:${symptom}`}>
                <code>{slug}</code> — named by “{symptom}”
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unreached.length > 0 ? (
        <section className="mt-6 rounded-xl border border-fd-border p-3 text-sm">
          <h3 className="m-0 text-sm font-semibold">Pages no symptom reaches</h3>
          <p className="mt-1 mb-2 text-xs text-fd-muted-foreground">
            Not necessarily a defect — a page can be worth reading without having a failure that
            announces it. But a page nobody arrives at by symptom is worth a second look.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-xs">
            {unreached.map((node) => (
              <li key={node.slug}>
                <Link href={node.url} className="underline underline-offset-2">
                  {node.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {SYMPTOM_INDEX.map((group) => (
        <section key={group.where} className="mt-8">
          <h3 className="m-0 text-sm font-semibold">{group.where}</h3>
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {group.symptoms.map((entry) => (
              <li
                key={entry.symptom}
                className="rounded-xl border border-fd-border bg-fd-card p-3"
              >
                <p className="m-0 text-sm font-medium">{entry.symptom}</p>
                <p className="m-0 mt-1 text-xs text-fd-muted-foreground">{entry.note}</p>
                <PageLinks slugs={entry.pages} graph={graph} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
