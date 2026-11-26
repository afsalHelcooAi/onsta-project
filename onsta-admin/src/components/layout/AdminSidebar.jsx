import React from 'react';
import FaIcon from '../common/FaIcon';

export default function AdminSidebar({ activeTab, setActiveTab, pendingCount = 0, onSignOut }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: 'fa-solid fa-table-columns' },
    { id: 'master-catalog', label: 'Master Treatments & AI', icon: 'fa-solid fa-wand-magic-sparkles' },
    { id: 'review-queue', label: 'Clinic Verifications', icon: 'fa-solid fa-shield-halved', badge: pendingCount },
    { id: 'all-clinics', label: 'Registered Clinics', icon: 'fa-solid fa-hospital' },
    { id: 'compliance-audit', label: 'Compliance & Permits', icon: 'fa-solid fa-file-contract' },
    { id: 'all-users', label: 'All Users', icon: 'fa-solid fa-users' },
    { id: 'audit-logs', label: 'Audit Logs', icon: 'fa-solid fa-scroll' },
  ];

  return (
    <aside className="w-64 bg-[#1A1320] text-white flex flex-col justify-between h-screen border-r border-[#2E2238] shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#2E2238]">
          <div className="flex items-center gap-3">
            <span className="bg-[#6B3B66] text-white alata-regular px-2.5 py-1 rounded-lg text-xs tracking-widest border border-white/15 uppercase shadow-sm">
              ONSTA
            </span>
            <div>
              <h1 className="alata-regular text-sm tracking-wide text-[#EFE8F6]">Platform Admin</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#C7B0D8]">Central Operations</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3.5 space-y-1.5 mt-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[#9F8FB0] uppercase">
            Operations & Review
          </div>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-[#1E1B2E] alata-regular shadow-md'
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
                  <span className={isActive ? 'alata-regular' : ''}>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[11px] alata-regular rounded-full ${
                    isActive
                      ? 'bg-[#6B3B66] text-white'
                      : 'bg-[#F0E6F6] text-[#6B3B66]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Prominent Log Out Button */}
      <div className="p-4 border-t border-[#2E2238]">
        <button
          onClick={onSignOut}
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
