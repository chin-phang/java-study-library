'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCollapsible } from '@/components/Question';
import { cn } from '@/lib/cn';

/**
 * A follow-up question nested inside a <Question>. Collapsed by default and
 * driven by the same page-level expand-all control.
 */
export function FollowUp({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useCollapsible();

  return (
    <div className="not-prose my-3 rounded-lg border border-fd-border/70 bg-fd-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2 text-start text-sm font-medium"
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
          {q}
        </span>
      </button>
      <div hidden={!open} className="prose prose-no-margin px-3 pb-3 ps-8 text-sm">
        {children}
      </div>
    </div>
  );
}
