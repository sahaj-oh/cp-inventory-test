// Skeleton loading indicator (replaces the old animated "....." dots). Inline
// renders a short shimmer bar; `full` centers a block for a whole area.
export default function Loading({ full = false }) {
  if (full) {
    return (
      <div className="loading" role="status" aria-label="Loading">
        <span className="inv-skel" style={{ width: 200, height: 16, borderRadius: 8 }} />
      </div>
    );
  }
  return (
    <span
      className="inv-skel"
      role="status"
      aria-label="Loading"
      style={{ display: 'inline-block', width: 88, height: 12, verticalAlign: 'middle' }}
    />
  );
}
