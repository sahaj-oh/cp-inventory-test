/**
 * My Profile — identity card only (Direct's `pages/MyProfile.jsx`, minus the
 * coverage map and team roster — no CP geo/team endpoint yet, spec §9.8).
 *
 * Source of truth is `useAuth().user` (hydrated from GET /api/me on app
 * mount) so this page needs no data fetch of its own. Shape varies by role
 * (see backend/routes/auth_routes.py `_user_response` / `_rm_user_response`):
 * every role has { role, name, phone, city }; RM/manager/viewer additionally
 * carry `isManager`/`isViewer`/`managerId` (no manager *name* is returned
 * today, so "My Manager" only renders once/if the backend starts sending
 * one). `email` isn't populated for any role yet, but plenty of CP staff
 * have none anyway, so it's rendered defensively.
 */
import { useAuth } from '../contexts/AuthContext.jsx';
import Loading from '../components/Loading.jsx';

function initials(name) {
  const s = (name || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

// Field name to try for "my manager"'s display name, in order of likelihood —
// none of these exist in the current /api/me payload (only a numeric
// `managerId`), so this resolves to null today and the row is omitted.
function managerName(user) {
  if (typeof user.manager === 'string') return user.manager;
  if (user.manager && typeof user.manager === 'object') return user.manager.name || user.manager.email || null;
  return user.managerName || null;
}

export default function Profile() {
  const { user } = useAuth();
  if (!user) return <Loading />;

  const { name, phone, email, city, role } = user;
  const roleLower = (role || '').toLowerCase();
  const showCity = ['viewer', 'rm', 'manager'].includes(roleLower);
  const mgrName = managerName(user);
  const showManager = ['rm', 'manager'].includes(roleLower) && !!mgrName;

  return (
    <div>
      <div className="page-head">
        <h2>My Profile</h2>
      </div>

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
    </div>
  );
}
