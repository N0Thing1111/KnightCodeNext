export function Alerts({ q }: { q: Record<string, string | undefined> }) {
  return (
    <>
      {q.error && <div className="teacher-alert error">{q.error}</div>}
      {q.notice && <div className="teacher-alert success">✓ {q.notice}</div>}
    </>
  );
}
export function AdminHero({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="teacher-page-hero compact">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children && <div className="admin-actions">{children}</div>}
    </section>
  );
}
