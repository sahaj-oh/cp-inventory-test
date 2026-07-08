import { useState } from 'react';
import { api } from '../api';
import CpSelector from '../components/CpSelector.jsx';

export default function Impersonator() {
  const [opened, setOpened] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function open(picked) {
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.adminImpersonateCp(picked.id);
      // Open the CP's app in a NEW TAB. A new tab is its own browsing context
      // with isolated sessionStorage, so the CP impersonation token stays in
      // that tab and never leaks into this admin session. (An iframe shares
      // sessionStorage with this page, which would hijack the staff session —
      // that was the earlier "impersonator doesn't work" bug.)
      // NOTE: don't pass the 'noopener' feature — with it, window.open ALWAYS
      // returns null, so the block-detection below would false-positive even
      // when the tab opened fine. Instead open normally and null the opener
      // ourselves for the same isolation.
      const w = window.open(`/?impersonate=1#it=${encodeURIComponent(token)}`, '_blank');
      if (w) {
        try { w.opener = null; } catch { /* cross-origin guard — harmless */ }
        setOpened(picked);
      } else {
        setError('Popup blocked — allow popups for this site, then pick the CP again.');
      }
    } catch (e) {
      setError(e?.data?.error || 'Could not start impersonation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="ph-sub muted" style={{ marginBottom: 14 }}>
        Search a channel partner and open their app — exactly as they see it — in a new tab.
        Every action there is audited to you.
      </div>

      {error && <div className="modal-error" style={{ marginBottom: 12 }}>{error}</div>}

      {opened && (
        <div className="card-block" style={{ marginBottom: 14, borderLeft: '3px solid var(--green)' }}>
          👁 Opened <b>{opened.name}</b> · {opened.cp_code} · {opened.phone} in a new tab.
          Pick another below to view a different CP.
        </div>
      )}

      <div className="card-block" style={{ maxWidth: 640 }}>
        <CpSelector city="" onSelect={open} />
        {busy && <div className="loading-inline">Starting<span className="loading-dots" aria-hidden="true" /></div>}
      </div>
    </div>
  );
}
