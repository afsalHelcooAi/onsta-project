import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import {
  TrendingUp, Users, MousePointer, Tag, Calendar, AlertTriangle,
  ArrowRight, ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink,
  Sparkles, BarChart3, Eye, Stethoscope
} from 'lucide-react';
import AIDocumentScanModal from '../common/AIDocumentScanModal';

export default function Overview({ onOpenPreview }) {
  const navigate = useNavigate();
  const { clinicData, documents, verificationHistory, analytics, reuploadDocument } = useClinic();
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [timeRange, setTimeRange] = useState('30d'); // '7d' | '30d' | '90d'

  // Multiplier for timeframe
  const multiplier = timeRange === '7d' ? 0.3 : timeRange === '90d' ? 2.8 : 1.0;

  const kpis = [
    { label: "Profile views", value: Math.round(analytics.kpis.profileViews.value * multiplier), change: "+18.4%" },
    { label: "Listing clicks", value: Math.round(analytics.kpis.listingClicks.value * multiplier), change: "+12.1%" },
    { label: "Offer clicks", value: Math.round(analytics.kpis.offerClicks.value * multiplier), change: "+24.8%" },
    { label: "Booking requests", value: Math.round(analytics.kpis.bookingRequests.value * multiplier), change: "+15.3%" }
  ];

  const handleRenewSuccess = () => {
    reuploadDocument("facilityLicence", {
      expiryDate: "2027-12-25",
      documentName: "dha-facility-licence-renewed-2027.pdf"
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header & Date Range Filter (Screenshot 3 + Integrated Analytics) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 tracking-tight">
            Welcome, {clinicData.displayName || clinicData.legalName}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Executive Partner Overview & Performance Analytics • Automated ONSTA Rule Engine Active
          </p>
        </div>

        {/* Top Controls: Status Indicators & Timeframe Filter */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Timeframe Toggles */}
          <div className="flex items-center bg-white border border-[#e7e1d7] p-1 rounded-xl shadow-sm mr-1">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  timeRange === t.id
                    ? 'bg-[#0d281e] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
            Application approved
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#fde293] flex items-center gap-1.5 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            Licence: 38d left
          </span>
        </div>
      </div>

      {/* KPI Cards Row (Screenshot 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 mt-2">
              {kpi.value.toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{kpi.change} vs prev {timeRange}</span>
            </p>
          </div>
        ))}
      </div>

      {/* SECTION 1: Integrated Visual Analytics Curve (Profile Views & Patient Inquiries) */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-800" />
              <h3 className="text-base font-serif font-bold text-gray-900">
                Patient Traffic & Listing Discovery Curve
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Daily customer discovery and direct clicks on {clinicData.displayName}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d281e]" />
              <span className="text-gray-600 font-medium">Profile Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-600 font-medium">Treatment Clicks</span>
            </div>
          </div>
        </div>

        {/* SVG Responsive Bar/Area Chart */}
        <div className="pt-2">
          <div className="h-52 flex items-end justify-between gap-2 sm:gap-6 border-b border-gray-200 pb-2 px-2">
            {analytics.trafficTrend.map((point, index) => {
              const viewHeight = Math.min(100, (point.views / 70) * 100);
              const clickHeight = Math.min(100, (point.clicks / 70) * 100);

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-40">
                    {/* Views Bar */}
                    <div
                      style={{ height: `${viewHeight}%` }}
                      className="w-1/2 max-w-[22px] bg-[#0d281e] rounded-t-md transition-all group-hover:bg-[#1a4a37] relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none transition-opacity z-10 whitespace-nowrap">
                        {Math.round(point.views * multiplier)} views
                      </span>
                    </div>

                    {/* Clicks Bar */}
                    <div
                      style={{ height: `${clickHeight}%` }}
                      className="w-1/2 max-w-[22px] bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-400 relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-800 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none transition-opacity z-10 whitespace-nowrap">
                        {Math.round(point.clicks * multiplier)} clicks
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">{point.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Top Performing Services & Promotional Offer Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Services */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-serif font-bold text-gray-900">
                Top Performing Services
              </h3>
              <span className="text-[11px] text-gray-400">Catalog rank</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Ranked by patient catalog discovery</p>

            <div className="divide-y divide-gray-100">
              {analytics.topServices.map((srv, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-gray-900">{srv.name}</p>
                    <p className="text-[11px] text-gray-400">{srv.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-gray-900">
                      {Math.round(srv.views * multiplier)} views
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      {srv.conversion} conversion
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/services')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage all services & prices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Most Clicked Offers */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-serif font-bold text-gray-900">
                Promotional Offer Inquiries
              </h3>
              <span className="text-[11px] text-gray-400">Claim rate</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Ranked by direct customer booking claims</p>

            <div className="divide-y divide-gray-100">
              {analytics.topOffers.map((off, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-gray-900">{off.title}</p>
                    <p className="text-[11px] text-gray-400">{off.rate} claim rate</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-[#0d281e]">
                      {Math.round(off.clicks * multiplier)} clicks
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {Math.round(off.claims * multiplier)} claims
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate('/dashboard/offers')}
              className="text-xs text-[#0d281e] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage active offers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Verification Activity & Needs Attention (Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting on ONSTA / Verification Activity */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-serif font-bold text-gray-900">
                Verification Activity
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Real-Time Rules
              </span>
            </div>

            <div className="space-y-3.5 mt-4">
              {verificationHistory.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.type} • <span className="text-gray-600">{item.item}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {item.date} at {item.time} • {item.details}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                    item.status === 'PASS'
                      ? 'bg-[#e6f4ea] text-[#137333]'
                      : item.status === 'FAIL'
                      ? 'bg-[#fce8e6] text-[#c5221f]'
                      : 'bg-[#fef7e0] text-[#b06000]'
                  }`}>
                    {item.status === 'PASS' ? 'Verified' : item.status === 'FAIL' ? 'Verification failed' : 'Review needed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => navigate('/dashboard/requests')}
              className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors"
            >
              Open verification history
            </button>
          </div>
        </div>

        {/* Needs Attention (Screenshot 3) */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Needs attention
              </h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                1 Warning
              </span>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-gray-900">
                  Facility licence renewal due in 38 days
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Upload the renewed licence from DHA to keep your listing live and prevent automatic profile pause.
                </p>
                <button
                  onClick={() => setShowRenewModal(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Upload renewed licence
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="font-semibold text-gray-900">
                  Message from ONSTA compliance team
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 italic">
                  "Your active MOHAP digital permit has been verified for year 2026-2027. Routine rule evaluation is now fully autonomous."
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>DHA Regulation ST-21</span>
            <span>Compliance Score: 98%</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Bottom Card: How Customers See You Now (Screenshot 3) */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-48 h-32 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
            <img
              src={clinicData.coverImage}
              alt="Cover Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-serif font-bold text-gray-900">
                How customers see you now
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                Live version
              </span>
              <span className="text-xs text-gray-500">
                [{clinicData.category}] • [{clinicData.cityArea}], [{clinicData.emirate}]
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
              Customers see the latest verified version of your clinic profile. Unverified edits or draft items stay hidden until they pass all platform checks.
            </p>

            <div className="pt-2">
              <button
                onClick={onOpenPreview}
                className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Live Customer Preview</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Document Renewal Scan Modal */}
      <AIDocumentScanModal
        isOpen={showRenewModal}
        documentType="Renewed DHA Facility Licence"
        onClose={() => setShowRenewModal(false)}
        onComplete={handleRenewSuccess}
      />
    </div>
  );
}
