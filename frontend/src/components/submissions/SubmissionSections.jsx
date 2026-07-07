/**
 * Shared section composition used by both ExpandPanel (inline table row) and
 * CardDetailModal (board card click) — the single place that lays out the
 * Task 1 detail sections so both entry points render identical content.
 *
 * `s` must already be the merged `{ ...submission, events }` shape (the
 * caller fetches via api.adminGetSubmission(id) and merges before passing
 * down — see Task 1's report for this convention).
 *
 * Also renders two pieces that are NOT part of the 10 extracted sections
 * (per the P3.3 brief's forward note from Task 1): the status banners
 * (perfect-match / withdrawn / unit-less) and the general Activity timeline
 * (status changes / system events / counter-offer notes — everything except
 * user comments, which live in NotesSection). Ported from CP
 * `screens/Admin/DetailPanel.jsx` (banners block + the Activity section),
 * kept as CP's literal colors since these are one-off tints with no
 * existing token equivalents.
 */
import { useState } from 'react';
import { formatDateTime } from '../../format';
import { thumbnailUrl, previewUrl } from '../../cloudinary';
import { useAuth } from '../../contexts/AuthContext.jsx';

import UnitDetailsSection from './detail/UnitDetailsSection.jsx';
import EditFieldsSection from './detail/EditFieldsSection.jsx';
import PricingSection from './detail/PricingSection.jsx';
import CounterOfferSection from './detail/CounterOfferSection.jsx';
import PeopleSection from './detail/PeopleSection.jsx';
import ReassignRmSection from './detail/ReassignRmSection.jsx';
import StatusSection from './detail/StatusSection.jsx';
import ScheduleVisitSection from './detail/ScheduleVisitSection.jsx';
import NotesSection from './detail/NotesSection.jsx';
import MediaSection from './detail/MediaSection.jsx';
import TicketsSection from '../tickets/TicketsSection.jsx';

// Ported verbatim from CP DetailPanel.jsx's banners block (perfect-match /
// withdrawn / unit-less), just swapped to token-agnostic literal colors
// (matches CP's own literal hex — no reusable class existed for these).
function Banners({ s }) {
  if (!(s.perfect_match_at_submit || s.deleted_at || (s.unit_less && !s.deleted_at))) return null;
  return (
    <div style={{ padding: '16px 22px 0' }}>
      {s.perfect_match_at_submit && (
        <div style={{
          margin: '0 0 14px', padding: '10px 12px', background: '#fef2f2',
          border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b',
        }}>
          <strong>⚠ Perfect match detected at submit time.</strong>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
            Same society + BHK + floor + unit number was already in our system or properties DB
            when the CP submitted this.
          </div>
        </div>
      )}
      {s.deleted_at && (
        <div style={{
          margin: '0 0 14px', padding: '10px 12px', background: '#fef3c7',
          border: '1.5px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e', fontWeight: 600,
        }}>
          ✓ Withdrawn{s.withdraw_reason === 'cp_withdrawn' ? ' by CP' : ''}
        </div>
      )}
      {s.unit_less && !s.perfect_match_at_submit && !s.deleted_at && (() => {
        const hasSubmissions = !!s.submissions_match;
        const hasCollated = !!s.collated_match;
        const bg = hasSubmissions ? '#f5f3ff' : '#fffbeb';
        const border = hasSubmissions ? '1px solid #c4b5fd' : '1px solid #fcd34d';
        const color = hasSubmissions ? '#5b21b6' : '#78350f';
        let suffix;
        if (hasSubmissions && hasCollated) suffix = ' · matches both another CP submission and a 99acres listing';
        else if (hasSubmissions) suffix = ' · matches another CP submission';
        else if (hasCollated) suffix = ' · matches a 99acres listing';
        else suffix = ' · auto-approved';
        return (
          <div style={{ margin: '0 0 14px', padding: '8px 12px', background: bg, border, borderRadius: 8, fontSize: 12, color }}>
            Submitted without unit number{suffix}
          </div>
        );
      })()}
    </div>
  );
}

// General Activity timeline — every event except user comments (those are
// NotesSection's job). Ported from CP DetailPanel.jsx's Activity block,
// including inline media thumbnails on `media_shared` events with their own
// small lightbox (kept local/independent per section, matching Task 1's
// "each section independently mountable" convention).
function ActivityTimeline({ s }) {
  const [lightboxId, setLightboxId] = useState(null);
  const events = (s.events || []).filter((ev) => ev.kind !== 'comment');

  return (
    <div className="expand-sec">
      <h4>Activity ({events.length})</h4>
      {events.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>No activity yet.</div>
      ) : (
        <div className="note-list">
          {events.map((ev) => (
            <div key={ev.id} className="note-item">
              <div className="note-body">
                <div className="note-meta">
                  <strong>{ev.actor_name || 'System'}</strong>
                  {ev.actor_role && ev.actor_role !== 'cp' && (
                    <span className="role-chip">{ev.actor_role}</span>
                  )}
                  <span className="note-time">{formatDateTime(ev.created_at)}</span>
                </div>
                <div className="note-text">
                  {ev.kind === 'status_change' ? (
                    <span>Status: <strong>{ev.from_status || '—'}</strong> → <strong>{ev.to_status}</strong></span>
                  ) : ev.kind === 'system' ? (
                    <em>{ev.text || 'Unit submitted'}</em>
                  ) : ev.text ? (
                    <span>{ev.text}</span>
                  ) : null}
                </div>
                {ev.kind === 'media_shared' && ((Array.isArray(s.photos) && s.photos.length > 0) || (Array.isArray(s.videos) && s.videos.length > 0)) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {(s.photos || []).slice(0, 6).map((pid) => (
                      <img
                        key={pid} src={thumbnailUrl(pid, 56)} alt=""
                        onClick={() => setLightboxId(pid)}
                        style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border)' }}
                      />
                    ))}
                    {(s.videos || []).slice(0, 4).map((v, i) => (
                      <a
                        key={v.public_id || i} href={v.url} target="_blank" rel="noopener noreferrer" title="Open video"
                        style={{
                          width: 48, height: 48, borderRadius: 6, background: '#111', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none',
                        }}
                      >▶</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxId && (
        <div className="modal-backdrop" onClick={() => setLightboxId(null)}>
          <img
            src={previewUrl(lightboxId)}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}
    </div>
  );
}

export default function SubmissionSections({ s, canAct, onChanged, onOpenCpHistory }) {
  const { user } = useAuth();
  const role = user?.role;
  if (!s) return null;
  return (
    <div>
      <Banners s={s} />
      <div className="expand-inner">
        <div className="expand-sec expand-sec-wide">
          <UnitDetailsSection submission={s} canAct={canAct} onChanged={onChanged} />
          <EditFieldsSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <div className="expand-sec">
          <PricingSection submission={s} canAct={canAct} onChanged={onChanged} />
          <CounterOfferSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <div className="expand-sec expand-sec-narrow">
          <PeopleSection submission={s} canAct={canAct} onChanged={onChanged} onOpenCpHistory={onOpenCpHistory} />
          <ReassignRmSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <div className="expand-sec">
          <StatusSection submission={s} canAct={canAct} onChanged={onChanged} />
          <ScheduleVisitSection submission={s} canAct={canAct} onChanged={onChanged} />
          <NotesSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <div className="expand-sec">
          <TicketsSection submissionId={s.id} publicId={s.public_id} canCreate={canAct && role !== 'rm'} />
        </div>
        <div className="expand-sec">
          <MediaSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <ActivityTimeline s={s} />
      </div>
    </div>
  );
}
