/**
 * Inline row-expand detail (Direct pattern) — the panel a table row reveals
 * when clicked. Lazy-fetches the full submission (+events) on mount, shows
 * a skeleton until it lands, then renders the shared section composition.
 *
 * `onChanged` is optional and — when supplied by TableView — used to patch
 * the collapsed row's own summary fields too (status pill, price, etc.) so
 * the row doesn't go stale relative to what was just edited inline.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api';
import SubmissionSections from './SubmissionSections.jsx';
import SectionsSkeleton from './SectionsSkeleton.jsx';

export default function ExpandPanel({ id, canAct, onChanged }) {
  const [data, setData] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    api.adminGetSubmission(id)
      .then((res) => { if (alive) setData({ ...res.submission, events: res.events }); })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load'); });
    return () => { alive = false; };
  }, [id]);

  // Update this panel's own view immediately, and bubble the fresh row up to
  // the host (TableView's per-row override) so the collapsed row summary
  // reflects the change without waiting for the next full reload.
  const handleChanged = (updated) => {
    setData(updated);
    onChanged?.(updated);
  };

  if (error) {
    return (
      <div className="expand-inner">
        <div className="card-block" style={{ color: 'var(--red-fg)' }}>{error}</div>
      </div>
    );
  }

  if (!data) return <SectionsSkeleton columns />;

  return <SubmissionSections s={data} canAct={canAct} onChanged={handleChanged} columns />;
}
