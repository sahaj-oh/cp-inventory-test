import { useState } from 'react';
import { api } from '../api';
import CpSelector from '../components/CpSelector.jsx';

export default function Impersonator() {
  const [cp, setCp] = useState(null);
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  async function open(picked) {
    setCp(picked); setError(null);
    try {
      const { token } = await api.adminImpersonateCp(picked.id);
      // Same-origin iframe; auth.js bootstrapImpersonation() captures #it=,
      // isolates the CP token to THIS frame, and the app inside renders CpApp.
      setSrc(`/?impersonate=1#it=${encodeURIComponent(token)}`);
    } catch (e) {
      setError(e?.data?.error || 'Could not start impersonation');
    }
  }

  function exit() { setCp(null); setSrc(null); }

  if (src) {
    return (
      <div className="imp-frame-wrap">
        <div className="imp-frame-bar">
          👁 Viewing as <b>{cp?.name}</b> · {cp?.cp_code} · {cp?.phone}
          <button className="btn-ghost" onClick={exit}>Exit</button>
        </div>
        <iframe className="imp-frame" title="Viewing as CP" src={src} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h2>Impersonator</h2>
        <div className="ph-sub muted">Search a channel partner and view their app as they see it.</div>
      </div>
      {error && <div className="modal-error">{error}</div>}
      <div className="card-block" style={{ maxWidth: 640, marginTop: 16 }}>
        <CpSelector city="" onSelect={open} />
      </div>
    </div>
  );
}
