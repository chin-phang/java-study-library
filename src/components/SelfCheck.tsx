'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCollapsible } from '@/components/Question';
import { cn } from '@/lib/cn';

/**
 * `<Question>` does not fit a self-check.
 *
 * A `<Question>` hides an answer. A self-check prompt has no answer by design —
 * the whole instruction is "answer these without looking" — so there is nothing
 * for it to collapse, and reusing it would mean inventing answers that the source
 * page deliberately withholds.
 *
 * What is worth hiding is the *pointer*: which section of this page builds the
 * model the question tests. Revealed only after you have tried, it checks your
 * recall without handing you the answer. This reuses `useCollapsible` from
 * Question.tsx, so these participate in the page-level expand-all control.
 */
export function SelfCheck({ children }: { children: ReactNode }) {
  return <ol className="not-prose my-4 flex list-none flex-col gap-2 p-0">{children}</ol>;
}

export function SelfCheckItem({
  n,
  where,
  children,
}: {
  /** Question number, shown as the marker. */
  n: number;
  /**
   * Where on this page the model is built — a section name, never an answer.
   *
   * Optional. Without it the item is just a numbered question with no toggle,
   * which is a perfectly good self-check. Writing a pointer is a judgement about
   * which section answers which question; requiring one would mean authoring
   * ~100 of them in a single conversion pass, and rushed pointers are worse than
   * none. Add them deliberately, per page, when the page is being read.
   */
  where?: string;
  children: ReactNode;
}) {
  // Counted only when there is something to expand, so the page-level
  // expand-all control reflects what it can actually open.
  const [open, setOpen] = useCollapsible(undefined, Boolean(where));

  return (
    <li className="rounded-xl border border-fd-border bg-fd-card p-3">
      <div className="flex gap-2.5 text-sm">
        <span className="shrink-0 font-mono text-xs text-fd-muted-foreground">{n}.</span>
        <div className="min-w-0 flex-1">
          <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
          {where ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="mt-2 inline-flex items-center gap-1 text-xs text-fd-muted-foreground hover:text-fd-foreground"
              >
                <ChevronRight
                  aria-hidden
                  className={cn('size-3 transition-transform', open && 'rotate-90')}
                />
                {open ? 'Hide' : 'Where is this built?'}
              </button>
              <p hidden={!open} className="mt-1.5 text-xs text-fd-muted-foreground">
                {where}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
