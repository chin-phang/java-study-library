import { defineConfig } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins/remark-mdx-mermaid';

/**
 * Global MDX options only. Collections are defined with the Macro API in
 * `src/lib/source.ts` (see https://fumadocs.dev/docs/mdx/macro) — the macro docs
 * state you may keep a `source.config.ts` alongside it for global plugins.
 *
 * This has to be global rather than a collection-level `mdxOptions`, because
 * a collection-level `mdxOptions` *replaces* the default plugin set, which would
 * drop the plugins that build `toc` and `structuredData` (and so break search).
 */
export default defineConfig({
  mdxOptions: {
    // Rewrites ```mermaid fenced blocks into <Mermaid chart="..." /> before
    // Shiki sees them. `Mermaid` is registered in src/components/mdx.tsx.
    remarkPlugins: (v) => [remarkMdxMermaid, ...v],
  },
});
