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
        // Token pairs so the collated / submissions-match banner reads correctly
        // in dark mode (was hardcoded light bg + dark text → glaring on black).
        const bg = hasSubmissions ? 'var(--brand-soft)' : 'var(--amber-bg)';
        const border = hasSubmissions ? '1px solid var(--brand-ring)' : '1px solid var(--amber)';
        const color = hasSubmissions ? 'var(--brand-strong)' : 'var(--amber-fg)';
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
    <div className="card-block">
      <h3>Activity ({events.length})</h3>
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

export default function SubmissionSections({ s, canAct, onChanged, onOpenCpHistory, stacked, columns }) {
  const { user } = useAuth();
  const role = user?.role;
  if (!s) return null;

  // Direct-style horizontal columns for the table-view row expand: one section
  // (group) per column, the row scrolls sideways, nothing clustered. Empty
  // columns (e.g. Counter Offer with no offer) collapse via `.expand-col:empty`.
  if (columns) {
    const canCreateTickets = canAct && role !== 'rm';
    return (
      <div>
        <Banners s={s} />
        {/* .expand-scroll (width:1px; min-width:100%) keeps the wide column row
            scrolling WITHIN the table width instead of widening the whole table. */}
        <div className="expand-scroll">
        <div className="expand-inner expand-cols">
          <div className="expand-col">
            <StatusSection submission={s} canAct={canAct} onChanged={onChanged} />
            <ScheduleVisitSection submission={s} canAct={canAct} onChanged={onChanged} />
          </div>
          <div className="expand-col">
            <UnitDetailsSection submission={s} canAct={canAct} onChanged={onChanged} />
          </div>
          <div className="expand-col">
            <PricingSection submission={s} canAct={canAct} onChanged={onChanged} />
            <PeopleSection submission={s} onOpenCpHistory={onOpenCpHistory} />
          </div>
          <div className="expand-col">
            <ReassignRmSection submission={s} canAct={canAct} onChanged={onChanged} />
          </div>
          <div className="expand-col">
            <NotesSection submission={s} canAct={canAct} onChanged={onChanged} />
          </div>
          <div className="expand-col">
            <TicketsSection submissionId={s.id} publicId={s.public_id} canCreate={canCreateTickets} />
          </div>
          <div className="expand-col">
            <CounterOfferSection submission={s} canAct={canAct} onChanged={onChanged} />
          </div>
          <div className="expand-col">
            <ActivityTimeline s={s} />
          </div>
          <div className="expand-col">
            <MediaSection submission={s} canAct={canAct} onChanged={onChanged} only="attachments" />
          </div>
          <div className="expand-col">
            <MediaSection submission={s} canAct={canAct} onChanged={onChanged} only="media" />
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Order mirrors CP's DetailPanel, with two layout tweaks: Status + Visit
  // Schedule share a side-by-side row, and Pricing + People merge into one
  // "Pricing & People" card. `stacked` renders one clean column (the popup);
  // otherwise the wide inline row flows them as masonry cards.
  return (
    <div>
      <Banners s={s} />
      <div className={`expand-inner${stacked ? ' expand-stack' : ''}`}>
        <div className="expand-pair">
          <StatusSection submission={s} canAct={canAct} onChanged={onChanged} />
          <ScheduleVisitSection submission={s} canAct={canAct} onChanged={onChanged} />
        </div>
        <UnitDetailsSection submission={s} canAct={canAct} onChanged={onChanged} />
        <div className="card-block">
          <h3>Pricing &amp; People</h3>
          <PricingSection submission={s} embedded />
          <div className="pair-divider" />
          <PeopleSection submission={s} onOpenCpHistory={onOpenCpHistory} embedded />
        </div>
        <CounterOfferSection submission={s} canAct={canAct} onChanged={onChanged} />
        <ReassignRmSection submission={s} canAct={canAct} onChanged={onChanged} />
        <NotesSection submission={s} canAct={canAct} onChanged={onChanged} />
        <ActivityTimeline s={s} />
        <TicketsSection submissionId={s.id} publicId={s.public_id} canCreate={canAct && role !== 'rm'} />
        <MediaSection submission={s} canAct={canAct} onChanged={onChanged} />
      </div>
    </div>
  );
}
