/**
 * My Profile — identity card (left) + a coverage map (right, admin only),
 * ported from Direct_Inventory's MyProfile/ScopeMap. The map plots the
 * societies of all distinct submissions using the bundled society coordinates
 * (src/data/societyCoords.json). Same CSS + view as Direct.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api';
import Loading from '../components/Loading.jsx';

// MapLibre is heavy — only load it when the map is actually shown.
const ScopeMap = lazy(() => import('../components/ScopeMap.jsx'));

const MAP_CITIES = ['Gurgaon', 'Noida', 'Ghaziabad'];

function initials(name) {
  const s = (name || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

function managerName(user) {
  if (typeof user.manager === 'string') return user.manager;
  if (user.manager && typeof user.manager === 'object') return user.manager.name || user.manager.email || null;
  return user.managerName || null;
}

export default function Profile() {
  const { user } = useAuth();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  // Distinct societies of all submissions → the map's markers. Fetched once
  // (cached) for admins only; the list endpoint returns per-stage first pages,
  // which covers the societies in play for a "show everything" overview.
  const [societies, setSocieties] = useState([]);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    api.adminListSubmissions({ limit: 100, skip_counts: 'true' })
      .then((data) => {
        if (!alive) return;
        const set = new Set();
        for (const s of (data.submissions || [])) {
          const soc = (s.society_name || '').trim();
          if (soc) set.add(soc);
        }
        setSocieties([...set]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isAdmin]);

  if (!user) return <Loading />;

  const { name, phone, email, city, role } = user;
  const roleLower = (role || '').toLowerCase();
  const showCity = ['viewer', 'rm', 'manager'].includes(roleLower);
  const mgrName = managerName(user);
  const showManager = ['rm', 'manager'].includes(roleLower) && !!mgrName;

  const detailsCard = (
    <div className="card-block">
      <div className="pf-head">
        <span className="pf-avatar">{initials(name)}</span>
        <div>
          <div className="pf-name">
            {name || '—'} <span className="role-chip">{role || '—'}</span>
          </div>
          <div className="muted">{[email, phone].filter(Boolean).join(' · ') || '—'}</div>
        </div>
      </div>

      <div className="pf-grid">
        <div className="field-row">
          <div className="field-lbl">Name</div>
          <div className="field-val">{name || '—'}</div>
        </div>
        <div className="field-row">
          <div className="field-lbl">Phone</div>
          <div className="field-val">{phone || '—'}</div>
        </div>
        {email && (
          <div className="field-row">
            <div className="field-lbl">Email</div>
            <div className="field-val">{email}</div>
          </div>
        )}
        <div className="field-row">
          <div className="field-lbl">Role</div>
          <div className="field-val" style={{ textTransform: 'capitalize' }}>{role || '—'}</div>
        </div>
        {showCity && (
          <div className="field-row">
            <div className="field-lbl">City</div>
            <div className="field-val">{city || '—'}</div>
          </div>
        )}
        {showManager && (
          <div className="field-row">
            <div className="field-lbl">My Manager</div>
            <div className="field-val">{mgrName}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="page-head">
        <h2>My Profile</h2>
      </div>

      {isAdmin ? (
        <div className="profile-grid2">
          <div className="profile-col">{detailsCard}</div>
          <div className="profile-col">
            {/* What to show — for now, all distinct submissions. */}
            <div className="card-block pov-bar">
              <label>What to show</label>
              <select className="role-select" value="all" onChange={() => {}}>
                <option value="all">All submissions</option>
              </select>
            </div>
            <div className="card-block scope-card">
              <h3>Coverage map <span className="muted"> · approximate</span></h3>
              <Suspense fallback={<div className="scope-map-skeleton">Loading map…</div>}>
                <ScopeMap cities={MAP_CITIES} society={societies} micro_market={[]} />
              </Suspense>
            </div>
          </div>
        </div>
      ) : (
        detailsCard
      )}
    </div>
  );
}
