import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to:'/dashboard', icon:'◈', label:'Дашборд'   },
  { to:'/cash',      icon:'$', label:'Наличные'  },
  { to:'/bonds',     icon:'◉', label:'Облигации' },
  { to:'/settings',  icon:'⚙', label:'Настройки' },
];

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map(({ to, icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
          <span className="tab-icon">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
