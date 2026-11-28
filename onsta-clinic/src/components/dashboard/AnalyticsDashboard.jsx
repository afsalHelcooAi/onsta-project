import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import AppIcon from '../common/AppIcon';

export default function AnalyticsDashboard() {
  const { analytics } = useClinic();
  const [timeRange, setTimeRange] = useState('30d'); // 7d | 30d | 90d

  // Multipliers based on timeframe
  const multiplier = timeRange === '7d' ? 0.3 : timeRange === '90d' ? 2.8 : 1.0;

  const kpis = [
    { label: "Profile views", value: Math.round(analytics.kpis.profileViews.value * multiplier), change: "+18.4%" },
    { label: "Listing clicks", value: Math.round(analytics.kpis.listingClicks.value * multiplier), change: "+12.1%" },
    { label: "Offer clicks", value: Math.round(analytics.kpis.offerClicks.value * multiplier), change: "+24.8%" },
    { label: "Booking requests", value: Math.round(analytics.kpis.bookingRequests.value * multiplier), change: "+15.3%" }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Analytics & Performance
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track patient discovery, listing impressions, and treatment booking inquiries on the ONSTA network.
          </p>
        </div>

        {/* Timeframe Toggles */}
        <div className="flex items-center bg-white border border-[#e7e1d7] p-1 rounded-xl shadow-sm self-start">
          {[
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timeRange === t.id
                  ? 'bg-[#0d281e] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">{k.label}</span>
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 mt-2">
              {k.value.toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <AppIcon name="trend-up" className="w-3 h-3" />
              <span>{k.change} period trend</span>
            </p>
          </div>
        ))}
      </div>

      {/* Traffic Trend Chart (SVG) */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-gray-900">
              Profile Views & Customer Interest Curve
            </h3>
            <p className="text-xs text-gray-400">Daily patient sessions browsing Al Noor Clinic</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d281e]" />
              <span className="text-gray-600">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Clicks</span>
            </div>
          </div>
        </div>

        {/* Responsive SVG Bar / Area Chart */}
        <div className="pt-4">
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 border-b border-gray-200 pb-2 px-2">
            {analytics.trafficTrend.map((point, index) => {
              const viewHeight = Math.min(100, (point.views / 70) * 100);
              const clickHeight = Math.min(100, (point.clicks / 70) * 100);

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Views Bar */}
                    <div
                      style={{ height: `${viewHeight}%` }}
                      className="w-1/2 max-w-[24px] bg-[#0d281e] rounded-t-md transition-all group-hover:bg-[#1a4a37] relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none transition-opacity">
                        {Math.round(point.views * multiplier)}
                      </span>
                    </div>

                    {/* Clicks Bar */}
                    <div
                      style={{ height: `${clickHeight}%` }}
                      className="w-1/2 max-w-[24px] bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-400 relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-800 text-white text-[10px] px-1.5 py-0.5 rounded font-mono pointer-events-none transition-opacity">
                        {Math.round(point.clicks * multiplier)}
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

      {/* Two Column Tables: Most Viewed Services & Most Clicked Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Viewed Services */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h3 className="text-base font-serif font-bold text-gray-900 mb-1">
            Top Performing Services
          </h3>
          <p className="text-xs text-gray-400 mb-4">Ranked by patient catalog discovery</p>

          <div className="divide-y divide-gray-100">
            {analytics.topServices.map((srv, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-3 text-xs">
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

        {/* Most Clicked Offers */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm">
          <h3 className="text-base font-serif font-bold text-gray-900 mb-1">
            Promotional Offer Inquiries
          </h3>
          <p className="text-xs text-gray-400 mb-4">Ranked by direct customer booking claims</p>

          <div className="divide-y divide-gray-100">
            {analytics.topOffers.map((off, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-3 text-xs">
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
      </div>
    </div>
  );
}
