import React from 'react';
import {
  ShieldCheck,
  Building2,
  FileCheck,
  UserRound,
  Settings,
  Activity,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function AdminSidebar({ activeTab, setActiveTab, pendingCount = 0, onSignOut }) {
  const menuItems = [
    { id: 'review-queue', label: 'Clinic Verifications', icon: ShieldCheck, badge: pendingCount },
    { id: 'all-clinics', label: 'Registered Clinics', icon: Building2 },
    { id: 'compliance-audit', label: 'Compliance & Permits', icon: FileCheck },
    { id: 'all-users', label: 'All Users', icon: UserRound },
    { id: 'system-health', label: 'System Health & AI', icon: Activity },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0d281e] text-white flex flex-col justify-between border-r border-[#1a4a37] shadow-xl shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1a4a37]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-xl shadow-inner">
              Ω
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg tracking-tight text-cream-100">ONSTA</h1>
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/80">Admin Operations</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-emerald-300/50 uppercase">
            Operations & Review
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-cream-200/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400/70'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-400 text-gray-900 shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1a4a37]/60 text-xs text-cream-300/60 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-300/80">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Human review required</span>
        </div>
        <div className="text-[11px] text-emerald-200/50">
          Environment: <span className="text-emerald-300 font-semibold">Local Dev (Port 3001)</span>
        </div>
        <button onClick={onSignOut} className="mt-2 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-emerald-100 hover:bg-white/10">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
