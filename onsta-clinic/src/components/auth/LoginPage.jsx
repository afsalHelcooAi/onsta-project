import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import {
  ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Building2,
  CheckCircle2, AlertTriangle, FileText, Stethoscope
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useClinic();

  const [email, setEmail] = useState('info@alnoorclinic.ae');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedDemoRole, setSelectedDemoRole] = useState('new_clinic'); // 'new_clinic' | 'approved_clinic'

  const handleSignIn = (e) => {
    e.preventDefault();
    const result = login(email, selectedDemoRole);
    if (result.status === 'approved') {
      navigate('/dashboard/overview');
    } else {
      navigate('/register');
    }
  };

  const handleQuickLoginNew = () => {
    setSelectedDemoRole('new_clinic');
    setEmail('onboarding@newclinic.ae');
    const result = login('onboarding@newclinic.ae', 'new_clinic');
    navigate('/register');
  };

  const handleQuickLoginApproved = () => {
    setSelectedDemoRole('approved_clinic');
    setEmail('info@alnoorclinic.ae');
    const result = login('info@alnoorclinic.ae', 'approved_clinic');
    navigate('/dashboard/overview');
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#0d281e] selection:text-white">
      {/* Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl border border-[#e7e1d7] overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Brand Panel (5 cols) */}
          <div className="md:col-span-5 bg-[#0d281e] text-white p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#1a4a37]">
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-2.5">
                <span className="bg-[#1b4334] text-white font-bold px-2.5 py-1 rounded-md text-xs tracking-wider border border-white/10 uppercase">
                  ONSTA
                </span>
                <span className="font-semibold text-sm tracking-wide text-gray-200">
                  Clinic Partner
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
                  Healthcare Partner Portal
                </h2>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Join the premier health and beauty platform connecting Dubai patients with verified medical and aesthetic practitioners.
                </p>
              </div>

              {/* Feature Points */}
              <div className="mt-8 space-y-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">
                    <strong>Autonomous Rule Engine:</strong> Instant verification for services and offers.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">
                    <strong>AI Document Extraction:</strong> Automated reading for trade and DHA licences.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Stethoscope className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">
                    <strong>Strict Compliance Gate:</strong> Dashboard unlocks only after ONSTA approval.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Regulatory Note */}
            <div className="pt-8 mt-8 border-t border-white/10 text-[11px] text-emerald-300/60">
              Verified in accordance with UAE Health Advertising Regulations & DHA Standard ST-21.
            </div>
          </div>

          {/* Right Form Panel (7 cols) */}
          <div className="md:col-span-7 p-8 sm:p-10 bg-white flex flex-col justify-between">
            <div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
                  Sign In to Partner Portal
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Select your presentation role or sign in with your clinic credentials.
                </p>
              </div>

              {/* Presentation Demo Quick-Select Cards */}
              <div className="mt-6 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Quick Presentation Access Modes
                </span>

                {/* Mode 1: New Clinic (Draft/Onboarding Gate) */}
                <div
                  onClick={handleQuickLoginNew}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    selectedDemoRole === 'new_clinic'
                      ? 'border-[#0d281e] bg-[#fbf9f5] ring-2 ring-[#0d281e]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-900">
                          1. New Clinic (Registration Flow)
                        </strong>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#FEF7E0] text-[#B06000]">
                          Status: Draft
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Demonstrates the <strong>strict gate</strong>: lands directly in the 5-step registration module. Dashboard is locked until approved.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>

                {/* Mode 2: Approved Clinic (Full Dashboard Access) */}
                <div
                  onClick={handleQuickLoginApproved}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    selectedDemoRole === 'approved_clinic'
                      ? 'border-[#0d281e] bg-[#fbf9f5] ring-2 ring-[#0d281e]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 text-[#137333] flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-900">
                          2. Approved Partner (Al Noor Clinic)
                        </strong>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333]">
                          Status: Approved
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Demonstrates full post-approval features: Services & prices CRUD, multiple active offers, compliance, and analytics.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </div>

              {/* Standard Login Form */}
              <form onSubmit={handleSignIn} className="mt-6 space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Clinic email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Security password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Clinic Partner Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 text-center text-[11px] text-gray-400">
              Demo Environment • LocalStorage Persistence Enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
