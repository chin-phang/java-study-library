/**
 * Fumadocs' `pageSchema` is a Zod object with `$strip`, so any frontmatter key it
 * does not declare is silently discarded — which is why `concept`, `tier`,
 * `prerequisites`, `unlocks` and `questions` never reached `page.data`.
 *
 * This is a hand-written Standard Schema rather than an extension of
 * `pageSchema`, because extending it needs `zod`, which pnpm's strict layout does
 * not expose (it is only a transitive dependency of fumadocs). CLAUDE.md requires
 * asking before adding a dependency, and ~30 lines avoids the question entirely.
 */
export interface DocFrontmatter {
  title: string;
  description?: string;
  icon?: string;
  full?: boolean;

  /** Reference pages. */
  questionRange?: string;
  tags?: string[];

  /** Concept pages. */
  concept?: string;
  tier?: 'foundational' | 'core' | 'specialist';
  prerequisites?: string[];
  unlocks?: string[];
  /** Reference questions this page explains, as `track/page#qNN`. */
  questions?: string[];
  estimatedStudyTime?: string;
}

type Result =
  | { value: DocFrontmatter }
  | { issues: readonly { readonly message: string }[] };

function validate(value: unknown): Result {
  const v = value as Record<string, unknown> | null;
  if (typeof v !== 'object' || v === null) {
    return { issues: [{ message: 'frontmatter must be an object' }] };
  }
  if (typeof v.title !== 'string' || v.title.length === 0) {
    return { issues: [{ message: '`title` is required and must be a non-empty string' }] };
  }
  for (const key of ['questions', 'prerequisites', 'unlocks', 'tags'] as const) {
    const field = v[key];
    if (field !== undefined && !Array.isArray(field)) {
      return { issues: [{ message: `\`${key}\` must be a list` }] };
    }
  }
  // Unknown keys are deliberately preserved rather than stripped.
  return { value: v as unknown as DocFrontmatter };
}

export const docPageSchema = {
  '~standard': {
    version: 1,
    vendor: 'java-study-library',
    validate,
    types: {
      input: undefined as unknown as DocFrontmatter,
      output: undefined as unknown as DocFrontmatter,
    },
  },
} as const;
