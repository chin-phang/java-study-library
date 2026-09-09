import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Question } from '@/components/Question';
import { FollowUp } from '@/components/FollowUp';
import { Mermaid } from '@/components/Mermaid';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Question,
    FollowUp,
    // Emitted by `remarkMdxMermaid` from ```mermaid fenced blocks.
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
