interface Props {
  title: string;
  phase: string;
  description: string;
}

/** Temporary scaffold page — replaced feature by feature in later phases. */
export function PagePlaceholder({ title, phase, description }: Props) {
  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="card p-5">
        <p className="text-sm font-semibold text-accent">{phase}</p>
        <p className="mt-1 text-sm text-ink-2">{description}</p>
      </div>
    </div>
  );
}
