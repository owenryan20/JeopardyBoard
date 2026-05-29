interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
      </header>
      <div className="empty-state card">
        <p>Coming soon in a future release.</p>
      </div>
    </div>
  );
}
