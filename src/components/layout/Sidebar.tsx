import { LayoutDashboard, LayoutGrid, Clock, Settings, Layers } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/boards', label: 'My Boards', icon: LayoutGrid },
  { to: '/templates', label: 'Templates', icon: Layers },
  { to: '/recent', label: 'Recently Played', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          🏆
        </div>
        <div>
          <strong className="sidebar-title">Jeff Hardy</strong>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-local card">
        <p className="sidebar-local-title">No account required</p>
        <p className="sidebar-local-text">
          Boards are saved locally in your browser. Export a backup to move boards between devices.
        </p>
      </div>
    </aside>
  );
}
