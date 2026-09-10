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
import { ChevronRight, Link2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Mirrors `ConceptRef` in `@/lib/source`, kept structural to avoid a server import. */
interface ConceptRef {
  url: string;
  title: string;
}

interface Broadcast {
  open: boolean;
  /** Bumped on every broadcast so repeat clicks still notify subscribers. */
  nonce: number;
}

interface QuestionsContextValue {
  /** Follow-ups are nested inside answers, so only questions are counted. */
  register: (counted: boolean) => () => void;
  broadcast: Broadcast | null;
  setAll: (open: boolean) => void;
  /** anchor (`q48`) -> concept pages that explain it, from their frontmatter. */
  concepts: Record<string, ConceptRef[]>;
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
export function QuestionsProvider({
  children,
  concepts = {},
}: {
  children: ReactNode;
  concepts?: Record<string, ConceptRef[]>;
}) {
  const [count, setCount] = useState(0);
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);

  const register = useCallback((counted: boolean) => {
    if (!counted) return () => {};
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  const setAll = useCallback((open: boolean) => {
    setBroadcast((prev) => ({ open, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const value = useMemo<QuestionsContextValue>(
    () => ({ register, broadcast, setAll, concepts }),
    [register, broadcast, setAll, concepts],
  );

  return (
    <QuestionsContext.Provider value={value}>
      {count > 0 ? (
        <div className="not-prose mb-6 flex items-center gap-2 text-sm">
          <span className="text-fd-muted-foreground">
            {count} {count === 1 ? 'question' : 'questions'}
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
function useCollapsible(anchorId?: string, counted = false) {
  const ctx = useContext(QuestionsContext);
  const [open, setOpen] = useState(false);

  const register = ctx?.register;
  useEffect(() => register?.(counted), [register, counted]);

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
  /**
   * The anchor this question answers, e.g. `id="q48"` pairs with a heading
   * carrying `[#q48]`. Deep-linking to it expands the answer.
   */
  id: string;
  /**
   * Optional. Normally the question text lives in a real markdown heading above
   * this component, so that it reaches the table of contents and the search
   * index — a JSX prop reaches neither. Pass `title` only for a question with no
   * heading of its own.
   */
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useCollapsible(id, true);
  const explainedBy = useContext(QuestionsContext)?.concepts[id] ?? [];
  const panelId = `${id}-answer`;

  // No `not-prose` on the section: the answer body inherits the article's own
  // prose spacing, so paragraphs, code blocks and lists are spaced exactly as
  // they are everywhere else on the site.
  return (
    <section className="my-4 rounded-xl border border-fd-border bg-fd-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="not-prose flex w-full items-start gap-2 p-3 text-start text-sm font-medium"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0 text-fd-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
        <span className="flex-1">{title ?? (open ? 'Hide answer' : 'Show answer')}</span>
        <span className="mt-0.5 shrink-0 font-mono text-xs text-fd-muted-foreground">
          {id.toUpperCase()}
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="border-t border-fd-border px-4 py-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      >
        {children}
        {explainedBy.length > 0 ? (
          <div className="not-prose mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-fd-border bg-fd-muted/40 px-3 py-2 text-xs">
            <Lightbulb aria-hidden className="size-3.5 shrink-0 text-fd-muted-foreground" />
            <span className="text-fd-muted-foreground">The model behind this answer:</span>
            {explainedBy.map((c) => (
              <a key={c.url} href={c.url} className="font-medium underline underline-offset-2">
                {c.title}
              </a>
            ))}
          </div>
        ) : null}
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
