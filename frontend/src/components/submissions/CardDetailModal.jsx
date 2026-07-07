/**
 * Wide modal detail view opened from a board-card click. Same section
 * composition as ExpandPanel (via the shared <SubmissionSections>), just in
 * a `.modal-wide` overlay instead of an inline table row. Ported from
 * Direct's CardDetailModal pattern (blurred backdrop, Esc closes).
 *
 * Fetches its own copy of the full submission by `id` (board cards only
 * carry the list-level summary), independent of ExpandPanel's fetch.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { stageMeta, stageLabel } from '../../format';
import { IconClose } from '../icons.jsx';
import SubmissionSections from './SubmissionSections.jsx';

export default function CardDetailModal({ id, canAct, onClose }) {
  const [data, setData] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setData(null);
    setError(null);
    api.adminGetSubmission(id)
      .then((res) => { if (alive) setData({ ...res.submission, events: res.events }); })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load'); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  if (!id) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head-row">
          <h3 style={{ marginBottom: 0 }}>
            {data ? data.society_name : <span className="inv-skel" style={{ display: 'inline-block', width: 160 }} />}
          </h3>
          {data?.city ? <span className="city-chip">{data.city}</span> : null}
          {data?.public_id ? <span className="role-chip">{data.public_id}</span> : null}
          {data ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
              <span className="stage-dot stage-dot-lg" style={{ background: stageMeta(data.status).color }} />
              {stageLabel(data.status)}
            </span>
          ) : (
            <span className="inv-skel" style={{ display: 'inline-block', width: 90 }} />
          )}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        {error ? (
          <div className="modal-error">{error}</div>
        ) : !data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="inv-skel" style={{ width: '60%' }} />
            <div className="inv-skel" style={{ width: '90%' }} />
            <div className="inv-skel" style={{ width: '75%' }} />
          </div>
        ) : (
          <SubmissionSections s={data} canAct={canAct} onChanged={setData} />
        )}
      </div>
    </div>
  );
}
