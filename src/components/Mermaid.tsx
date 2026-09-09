'use client';

import { use, useEffect, useId, useState } from 'react';
import { useTheme } from 'fumadocs-ui/provider/base';

/**
 * Fumadocs does not render mermaid natively. `remarkMdxMermaid` (wired up in
 * `source.config.ts`) turns ```mermaid fenced blocks into <Mermaid chart="..." />,
 * and this component renders them client-side.
 *
 * Follows https://fumadocs.dev/docs/markdown/mermaid, with `useTheme` taken from
 * `fumadocs-ui/provider/base` (which re-exports next-themes' hook) so next-themes
 * is not needed as a direct dependency.
 */
export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  // React's useId produces characters that are illegal in a DOM id, and
  // mermaid.render() uses its first argument as an element id / CSS selector.
  const domId = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')));

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeCSS: 'margin: 1.5rem auto 0;',
    theme: resolvedTheme === 'dark' ? 'dark' : 'default',
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => mermaid.render(domId, chart)),
  );

  return (
    <div
      className="not-prose my-6 overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
