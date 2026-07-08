import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { clearSession } from '../auth';
import Dashboard from '../cp/Dashboard.jsx';
import AddUnit from '../cp/AddUnit/index.jsx';

export default function CpApp() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('dashboard');
  return (
    <div className="app-shell-cp">
      {user?.impersonated_by && (
        <div className="imp-banner">
          👁 Viewing as {user.name} · impersonated by {user.impersonated_by.name || user.impersonated_by.cp_code}
          <button className="btn-link" onClick={() => { clearSession(); window.location.assign('/'); }}>Exit</button>
        </div>
      )}
      {screen === 'addUnit'
        ? <AddUnit onDone={() => setScreen('dashboard')} />
        : <Dashboard onAdd={() => setScreen('addUnit')} />}
    </div>
  );
}
