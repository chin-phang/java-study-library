'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ChevronRight, Link2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Broadcast {
  open: boolean;
  /** Bumped on every broadcast so repeat clicks still notify subscribers. */
  nonce: number;
}

interface QuestionsContextValue {
  register: () => () => void;
  broadcast: Broadcast | null;
  setAll: (open: boolean) => void;
}

const QuestionsContext = createContext<QuestionsContextValue | null>(null);

/**
 * Wraps the docs body so every <Question> / <FollowUp> on the page shares one
 * expand-all / collapse-all control. Rendered in
 * `src/app/docs/[[...slug]]/page.tsx`, so MDX files need no boilerplate.
 *
 * The toolbar only appears once at least one collapsible has registered, which
 * keeps concept pages (no questions) clean.
 */
export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);

  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  const setAll = useCallback((open: boolean) => {
    setBroadcast((prev) => ({ open, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const value = useMemo<QuestionsContextValue>(
    () => ({ register, broadcast, setAll }),
    [register, broadcast, setAll],
  );

  return (
    <QuestionsContext.Provider value={value}>
      {count > 0 ? (
        <div className="not-prose mb-6 flex items-center gap-2 text-sm">
          <span className="text-fd-muted-foreground">
            {count} collapsible {count === 1 ? 'answer' : 'answers'}
          </span>
          <div className="ms-auto flex gap-2">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="rounded-md border border-fd-border px-2.5 py-1 font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="rounded-md border border-fd-border px-2.5 py-1 font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              Collapse all
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </QuestionsContext.Provider>
  );
}

/**
 * Shared behaviour for a collapsible whose open state can be driven by the
 * page-level control, and which force-opens when it is the deep-link target.
 */
function useCollapsible(anchorId?: string) {
  const ctx = useContext(QuestionsContext);
  const [open, setOpen] = useState(false);

  const register = ctx?.register;
  useEffect(() => register?.(), [register]);

  const broadcast = ctx?.broadcast;
  useEffect(() => {
    if (broadcast) setOpen(broadcast.open);
  }, [broadcast]);

  useEffect(() => {
    if (!anchorId) return;

    const openIfTargeted = () => {
      if (window.location.hash !== `#${anchorId}`) return;
      setOpen(true);

      // The answer only exists in the layout after this render commits, and on a
      // cold load Next.js restores scroll position after hydration. Scroll once
      // the expansion has painted, then once more after restoration has settled.
      const scroll = () =>
        document.getElementById(anchorId)?.scrollIntoView({ block: 'start' });
      const frame = requestAnimationFrame(scroll);
      const timer = setTimeout(scroll, 350);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    };

    const cleanupInitial = openIfTargeted();
    const onHashChange = () => openIfTargeted();
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cleanupInitial?.();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [anchorId]);

  return [open, setOpen] as const;
}

export function Question({
  id,
  title,
  children,
}: {
  /** Becomes the heading anchor, e.g. `id="q48"` deep-links as `#q48`. */
  id: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useCollapsible(id);
  const panelId = `${id}-answer`;

  return (
    <section className="not-prose my-4 rounded-xl border border-fd-border bg-fd-card">
      {/* A real <h3> — the table of contents depends on heading structure. */}
      <h3 id={id} className="scroll-mt-24 m-0 text-base font-semibold">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex w-full items-start gap-2 p-4 text-start"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'mt-0.5 size-4 shrink-0 text-fd-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
          <span className="flex-1">{title}</span>
          <span className="mt-0.5 shrink-0 font-mono text-xs text-fd-muted-foreground">
            {id.toUpperCase()}
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        hidden={!open}
        className="prose prose-no-margin border-t border-fd-border px-4 py-3 text-sm"
      >
        {children}
        <a
          href={`#${id}`}
          className="not-prose mt-3 inline-flex items-center gap-1 text-xs text-fd-muted-foreground no-underline hover:text-fd-foreground"
        >
          <Link2 aria-hidden className="size-3" />
          Link to this question
        </a>
      </div>
    </section>
  );
}

export { useCollapsible };
