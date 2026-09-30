import Link from "next/link";
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
        <span className="teacher-eyebrow">SCHOOL WORKSPACE</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children && <div className="admin-actions">{children}</div>}
    </section>
  );
}
export function CardHead({
  eyebrow,
  title,
  href,
  label,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="teacher-card-head">
      <div>
        <span className="teacher-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {href && <Link href={href}>{label}</Link>}
    </div>
  );
}
