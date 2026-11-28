import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';

export default function Sidebar() {
  const { clinicData, logout, enquiries } = useClinic();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const newEnquiriesCount = enquiries ? enquiries.filter(e => e.status === 'new').length : 0;

  const navItems = [
    { name: 'Overview', path: '/dashboard/overview', icon: 'overview' },
    { name: 'Clinic profile', path: '/dashboard/profile', icon: 'hospital' },
    { name: 'Doctors', path: '/dashboard/doctors', icon: 'doctor' },
    { name: 'Services & prices', path: '/dashboard/services', icon: 'stethoscope' },
    { name: 'Offers', path: '/dashboard/offers', icon: 'tag' },
    {
      name: 'Enquiries',
      path: '/dashboard/enquiries',
      icon: 'calendar-check',
      badge: newEnquiriesCount > 0 ? newEnquiriesCount.toString() : null
    },
    { name: 'Compliance', path: '/dashboard/compliance', icon: 'shield-check' }
  ];

  return (
    <aside className="w-64 bg-theme-sidebar-bg text-white flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 select-none border-r border-theme-sidebar-border">
      {/* Brand & Clinic Identity */}
      <div>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-white/15" />
            <div>
              <span className="alata-regular text-sm tracking-wide text-theme-sidebar-heading block leading-tight">
                Clinic Partner
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-theme-sidebar-kicker">
                onsta.ai
              </span>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-2xl bg-theme-sidebar-surface border border-theme-sidebar-border">
            <p className="text-[10px] uppercase tracking-wider text-theme-sidebar-kicker font-semibold">
              Active Medical Facility
            </p>
            <h2 className="text-sm alata-regular text-white truncate mt-0.5">
              {clinicData.displayName || clinicData.legalName}
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-200 font-medium">
                DHA Licensed • Approved
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="px-3.5 space-y-1.5 mt-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard/overview' && location.pathname === '/');

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-theme-card text-theme-ink alata-regular shadow-md'
                    : 'text-theme-sidebar-text hover:text-white hover:bg-theme-sidebar-hover font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AppIcon
                    name={item.icon}
                    weight={isActive ? 'duotone' : 'regular'}
                    className={`w-4 text-center text-base ${
                      isActive ? 'text-theme-primary' : 'text-theme-sidebar-muted'
                    }`}
                  />
                  <span className={isActive ? 'alata-regular' : ''}>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] alata-regular ${
                    isActive
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-primary-soft text-theme-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Clean Prominent Log Out Button */}
      <div className="p-4 border-t border-theme-sidebar-border">
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-xs alata-regular tracking-wide text-theme-sidebar-logout-text bg-theme-sidebar-logout-bg hover:bg-theme-primary hover:text-white border border-theme-sidebar-logout-border transition-all shadow-sm group"
        >
          <AppIcon
            name="sign-out"
            className="text-base text-theme-sidebar-logout-icon group-hover:text-white transition-colors"
          />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
