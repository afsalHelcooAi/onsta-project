import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import FaIcon from '../common/FaIcon';

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
    { name: 'Overview', path: '/dashboard/overview', icon: 'fa-solid fa-table-columns' },
    { name: 'Clinic profile', path: '/dashboard/profile', icon: 'fa-solid fa-hospital' },
    { name: 'Doctors', path: '/dashboard/doctors', icon: 'fa-solid fa-user-doctor' },
    { name: 'Services & prices', path: '/dashboard/services', icon: 'fa-solid fa-stethoscope' },
    { name: 'Offers', path: '/dashboard/offers', icon: 'fa-solid fa-tags' },
    {
      name: 'Enquiries',
      path: '/dashboard/enquiries',
      icon: 'fa-solid fa-calendar-check',
      badge: newEnquiriesCount > 0 ? newEnquiriesCount.toString() : null
    },
    { name: 'Compliance', path: '/dashboard/compliance', icon: 'fa-solid fa-shield-halved' }
  ];

  return (
    <aside className="w-64 bg-[#1A1320] text-white flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 select-none border-r border-[#2E2238]">
      {/* Brand & Clinic Identity */}
      <div>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#6B3B66] text-white alata-regular px-2.5 py-1 rounded-lg text-xs tracking-widest border border-white/15 uppercase shadow-sm">
              ONSTA
            </span>
            <span className="alata-regular text-sm tracking-wide text-[#EFE8F6]">
              Clinic Partner
            </span>
          </div>

          <div className="mt-5 p-3.5 rounded-2xl bg-[#241B2E] border border-[#352842]">
            <p className="text-[10px] uppercase tracking-wider text-[#C7B0D8] font-semibold">
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
                    ? 'bg-[#FFFFFF] text-[#1E1B2E] alata-regular shadow-md'
                    : 'text-[#BDB1C9] hover:text-white hover:bg-[#2A1F35] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaIcon
                    icon={item.icon}
                    className={`w-4 text-center text-sm ${
                      isActive ? 'text-[#6B3B66]' : 'text-[#9F8FB0]'
                    }`}
                  />
                  <span className={isActive ? 'alata-regular' : ''}>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] alata-regular ${
                    isActive
                      ? 'bg-[#6B3B66] text-white'
                      : 'bg-[#F0E6F6] text-[#6B3B66]'
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
      <div className="p-4 border-t border-[#2E2238]">
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-xs alata-regular tracking-wide text-[#F4D9E6] bg-[#2D1F34] hover:bg-[#6B3B66] hover:text-white border border-[#422E4B] transition-all shadow-sm group"
        >
          <FaIcon
            icon="fa-solid fa-arrow-right-from-bracket"
            className="text-sm text-[#E09CB8] group-hover:text-white transition-colors"
          />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
