import type { ReactNode } from 'react';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema } from 'fumadocs-core/source/schema';
import { docPageSchema } from './schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docPageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImageUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: '/' + [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: '/' + [page.locale, ...docsContentRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

/* ------------------------------------------------------------------------- *
 * Concept <-> question linking.
 *
 * A concept page declares the reference questions it explains in its
 * `questions:` frontmatter, as `track/page#qNN`. That single declaration drives
 * both directions: nothing is hand-written on the reference side, so the two can
 * never drift apart.
 * ------------------------------------------------------------------------- */

export interface QuestionRef {
  /** `track/page#qNN` exactly as written in frontmatter. */
  raw: string;
  /** `/docs/track/page#qNN`, or null when the anchor does not exist. */
  url: string | null;
  /**
   * The question's heading, or null when it cannot be resolved. This is a
   * ReactNode, not a string: heading text contains inline code (`volatile`),
   * which fumadocs keeps as elements in the ToC.
   */
  title: ReactNode | null;
}

export interface ConceptRef {
  url: string;
  title: string;
}

function tocTitle(page: (typeof source)['$inferPage'], anchor: string): ReactNode | null {
  for (const item of page.data.toc) {
    if (item.url === `#${anchor}`) return item.title ?? null;
  }
  return null;
}

/** Resolve one concept page's `questions:` list into links, flagging bad anchors. */
export function resolveQuestions(entries: readonly string[] | undefined): QuestionRef[] {
  if (!entries) return [];
  return entries.map((raw) => {
    const [path, anchor] = raw.split('#');
    const target = anchor ? source.getPage(path.split('/')) : undefined;
    if (!target || !anchor) return { raw, url: null, title: null };
    const title = tocTitle(target, anchor);
    return {
      raw,
      url: title === null ? null : `${target.url}#${anchor}`,
      title,
    };
  });
}

/** Every page carrying a `concept:` field. */
export function conceptPages() {
  return source.getPages().filter((p) => typeof p.data.concept === 'string');
}

/**
 * The reverse index for one reference page: anchor (`q48`) -> the concept pages
 * that claim to explain it. Derived from the concept pages' frontmatter.
 */
export function conceptsForPage(pageSlugs: readonly string[]): Record<string, ConceptRef[]> {
  const key = pageSlugs.join('/');
  const out: Record<string, ConceptRef[]> = {};
  for (const concept of conceptPages()) {
    for (const raw of concept.data.questions ?? []) {
      const [path, anchor] = raw.split('#');
      if (path !== key || !anchor) continue;
      (out[anchor] ??= []).push({ url: concept.url, title: concept.data.title });
    }
  }
  return out;
}
