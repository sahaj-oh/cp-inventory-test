/**
 * Loading placeholder for the expanded submission detail — renders the same
 * masonry card layout SubmissionSections produces, as shimmer cards, so the
 * column structure appears instantly and data fills in (replaces the old
 * "....." dots spinner in ExpandPanel / CardDetailModal).
 */
function SkelCard({ lines }) {
  return (
    <div className="card-block">
      <div className="inv-skel" style={{ width: '42%', height: 15, marginBottom: 16 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="inv-skel" style={{ width: `${92 - i * 13}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}

export default function SectionsSkeleton({ stacked }) {
  // Line counts roughly mirror the real sections so columns balance similarly.
  const shape = stacked ? [3, 4, 3, 3, 2] : [5, 3, 4, 3, 4, 2, 3, 3];
  return (
    <div className={`expand-inner${stacked ? ' expand-stack' : ''}`}>
      {shape.map((n, i) => <SkelCard key={i} lines={n} />)}
    </div>
  );
}
