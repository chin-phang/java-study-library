'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCollapsible } from '@/components/Question';
import { cn } from '@/lib/cn';

/**
 * `q` is a JSX string attribute, so markdown in it is never parsed. Follow-up
 * questions in the source banks lean heavily on inline code ("When is
 * `LongAdder` better than `AtomicLong`?"), so backtick spans are honoured here.
 * Nothing else is — this is deliberately not a markdown parser.
 */
function renderInlineCode(text: string) {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="rounded border border-fd-border bg-fd-muted px-1 py-0.5 text-[0.9em]">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

/**
 * A follow-up question nested inside a <Question>. Collapsed by default and
 * driven by the same page-level expand-all control.
 */
export function FollowUp({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useCollapsible();

  return (
    <div className="my-3 rounded-lg border border-fd-border/70 bg-fd-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="not-prose flex w-full items-start gap-2 px-3 py-2 text-start text-sm font-medium"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'mt-0.5 size-3.5 shrink-0 text-fd-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
        <span className="flex-1">
          <span className="text-fd-muted-foreground">Follow-up: </span>
          {renderInlineCode(q)}
        </span>
      </button>
      <div
        hidden={!open}
        className="px-3 pb-3 ps-8 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      >
        {children}
      </div>
    </div>
  );
}
