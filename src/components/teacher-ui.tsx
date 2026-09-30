import Link from "next/link";
export function Alerts({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <>
      {searchParams.error && (
        <div className="teacher-alert error">{searchParams.error}</div>
      )}
      {searchParams.notice && (
        <div className="teacher-alert success">✓ {searchParams.notice}</div>
      )}
    </>
  );
}
export function Hero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="teacher-page-hero compact">
      <div>
        <span className="teacher-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
export function Back({ href, label }: { href: string; label: string }) {
  return (
    <div className="teacher-back">
      <Link href={href}>← {label}</Link>
    </div>
  );
}
