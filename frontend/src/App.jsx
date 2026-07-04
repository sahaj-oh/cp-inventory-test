import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Submissions from './pages/Submissions.jsx';
import CpApp from './pages/CpApp.jsx';

const Impersonator = lazy(() => import('./pages/Impersonator.jsx'));
const OhProperties = lazy(() => import('./pages/OhProperties.jsx'));
const Logs = lazy(() => import('./pages/Logs.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Tickets = lazy(() => import('./pages/Tickets.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

const STAFF = ['admin', 'manager', 'rm', 'viewer'];

// roles=undefined → any authenticated staff; roles=[] → admin only;
// roles=[...] → those roles (admin always passes).
function RequireRole({ user, roles, children }) {
  if (roles && !roles.includes(user.role) && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <div className="loading">Loading…</div>;
  if (!user) return <Login />;
  if (!STAFF.includes(user.role)) return <CpApp />;   // role === 'cp'

  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/oh-properties" element={<OhProperties />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<RequireRole user={user} roles={['manager', 'rm']}><Tickets /></RequireRole>} />
          <Route path="/impersonator" element={<RequireRole user={user} roles={[]}><Impersonator /></RequireRole>} />
          <Route path="/users" element={<RequireRole user={user} roles={[]}><Users /></RequireRole>} />
          <Route path="/logs" element={<RequireRole user={user} roles={[]}><Logs /></RequireRole>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
