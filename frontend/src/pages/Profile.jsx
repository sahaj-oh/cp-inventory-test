/**
 * My Profile — identity card (left) + a coverage map (right; admin/manager/rm),
 * ported from Direct_Inventory's MyProfile/ScopeMap. The map plots the
 * societies of all distinct submissions using the bundled society coordinates
 * (src/data/societyCoords.json). Same CSS + view as Direct.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
  const roleLower = (user?.role || '').toLowerCase();
  // Coverage map for admin + manager + rm. The list endpoint (@require_staff)
  // scopes rows to the caller, so a manager/rm sees their own submissions.
  const showMap = ['admin', 'manager', 'rm'].includes(roleLower);
  const [heatmap, setHeatmap] = useState(false);   // dots vs heat map
  const [whatToShow, setWhatToShow] = useState('all'); // 'all' | a city name

  // Submissions → { counts per society, cities present, society→city }. Fetched
  // once (cached); the list endpoint returns per-stage first pages, enough for
  // a coverage overview.
  const [mapData, setMapData] = useState({ counts: {}, cities: [], societyCity: {} });
  useEffect(() => {
    if (!showMap) return undefined;
    let alive = true;
    api.adminListSubmissions({ limit: 100, skip_counts: 'true' })
      .then((data) => {
        if (!alive) return;
        const counts = {};
        const citySet = new Set();
        const societyCity = {};
        for (const s of (data.submissions || [])) {
          const soc = (s.society_name || '').trim();
          if (!soc) continue;
          counts[soc] = (counts[soc] || 0) + 1;
          const known = MAP_CITIES.find((c) => c.toLowerCase() === (s.city || '').trim().toLowerCase());
          if (known) { citySet.add(known); societyCity[soc] = known; }
        }
        setMapData({ counts, cities: [...citySet], societyCity });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [showMap]);

  // What the map plots: all societies, or just the picked city's.
  const shown = useMemo(() => {
    const names = Object.keys(mapData.counts);
    if (whatToShow === 'all') {
      return { societies: names, cities: mapData.cities.length ? mapData.cities : MAP_CITIES };
    }
    return { societies: names.filter((n) => mapData.societyCity[n] === whatToShow), cities: [whatToShow] };
  }, [whatToShow, mapData]);

  if (!user) return <Loading />;

  const { name, phone, email, city, role } = user;
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

      {showMap ? (
        <div className="profile-grid2">
          <div className="profile-col">{detailsCard}</div>
          <div className="profile-col">
            <div className="card-block pov-bar">
              <label>What to show</label>
              <select className="role-select" value={whatToShow} onChange={(e) => setWhatToShow(e.target.value)}>
                <option value="all">All submissions</option>
                {mapData.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="view-toggle" role="tablist" style={{ marginLeft: 'auto' }}>
                <button type="button" className={`vt-btn ${!heatmap ? 'on' : ''}`} onClick={() => setHeatmap(false)}>Dots</button>
                <button type="button" className={`vt-btn ${heatmap ? 'on' : ''}`} onClick={() => setHeatmap(true)}>Heat map</button>
              </div>
            </div>
            <div className="card-block scope-card">
              <h3>Coverage map <span className="muted"> · approximate</span></h3>
              <Suspense fallback={<div className="scope-map-skeleton">Loading map…</div>}>
                <ScopeMap cities={shown.cities} society={shown.societies} societyCounts={mapData.counts} heatmap={heatmap} />
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
