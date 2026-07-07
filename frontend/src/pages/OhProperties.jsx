/**
 * OH Properties — read-only merged view of inventory rows that are NOT in
 * our submissions table:
 *   - "D Data" => collated_data (App DB; 99acres etc. scrape)
 *   - "F Data" => properties      (Properties DB; the prod inventory pool)
 *
 * Server-side merged + paginated via api.adminListExternalInventory (GET
 * /api/admin/external-inventory). Data logic ported verbatim (in spirit)
 * from CP's `screens/Admin/ExternalInventory.jsx`: debounced search (min 2
 * chars), D/F type toggle + counts, facet-driven filters (city/source/bhk/
 * floor/area), date presets, server sort + Prev/Next pagination.
 *
 * Re-skinned into Direct's shell: `.toolbar` (search + `.view-toggle` D/F/
 * Both + Filters button) instead of CP's sticky search/filter rows; the two
 * CP filter rows fold into a Direct-style filter modal (built from
 * Submissions' FilterModal shell — `.filter-modal`/`.filter-grid`/
 * `.filter-block`, two-state form-vs-applied, Reset/Cancel/Apply footer);
 * `.inv-table` (Submissions' TableView sticky-sortable-header shell) instead
 * of CP's custom sticky table. Same columns, same facets, same request
 * params to the server — only the chrome changed.
 */
import { useEffect, useMemo, useState } from 'react';

import { ApiError, api } from '../api';
import { formatDateOnly } from '../format';
import { IconFilter, IconClose } from '../components/icons.jsx';

const PAGE_SIZE = 100;

const DATE_PRESETS = ['All', 'Yesterday', 'This Week', 'This Month', 'Custom'];

/** ISO date (YYYY-MM-DD) helpers in local time. */
function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function startOfWeekMonday(d) {
  const day = d.getDay() || 7; // 1..7, Mon=1
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function rangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'Yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: isoDate(y), to: isoDate(y) };
  }
  if (preset === 'This Week') {
    return { from: isoDate(startOfWeekMonday(today)), to: isoDate(today) };
  }
  if (preset === 'This Month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: isoDate(first), to: isoDate(today) };
  }
  return { from: '', to: '' }; // 'All' or 'Custom' (custom is filled by user)
}
/** Strip the "-Scraping" suffix used by some collated_data rows so
 *  "99acres-Scraping" displays as "99acres". User-facing only — the
 *  backend keeps the raw value but matches both forms when filtering. */
function canonicalSource(s) {
  if (!s) return s;
  return s.replace(/-Scraping$/i, '');
}

const EMPTY_FILTERS = {
  city: '', source: '', bhk: '', floor: '', areaMin: '', areaMax: '',
  datePreset: 'All', dateFrom: '', dateTo: '',
};

function seedFilters(initial = {}) {
  return { ...EMPTY_FILTERS, ...initial };
}

export default function OhProperties() {
  const [searchInput, setSearchInput] = useState('');
  // Debounced 300ms, applied only once >= 2 chars (mirrors CP's useDebouncedValue).
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [typeFilter, setTypeFilter] = useState(''); // '' = both, 'D', 'F'

  // Committed (applied) filter-modal fields. Search + type stay live in the
  // toolbar; everything else is buffered in the modal until Apply.
  const [city, setCity] = useState('');
  const [source, setSource] = useState('');
  const [bhk, setBhk] = useState('');
  const [floor, setFloor] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [datePreset, setDatePreset] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const [data, setData] = useState({
    results: [], total: 0,
    counts: { D: 0, F: 0 },
    facets: { sources: [], cities: [], bhks: [] },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeFilterCount = [city, source, bhk, floor, areaMin, areaMax, datePreset !== 'All']
    .filter(Boolean).length;

  // Reset page to 1 whenever a filter/sort/search/type changes.
  useEffect(() => { setPage(1); }, [search, city, source, bhk, floor, areaMin, areaMax, dateFrom, dateTo, typeFilter, sortCol, sortDir]);

  const filters = useMemo(() => {
    const f = { page, page_size: PAGE_SIZE, sort: sortCol, direction: sortDir };
    if (search.trim().length >= 2) f.q = search.trim();
    if (city) f.city = city;
    if (source) f.source = source;
    if (bhk) f.bhk = bhk;
    if (floor) f.floor = floor;
    if (areaMin) f.area_min = areaMin;
    if (areaMax) f.area_max = areaMax;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (typeFilter) f.type = typeFilter;
    return f;
  }, [search, city, source, bhk, floor, areaMin, areaMax, dateFrom, dateTo, typeFilter, sortCol, sortDir, page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.adminListExternalInventory(filters);
        if (!alive) return;
        setData({
          results: res.results || [],
          total: res.total || 0,
          counts: res.counts || { D: 0, F: 0 },
          facets: res.facets || { sources: [], cities: [], bhks: [] },
        });
      } catch (e) {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load OH Properties');
        setData({ results: [], total: 0, counts: { D: 0, F: 0 }, facets: { sources: [], cities: [], bhks: [] } });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const start = data.results.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = (page - 1) * PAGE_SIZE + data.results.length;

  const onSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'date' || col === 'area' ? 'desc' : 'asc');
    }
  };

  const Th = ({ sortKey, right, children }) => {
    const active = sortKey && sortCol === sortKey;
    const arrow = active ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
    return (
      <th
        className={`inv-th ${sortKey ? 'inv-th-sortable' : ''} ${active ? 'inv-th-active' : ''} ${right ? 'inv-th-right' : ''}`}
        onClick={sortKey ? () => onSort(sortKey) : undefined}
        title={sortKey ? `Sort by ${children}` : undefined}
      >
        {children}
        {sortKey && <> <span className={active ? 'inv-th-arrow-active' : 'inv-th-arrow'}>{arrow}</span></>}
      </th>
    );
  };

  return (
    <div>
      <div className="page-head">
        <h2>OH Properties</h2>
        <div className="ph-sub muted">
          {loading ? 'Loading…' : `${data.total.toLocaleString()} rows · showing ${start}–${end}`}
        </div>
      </div>

      <div className="toolbar">
        <div className="search-form" role="search">
          <input
            type="search"
            placeholder="Search society, locality, source… (min 2 chars)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="view-toggle" role="tablist">
          <button type="button" className={`vt-btn ${typeFilter === '' ? 'on' : ''}`} onClick={() => setTypeFilter('')}>
            Both
          </button>
          <button type="button" className={`vt-btn ${typeFilter === 'D' ? 'on' : ''}`} onClick={() => setTypeFilter('D')}>
            D ({data.counts.D})
          </button>
          <button type="button" className={`vt-btn ${typeFilter === 'F' ? 'on' : ''}`} onClick={() => setTypeFilter('F')}>
            F ({data.counts.F})
          </button>
        </div>

        <button
          type="button"
          className={`btn-ghost${showFilters ? ' btn-soft' : ''}`}
          onClick={() => setShowFilters(true)}
          title="More filters"
        >
          <IconFilter size={15} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      <FiltersModal
        open={showFilters}
        initial={{ city, source, bhk, floor, areaMin, areaMax, datePreset, dateFrom, dateTo }}
        facets={data.facets}
        onClose={() => setShowFilters(false)}
        onApply={(applied) => {
          setCity(applied.city);
          setSource(applied.source);
          setBhk(applied.bhk);
          setFloor(applied.floor);
          setAreaMin(applied.areaMin);
          setAreaMax(applied.areaMax);
          setDatePreset(applied.datePreset);
          setDateFrom(applied.dateFrom);
          setDateTo(applied.dateTo);
          setShowFilters(false);
        }}
      />

      {error && (
        <div className="muted" style={{ padding: '10px 0', color: 'var(--red-fg)' }}>{error}</div>
      )}

      <div className="inv-table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>ID</Th>
              <Th>Source</Th>
              <Th>Society</Th>
              <Th sortKey="city">City</Th>
              <Th sortKey="bhk">BHK</Th>
              <Th sortKey="floor">Floor</Th>
              <Th>Tower</Th>
              <Th>Unit</Th>
              <Th sortKey="area" right>Area (sqft)</Th>
              <Th sortKey="date">Date</Th>
            </tr>
          </thead>
          <tbody>
            {data.results.length === 0 && !loading ? (
              <tr>
                <td colSpan={11} className="inv-empty">No OH Properties match your filters.</td>
              </tr>
            ) : (
              data.results.map((r, i) => (
                <tr key={`${r.type}-${r.id}-${i}`} className="inv-row">
                  <td>
                    <span
                      style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                        background: r.type === 'D' ? 'rgba(139,92,246,.14)' : 'var(--brand-soft)',
                        color: r.type === 'D' ? 'var(--purple)' : 'var(--brand-strong)',
                      }}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.id || '—'}
                  </td>
                  <td>{canonicalSource(r.source) || '—'}</td>
                  <td className="inv-td-society">
                    {r.society || '—'}
                    {r.locality && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{r.locality}</div>}
                  </td>
                  <td className="inv-td-muted">{r.city || '—'}</td>
                  <td>{r.bhk || '—'}</td>
                  <td>{r.floor || '—'}</td>
                  <td>{r.tower || '—'}</td>
                  <td>{r.unit_no || '—'}</td>
                  <td className="inv-td-num">{r.area != null ? Number(r.area).toLocaleString() : '—'}</td>
                  <td className="inv-td-muted" style={{ whiteSpace: 'nowrap' }}>{r.date ? formatDateOnly(r.date) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            ← Prev
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            Page <strong>{page}</strong> of <strong>{totalPages.toLocaleString()}</strong>
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── filters modal ──────────────────────────────────────────────────────
// Built from Submissions' FilterModal shell (`.modal-backdrop .modal
// .filter-modal`, `.filter-grid` of `.filter-block`s, two-state form-vs-
// applied, Reset/Cancel/Apply footer) with CP ExternalInventory's filter
// blocks (city/source/bhk/floor/area/date) instead of Submissions' ones.
function FiltersModal({ open, initial, facets, onApply, onClose }) {
  const [f, setF] = useState(() => seedFilters(initial));

  useEffect(() => {
    if (open) setF(seedFilters(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }

  function applyDatePreset(preset) {
    if (preset === 'Custom') { set('datePreset', 'Custom'); return; }
    const { from, to } = rangeForPreset(preset);
    setF((p) => ({ ...p, datePreset: preset, dateFrom: from, dateTo: to }));
  }

  function reset() { setF(EMPTY_FILTERS); }
  function apply() { onApply(f); }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head-row">
          <h3>Filters</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="filter-grid">
          <div className="filter-block">
            <label>City</label>
            <select value={f.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">All</option>
              {['Noida', 'Gurgaon', 'Ghaziabad'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label>Source</label>
            <select value={f.source} onChange={(e) => set('source', e.target.value)}>
              <option value="">All</option>
              {(facets.sources || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label>BHK</label>
            <select value={f.bhk} onChange={(e) => set('bhk', e.target.value)}>
              <option value="">All</option>
              {(facets.bhks || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label>Floor</label>
            <input value={f.floor} onChange={(e) => set('floor', e.target.value)} placeholder="e.g. 5 / Lower" />
          </div>

          <div className="filter-block">
            <label>Area (sqft)</label>
            <div className="range-row">
              <input type="number" min={0} value={f.areaMin} onChange={(e) => set('areaMin', e.target.value)} placeholder="min" />
              <span className="muted">to</span>
              <input type="number" min={0} value={f.areaMax} onChange={(e) => set('areaMax', e.target.value)} placeholder="max" />
            </div>
          </div>

          <div className="filter-block" style={{ gridColumn: '1 / -1' }}>
            <label>Date</label>
            <div className="preset-grid-3">
              {DATE_PRESETS.map((p) => (
                <button key={p} type="button" className={f.datePreset === p ? 'pill pill-on' : 'pill'} onClick={() => applyDatePreset(p)}>
                  {p}
                </button>
              ))}
            </div>
            {f.datePreset === 'Custom' && (
              <div className="range-row" style={{ marginTop: 8 }}>
                <input type="date" value={f.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
                <span className="muted">to</span>
                <input type="date" value={f.dateTo} onChange={(e) => set('dateTo', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={reset}>Reset</button>
          <span style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
