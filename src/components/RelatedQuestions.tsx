import Link from 'next/link';
import type { QuestionRef } from '@/lib/source';

/**
 * Renders a concept page's `questions:` frontmatter as real links.
 *
 * Server component, rendered from `src/app/docs/[[...slug]]/page.tsx` rather than
 * placed in MDX, so every concept page gets it without boilerplate and none can
 * forget it. A `questions:` entry whose anchor does not exist renders visibly as
 * broken rather than silently vanishing.
 */
export function RelatedQuestions({ questions }: { questions: QuestionRef[] }) {
  if (questions.length === 0) return null;

  return (
    <section className="not-prose mt-12 rounded-xl border border-fd-border bg-fd-card p-4">
      <h2 className="m-0 text-sm font-semibold">Reference questions this page explains</h2>
      <p className="mt-1 text-xs text-fd-muted-foreground">
        Declared in this page&rsquo;s <code className="text-[0.95em]">questions:</code> frontmatter.
        Each of these links back here.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {questions.map((q) =>
          q.url ? (
            <li key={q.raw}>
              <Link href={q.url} className="underline underline-offset-2">
                {q.title}
              </Link>
            </li>
          ) : (
            <li key={q.raw} className="text-fd-error">
              broken reference: <code>{q.raw}</code>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
