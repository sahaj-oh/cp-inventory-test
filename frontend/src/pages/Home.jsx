import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext.jsx';

// CP's 9 stages grouped into four summary cards. Each stat links to the
// Submissions board pre-filtered to that stage (?status=<key>). Keys match
// format.js STAGES exactly.
const GROUPS = [
  { title: 'Intake', accent: '#6366F1', stages: [['Unapproved', 'Unapproved'], ['Submitted', 'Submitted']] },
  { title: 'Visits', accent: '#D946EF', stages: [['Visit Requested', 'Visit Requested'], ['Visit Scheduled', 'Visit Scheduled'], ['Visit Completed', 'Visit Completed']] },
  { title: 'Deals', accent: '#FF6B2B', stages: [['Offer', 'Offer Given'], ['Closure', 'Closure']] },
  { title: 'Rejections', accent: '#DC2626', stages: [['Price Rejected', 'Price Rejected'], ['Rejected', 'Rejected']] },
];

export default function Home() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [counts, setCounts] = useState({});
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.adminListSubmissions({ limit: 1 })
      .then((d) => { if (alive) setCounts(d.counts || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    if (!isViewer) {
      api.ticketsPendingCount().then((r) => { if (alive) setPending(r?.count || 0); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [isViewer]);

  return (
    <div>
      <div className="page-head">
        <h2>Home</h2>
        <div className="ph-sub muted">
          {counts.Total != null ? `${counts.Total} total submissions` : 'Summary'}
        </div>
      </div>

      {!isViewer && (
        <Link
          to="/tickets"
          className="task-card"
          style={{
            display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none',
            borderLeft: '4px solid #2563eb', marginBottom: 18,
          }}
        >
          <span className="st-num" style={{ color: '#2563eb', minWidth: 56 }}>{pending}</span>
          <span className="muted">
            unresolved ticket{pending === 1 ? '' : 's'} need your action →
          </span>
        </Link>
      )}

      <div className="home-quad">
        {GROUPS.map((g) => (
          <div key={g.title} className="quad-card" style={{ borderLeft: `4px solid ${g.accent}` }}>
            <h3 style={{ marginBottom: 12 }}>{g.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.stages.length}, 1fr)`, gap: 12 }}>
              {g.stages.map(([key, label]) => (
                <Link
                  key={key}
                  to={`/submissions?status=${encodeURIComponent(key)}`}
                  className="stat-tile"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="st-num" style={{ color: g.accent }}>
                    {loading ? '—' : (counts[key] ?? 0)}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{label}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
