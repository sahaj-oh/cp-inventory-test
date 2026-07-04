import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import BusyOverlay from './BusyOverlay.jsx';
import {
  IconHome, IconBoard, IconEye, IconBuilding, IconTicket, IconLogs, IconUsers, IconProfile,
  IconSun, IconMoon, IconMenu, IconLogout, IconChevron,
} from './icons.jsx';

const TITLES = {
  '': 'Home', submissions: 'Submissions', impersonator: 'Impersonator',
  'oh-properties': 'OH Properties', tickets: 'Tickets', logs: 'Activity Logs',
  users: 'Users', profile: 'My Profile',
};

function initials(name, phone) {
  const s = (name || phone || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('oh_sidebar_collapsed') === '1');
  const [ticketDot, setTicketDot] = useState(0);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const canTickets = role === 'admin' || role === 'manager' || role === 'rm';

  // Poll "needs my action" ticket count for the nav dot (skip for roles with no
  // ticket access). 15s while visible; on focus; on local ticket mutations.
  useEffect(() => {
    if (!canTickets) return undefined;
    let alive = true;
    const refresh = () => api.ticketsPendingCount()
      .then((r) => { if (alive) setTicketDot(r?.count || 0); })
      .catch(() => {});
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('tickets:changed', refresh);
    return () => {
      alive = false; clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('tickets:changed', refresh);
    };
  }, [canTickets]);

  const seg = loc.pathname.split('/')[1] || '';
  const title = TITLES[seg] || 'CP Inventory';

  function toggleCollapse() {
    setCollapsed((c) => { const n = !c; localStorage.setItem('oh_sidebar_collapsed', n ? '1' : '0'); return n; });
  }

  const navItem = ({ to, label, Icon, end, dot }) => {
    const showDot = dot && ticketDot > 0;
    return (
      <NavLink key={to} to={to} end={end}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined}>
        <span className="nav-ic"><Icon />{showDot && <span className="nav-dot" />}</span>
        <span className="nav-label">{label}</span>
        {showDot && <span className="nav-count">{ticketDot}</span>}
      </NavLink>
    );
  };

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-text">
            <div className="brand-name">Openhouse</div>
            <div className="brand-sub">CP Inventory</div>
          </div>
        </div>
        <button className="sidebar-collapse-btn" onClick={toggleCollapse} aria-label="Toggle sidebar">
          <span className="scb-chev"><IconChevron size={16} /></span>
          <span className="scb-label">Collapse</span>
        </button>

        {navItem({ to: '/', label: 'Home', Icon: IconHome, end: true })}
        {navItem({ to: '/submissions', label: 'Submissions', Icon: IconBoard })}
        {navItem({ to: '/oh-properties', label: 'OH Properties', Icon: IconBuilding })}
        {canTickets && navItem({ to: '/tickets', label: 'Tickets', Icon: IconTicket, dot: true })}

        {isAdmin && (
          <>
            <div className="sidebar-section-label">Admin</div>
            {navItem({ to: '/impersonator', label: 'Impersonator', Icon: IconEye })}
            {navItem({ to: '/users', label: 'Users', Icon: IconUsers })}
            {navItem({ to: '/logs', label: 'Logs', Icon: IconLogs })}
          </>
        )}

        <div className="nav-spacer" />
        <div className="sidebar-foot">
          <button type="button" className="sidebar-user" onClick={() => { nav('/profile'); setMobileOpen(false); }} title="My profile">
            <span className="avatar">{initials(user?.name, user?.phone)}</span>
            <div className="su-text">
              <div className="su-name">{user?.name || user?.phone}</div>
              <div className="su-role">{role}</div>
            </div>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="modal-backdrop" style={{ zIndex: 400 }} onClick={() => setMobileOpen(false)} />}
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn topbar-menu" onClick={() => setMobileOpen(true)} aria-label="Menu"><IconMenu /></button>
          <h1>{title}</h1>
          <div className="topbar-spacer" />
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button className="icon-btn" onClick={logout} aria-label="Logout" title="Logout"><IconLogout /></button>
        </header>
        <main className="main"><Outlet /></main>
      </div>
      <BusyOverlay />
    </div>
  );
}
