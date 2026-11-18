import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlayCircle, Sparkles, ChevronDown, CheckCircle2, AlertTriangle, RotateCcw, ShieldAlert, LogIn, UserCheck, MessageSquare } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';

export default function PresentationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetToDemoDefaults, setShowCustomerPreview, clinicData, logout, enquiries } = useClinic();

  const newEnquiriesCount = enquiries ? enquiries.filter(e => e.status === 'new').length : 0;

  const scenarios = [
    {
      id: 1,
      title: "Scenario 1: Registration",
      path: "/register"
    },
    {
      id: 2,
      title: "Scenario 2: Services",
      path: "/dashboard/services"
    },
    {
      id: 3,
      title: "Scenario 3: Offers",
      path: "/dashboard/offers"
    },
    {
      id: 4,
      title: "Scenario 4: Profile",
      path: "/dashboard/profile"
    },
    {
      id: 5,
      title: "Scenario 5: Compliance",
      path: "/dashboard/compliance"
    }
  ];

  const handleGoToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-[#0b2219] text-white border-b border-[#1b4334] px-4 py-2 sticky top-0 z-40 text-xs shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Presentation Mode Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>ONSTA Controller</span>
          </div>
          <span className="hidden lg:inline text-gray-400">
            Flow: {clinicData.status === 'approved' ? 'Approved Dashboard' : 'Onboarding Gate (Draft)'}
          </span>
        </div>

        {/* Center / Right: Scenario Shortcuts */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(s.path)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === s.path
                    ? "bg-emerald-600 text-white font-semibold shadow"
                    : "bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
                }`}
              >
                S{s.id}
              </button>
            ))}

            {/* Quick Doctors Shortcut */}
            <button
              onClick={() => navigate('/dashboard/doctors')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                location.pathname === '/dashboard/doctors'
                  ? "bg-emerald-600 text-white font-semibold shadow"
                  : "bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Doctors</span>
            </button>

            {/* Quick Enquiries Shortcut */}
            <button
              onClick={() => navigate('/dashboard/enquiries')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                location.pathname === '/dashboard/enquiries'
                  ? "bg-emerald-600 text-white font-semibold shadow"
                  : "bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Enquiries</span>
              {newEnquiriesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-gray-950 font-bold text-[9px]">
                  {newEnquiriesCount}
                </span>
              )}
            </button>
          </div>

          {/* Login Page Shortcut */}
          <button
            onClick={handleGoToLogin}
            className="px-2 py-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/40 font-medium flex items-center gap-1"
            title="Go to Login Page"
          >
            <LogIn className="w-3 h-3" />
            <span>Login</span>
          </button>

          {/* Customer Preview Quick Button */}
          <button
            onClick={() => setShowCustomerPreview(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-medium"
          >
            Preview
          </button>

          {/* Reset Demo */}
          <button
            onClick={resetToDemoDefaults}
            title="Reset All Demo Changes"
            className="p-1 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
