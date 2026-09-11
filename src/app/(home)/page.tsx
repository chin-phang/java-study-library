import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Java Study Library',
  description:
    'Backend Java, the data systems around it, and software design — built for depth rather than recall.',
};

const entries = [
  {
    href: '/docs/concepts/jmm',
    eyebrow: 'Start here',
    title: 'Concept pages',
    body: 'Build the model. Each opens with a failure you can reproduce, explains why the mechanism was designed that way, and ends with a lab you run and questions you cannot answer from memory alone.',
  },
  {
    href: '/docs/java/concurrency',
    eyebrow: 'Then test it',
    title: 'Reference questions',
    body: 'Question, model answer, why it matters, follow-ups. Answers are collapsed by default, so use them to self-test once the model is built — not to learn from cold.',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-center text-3xl font-bold">Java Study Library</h1>
      <p className="mt-4 max-w-2xl text-center text-fd-muted-foreground">
        Backend Java, the data systems around it, and software design — built for
        depth rather than recall. The goal is judgement: being the person who can
        settle a technical argument with reasoning and evidence.
      </p>

      <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded-xl border border-fd-border bg-fd-card p-5 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <span className="text-xs font-medium text-fd-muted-foreground">{entry.eyebrow}</span>
            <h2 className="mt-1 font-semibold">{entry.title}</h2>
            <p className="mt-2 text-sm text-fd-muted-foreground">{entry.body}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/docs"
        className="mt-8 text-sm font-medium text-fd-muted-foreground underline underline-offset-4 hover:text-fd-foreground"
      >
        Browse the whole library
      </Link>
    </main>
  );
}
