import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Stethoscope, Tag, Image, Clock,
  ShieldCheck, ExternalLink, Sparkles, RotateCcw, LogOut,
  UserCheck, MessageSquare
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export default function Sidebar({ onOpenPreview }) {
  const { clinicData, resetToDemoDefaults, logout, enquiries } = useClinic();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const newEnquiriesCount = enquiries ? enquiries.filter(e => e.status === 'new').length : 0;

  const navItems = [
    { name: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
    { name: 'Clinic profile', path: '/dashboard/profile', icon: Building2 },
    { name: 'Doctors', path: '/dashboard/doctors', icon: UserCheck },
    { name: 'Services & prices', path: '/dashboard/services', icon: Stethoscope },
    { name: 'Offers', path: '/dashboard/offers', icon: Tag },
    { name: 'Enquiries', path: '/dashboard/enquiries', icon: MessageSquare, badge: newEnquiriesCount > 0 ? newEnquiriesCount.toString() : null },
    { name: 'Requests', path: '/dashboard/requests', icon: Clock, badge: '3' },
    { name: 'Compliance', path: '/dashboard/compliance', icon: ShieldCheck }
  ];

  return (
    <aside className="w-64 bg-[#0d281e] text-white flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 select-none border-r border-[#153f2f]">
      {/* Brand & Clinic Header */}
      <div>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#1b4334] text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wider border border-white/10 uppercase">
              ONSTA
            </span>
            <span className="font-semibold text-sm tracking-wide text-gray-200">
              Clinic Partner
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs text-emerald-300 font-medium">Logged in clinic</p>
            <h2 className="text-sm font-serif font-bold text-white truncate">
              {clinicData.displayName || clinicData.legalName}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-200">DHA Licensed • Approved</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/dashboard/overview' && location.pathname === '/');
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#0d281e] font-semibold shadow-md'
                    : 'text-[#9db3a8] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0d281e]' : 'text-[#9db3a8]'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-[#b06000] text-white' : 'bg-[#e59b22] text-[#0d281e]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {/* Registration Wizard Demo Link */}
        <NavLink
          to="/register"
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-emerald-200 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registration Wizard (5 Steps)</span>
          </div>
          <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
            Demo
          </span>
        </NavLink>

        {/* Customer Profile Preview Button */}
        <button
          onClick={onOpenPreview}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#194b37] hover:bg-[#205e45] transition-colors shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Customer App Preview</span>
        </button>

        <div className="flex items-center justify-between pt-1 px-1">
          {/* Reset Demo Button */}
          <button
            onClick={resetToDemoDefaults}
            title="Reset all mock data to presentation defaults"
            className="flex items-center gap-1 text-[11px] text-[#8ea79c] hover:text-rose-300 py-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleSignOut}
            title="Sign Out to Login Page"
            className="flex items-center gap-1 text-[11px] text-[#8ea79c] hover:text-white py-1 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
