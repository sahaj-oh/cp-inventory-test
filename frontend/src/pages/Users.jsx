/**
 * Users — staff management. Admin-only.
 *
 * Data/behavior ported verbatim (in spirit) from CP's `screens/Admin/
 * AdminPanel.jsx` (a modal there; a full page here):
 *   - List staff users — admins live in channel_partners, RMs/managers/
 *     viewers live in rms; every row carries a `source` ('cp'|'rm') so
 *     PATCH/force-logout calls route to the right table.
 *   - Add user (name / 10-digit phone / email / role); role=viewer requires
 *     a city (viewers are scope-bounded to exactly one city).
 *   - Inline role <select> per row, guarded against moves that cross the
 *     admin (channel_partners) <-> rm/manager/viewer (rms) table boundary —
 *     the backend rejects those outright (see backend/routes/admin.py
 *     patch_staff_user); we just explain why before the request 400s.
 *     Flipping an existing row to viewer prompts for a city if it doesn't
 *     already have one.
 *   - OH Properties access toggle, Active/Inactive + Deactivate/Re-activate,
 *     Force-logout (single) and Force-logout-all (confirm banner, same as
 *     CP's inline two-step confirm — no ConfirmDialog needed for this one
 *     since CP's own inline banner already reads clearly on a full page).
 *
 * Re-skinned into Direct's shell: an "Add user" `.card-block` with an
 * `.adduser-row` (CP's grid row) instead of CP's inline-styled overlay grid,
 * and an "All users" `.card-block` with `.data-table` (sortable headers)
 * instead of CP's plain inline-styled <table>. Same request shapes, same
 * guard/prompt logic, same columns split out per the Direct spec (Email /
 * Name / Phone / Role / OH-Properties / Status / Force-logout / Actions).
 */
import { useEffect, useMemo, useState } from 'react';

import { ApiError, api } from '../api';
import { validatePhone } from '../format';
import { IconLock } from '../components/icons.jsx';

const ROLE_OPTIONS = [
  { value: 'rm',      label: 'RM' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer',  label: 'Viewer (city read-only)' },
  { value: 'admin',   label: 'Admin' },
];

// Cities a viewer can be assigned to. ids match cities.id in the prod App
// DB seed (Noida=1, Gurgaon=2, Ghaziabad=3) — kept in sync with CP.
const CITY_OPTIONS = [
  { value: 1, label: 'Noida' },
  { value: 2, label: 'Gurgaon' },
  { value: 3, label: 'Ghaziabad' },
];

function SortableTh({ field, label, sort, onSort }) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th
      className={`data-th-sortable${active ? ' data-th-active' : ''}`}
      onClick={() => onSort(field)}
      title={`Sort by ${label}`}
    >
      {label} <span>{arrow}</span>
    </th>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={`sk-${i}`}>
      <td><span className="inv-skel" style={{ width: '80%' }} /></td>
      <td><span className="inv-skel" style={{ width: '70%' }} /></td>
      <td><span className="inv-skel" style={{ width: '60%' }} /></td>
      <td><span className="inv-skel" style={{ width: 90 }} /></td>
      <td><span className="inv-skel" style={{ width: 60 }} /></td>
      <td><span className="inv-skel" style={{ width: 50 }} /></td>
      <td><span className="inv-skel" style={{ width: 60 }} /></td>
      <td><span className="inv-skel" style={{ width: 70 }} /></td>
    </tr>
  ));
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Add User form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('rm');
  const [newCityId, setNewCityId] = useState('');

  // Force logout all confirmation
  const [confirmForceAll, setConfirmForceAll] = useState(false);

  // Client-side sort of the currently-loaded list. No field = CP's default
  // grouping (active first, then role, then name — mirrors the backend's
  // own ORDER BY in list_staff_users).
  const [sort, setSort] = useState({ field: null, dir: 'asc' });

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminListStaffUsers();
      setUsers(data?.users || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load staff users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    setError('');
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    const phoneCheck = validatePhone(newPhone);
    if (!phoneCheck.ok) {
      setError(`Phone: ${phoneCheck.error}`);
      return;
    }
    if (newRole === 'viewer' && !newCityId) {
      setError('Pick a city for the viewer — their access is bounded to one city.');
      return;
    }
    setSaving(true);
    try {
      await api.adminAddStaffUser({
        name: newName.trim(),
        phone: phoneCheck.cleaned,
        role: newRole,
        email: newEmail.trim() || undefined,
        city_id: newRole === 'viewer' ? Number(newCityId) : undefined,
      });
      setNewName(''); setNewPhone(''); setNewEmail('');
      setNewRole('rm'); setNewCityId('');
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (u, nextRole) => {
    if (u.role === nextRole) return;
    // Prevent moves that cross the rms <-> channel_partners boundary; backend
    // rejects them but warn here for clarity. Viewer is in rms, so flipping
    // an existing rm/manager/viewer between those three roles is fine.
    const isAdmin = nextRole === 'admin';
    const isAdminCurrent = u.role === 'admin';
    if (isAdmin !== isAdminCurrent) {
      alert(
        "To move someone between Admin and RM/Manager/Viewer, deactivate them " +
        "first and re-add. (Admins live in channel_partners; RMs/managers/viewers " +
        "live in rms.)"
      );
      return;
    }
    // Flipping to viewer needs a city. If the row doesn't already have one,
    // prompt the admin to pick one. The backend re-validates this — the prompt
    // is just a friendlier path than letting the PATCH 400.
    const payload = { role: nextRole };
    if (nextRole === 'viewer' && !u.city_id) {
      const cityLabels = CITY_OPTIONS.map((c, i) => `${i + 1}=${c.label}`).join(', ');
      const pick = prompt(
        `Viewers are bounded to one city. Pick a city for ${u.name || u.phone}:\n${cityLabels}\n\n` +
        `Enter the number (1, 2, or 3):`
      );
      const idx = parseInt(pick, 10);
      if (!idx || idx < 1 || idx > CITY_OPTIONS.length) return;
      payload.city_id = CITY_OPTIONS[idx - 1].value;
    }
    try {
      await api.adminPatchStaffUser(u.source, u.id, payload);
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const handleOhToggle = async (u, next) => {
    try {
      await api.adminPatchStaffUser(u.source, u.id, { can_see_oh_properties: next });
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name || u.phone}? They won't be able to log in.`)) return;
    try {
      await api.adminPatchStaffUser(u.source, u.id, { is_active: false });
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const handleReactivate = async (u) => {
    try {
      await api.adminPatchStaffUser(u.source, u.id, { is_active: true });
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const handleForceLogout = async (u) => {
    if (!confirm(`Force-logout ${u.name || u.phone}? Their next request will redirect them to login.`)) return;
    try {
      await api.adminForceLogoutUser(u.source, u.id);
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Force logout failed');
    }
  };

  const handleForceLogoutAll = async () => {
    try {
      const res = await api.adminForceLogoutAll();
      alert(`Force-logout sent to ${res.logged_out_count} active staff. Including you — you'll be redirected to login on the next click.`);
      setConfirmForceAll(false);
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Force-logout-all failed');
    }
  };

  function onSort(field) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));
  }

  // Default grouping: active first, then role, then name (matches the
  // backend's own ORDER BY). Clicking a column header overrides this with a
  // full sort on that field instead.
  const sortedUsers = useMemo(() => {
    const rows = [...users];
    if (!sort.field) {
      rows.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        const r = (a.role || '').localeCompare(b.role || '');
        if (r !== 0) return r;
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      });
      return rows;
    }
    const { field, dir } = sort;
    const key = (r) => {
      switch (field) {
        case 'email':  return (r.email || '').toLowerCase();
        case 'name':   return (r.name || '').toLowerCase();
        case 'phone':  return (r.phone || '').toLowerCase();
        case 'role':   return (r.role || '').toLowerCase();
        case 'status': return r.is_active ? 1 : 0;
        default: return '';
      }
    };
    rows.sort((a, b) => {
      const av = key(a);
      const bv = key(b);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [users, sort]);

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div>
      <div className="page-head">
        <h2>Users</h2>
        <div className="ph-sub muted">
          {loading ? 'Loading…' : `${activeCount} active${inactiveCount > 0 ? `, ${inactiveCount} inactive` : ''}`}
        </div>
      </div>

      {error && <div className="modal-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Add user */}
      <div className="card-block">
        <h3>Add user</h3>
        <div className="adduser-row">
          <div className="au-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="email (optional)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="au-field">
            <label>Name</label>
            <input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="au-field">
            <label>Phone</label>
            <input
              placeholder="10-digit phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="au-role">
            <label>Role</label>
            <select className="role-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="au-actions">
            <button type="button" className="btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </div>
        </div>

        {/* Viewer-specific: city picker. Only shown when role=viewer because
            viewers are city-bounded (their entire scope is one city). */}
        {newRole === 'viewer' && (
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Viewer city</label>
            <div className="city-pills">
              {CITY_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={String(newCityId) === String(c.value) ? 'pill pill-on' : 'pill'}
                  onClick={() => setNewCityId(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="page-hint" style={{ marginTop: 8 }}>
              Viewer will see all listings of this city, read-only.
            </div>
          </div>
        )}
      </div>

      {/* All users */}
      <div className="card-block">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ marginBottom: 0 }}>All users</h3>
          {confirmForceAll ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--red-fg)', fontWeight: 600 }}>
                Are you sure? This logs out <em>everyone</em>, including you.
              </span>
              <button type="button" className="btn-danger" onClick={handleForceLogoutAll}>Yes, logout all</button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmForceAll(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirmForceAll(true)}>
              <IconLock size={13} /> Force logout all
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh field="email" label="Email" sort={sort} onSort={onSort} />
                <SortableTh field="name" label="Name" sort={sort} onSort={onSort} />
                <SortableTh field="phone" label="Phone" sort={sort} onSort={onSort} />
                <SortableTh field="role" label="Role" sort={sort} onSort={onSort} />
                <th>OH-Properties</th>
                <SortableTh field="status" label="Status" sort={sort} onSort={onSort} />
                <th>Force-logout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                    No staff users yet. Add one above.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => (
                  <tr key={`${u.source}-${u.id}`} className={u.is_active ? '' : 'usr-inactive'}>
                    <td>{u.email || <span className="muted">—</span>}</td>
                    <td style={{ fontWeight: 600 }}>{u.name || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <select
                        className="role-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        disabled={!u.is_active}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {u.role === 'viewer' && u.city && (
                        <div className="usr-scope muted" style={{ fontSize: 11, marginTop: 3 }}>📍 {u.city}</div>
                      )}
                    </td>
                    <td>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={u.can_see_oh_properties}
                          onChange={(e) => handleOhToggle(u, e.target.checked)}
                          disabled={!u.is_active}
                        />
                        {u.can_see_oh_properties ? 'Allowed' : 'Blocked'}
                      </label>
                    </td>
                    <td>
                      <span className={u.is_active ? 'pill pill-on' : 'pill'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => handleForceLogout(u)}
                        disabled={!u.is_active}
                      >
                        Logout
                      </button>
                    </td>
                    <td>
                      {u.is_active ? (
                        <button type="button" className="btn-edit" onClick={() => handleDeactivate(u)}>Deactivate</button>
                      ) : (
                        <button type="button" className="btn-primary" onClick={() => handleReactivate(u)}>Re-activate</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="page-hint">
          Roles: <strong>RM</strong> = own CPs · <strong>Manager</strong> = own + team CPs ·{' '}
          <strong>Viewer</strong> = read-only, one city · <strong>Admin</strong> = full access.
        </div>
      </div>
    </div>
  );
}
