export default function Loading() {
  return (
    <div className="teacher-loading">
      <section className="teacher-loading-hero">
        <span />
        <i />
        <b />
      </section>
      <div className="teacher-loading-metrics">
        {[1, 2, 3, 4].map((x) => (
          <span key={x} />
        ))}
      </div>
      <div className="teacher-loading-grid">
        <section />
        <section />
      </div>
    </div>
  );
}
