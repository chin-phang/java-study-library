import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Question } from '@/components/Question';
import { FollowUp } from '@/components/FollowUp';
import { Mermaid } from '@/components/Mermaid';
import { SelfCheck, SelfCheckItem } from '@/components/SelfCheck';
import { StudyPath } from '@/components/StudyPath';
import { SymptomIndex } from '@/components/SymptomIndex';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Question,
    FollowUp,
    SelfCheck,
    SelfCheckItem,
    StudyPath,
    SymptomIndex,
    // Emitted by `remarkMdxMermaid` from ```mermaid fenced blocks.
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
