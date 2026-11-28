import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';

export default function RequestsReview() {
  const { showToast } = useClinic();
  const [filter, setFilter] = useState('All');
  const [selectedRequestId, setSelectedRequestId] = useState('REQ-1');

  const requests = [
    {
      id: 'REQ-1',
      item: 'Hydrafacial MD Special Price',
      serviceName: 'Hydrafacial MD Deep Extraction',
      type: 'Price',
      submitted: '16 Nov 2026',
      status: 'Pending review',
      liveValue: 'AED 450',
      pendingValue: 'AED 299',
      suggestion: 'Ensure the promotional pricing includes all consumable disposable tip costs in line with Dubai Consumer Protection guidelines.',
      badgeClass: 'bg-[#FEF7E0] text-[#B06000]'
    },
    {
      id: 'REQ-2',
      item: 'Full Body Laser Hair Removal Package',
      serviceName: 'Laser Hair Removal Package',
      type: 'Offer',
      submitted: '14 Nov 2026',
      status: 'Changes requested',
      liveValue: 'AED 850',
      pendingValue: 'AED 599',
      suggestion: 'Remove superlative phrase "unbeatable smoothness" and replace with factual wording "effective hair reduction across 6 sessions".',
      badgeClass: 'bg-[#FCE8E6] text-[#C5221F]'
    },
    {
      id: 'REQ-3',
      item: 'Treatment Suite 1 High-Res Photo',
      serviceName: 'Clinic Gallery Image',
      type: 'Photo',
      submitted: '12 Nov 2026',
      status: 'Approved (live)',
      liveValue: 'Active in gallery',
      pendingValue: 'Verified',
      suggestion: 'Photo meets all clinical hygiene documentation criteria.',
      badgeClass: 'bg-[#E6F4EA] text-[#137333]'
    },
    {
      id: 'REQ-4',
      item: 'Weekend Flash Promo Claim',
      serviceName: 'Promotional Content',
      type: 'Content',
      submitted: '08 Nov 2026',
      status: 'Rejected',
      liveValue: 'N/A',
      pendingValue: 'Rejected',
      suggestion: 'Claims of "100% permanent hair elimination" violate DHA Standard ST-21 clause 6.11.',
      badgeClass: 'bg-[#F1F3F4] text-[#5F6368]'
    }
  ];

  const filtered = requests.filter(r => {
    if (filter === 'All') return true;
    return r.status.toLowerCase().includes(filter.toLowerCase());
  });

  const selectedItem = requests.find(r => r.id === selectedRequestId) || requests[0];

  const handleAction = (action) => {
    showToast("info", "Action Processed", `Request ${action} successfully.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
          Change Requests & Compliance Audits
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Every profile, pricing, or credential update is audited against Dubai Health Authority (DHA) advertising rules.
        </p>
      </div>

      {/* Hybrid Smart Gate Banner */}
      <div className="p-4 rounded-2xl bg-emerald-950 text-emerald-200 border border-emerald-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-white text-xs font-serif tracking-wide uppercase">
              Hybrid Verification Architecture
            </strong>
          </div>
          <p className="text-emerald-300/90 text-[11px] leading-relaxed">
            <strong>Fast-Track:</strong> Routine updates (hours, gallery photos, pricing) that pass automated keyword checks publish to <code className="text-emerald-200 bg-white/10 px-1 py-0.5 rounded">onsta.ae</code> immediately.<br />
            <strong>Regulated:</strong> Changes to Legal Entity Name, Facility Licence numbers, or unverified claims enter this queue for software admin compliance sign-off.
          </p>
        </div>
      </div>

      {/* Filter Tabs (Screenshot 2) */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', 'Pending review', 'Changes requested', 'Approved', 'Rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === tab
                ? 'bg-[#0d281e] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-[#e7e1d7] hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid: Left Table & Right Inspector (Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-gray-500 font-semibold border-b border-[#e7e1d7]">
              <tr>
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Submitted</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedRequestId === req.id ? 'bg-emerald-50/50' : 'hover:bg-gray-50/70'
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    {req.item}
                  </td>
                  <td className="py-3.5 px-3 text-gray-600">
                    {req.type}
                  </td>
                  <td className="py-3.5 px-3 text-gray-400">
                    {req.submitted}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${req.badgeClass}`}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Detail Card (Screenshot 2) */}
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-gray-900 font-serif">
              {selectedItem.type} update • [{selectedItem.serviceName}]
            </h4>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${selectedItem.badgeClass}`}>
              {selectedItem.status}
            </span>
          </div>

          {/* Comparison Boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[10px] text-gray-400 block font-medium">Live now</span>
              <strong className="text-sm font-bold font-mono text-gray-900 mt-1 block">
                {selectedItem.liveValue}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-inner">
              <span className="text-[10px] text-gray-400 block font-medium">Your pending change</span>
              <strong className="text-sm font-bold font-mono text-[#0d281e] mt-1 block">
                {selectedItem.pendingValue}
              </strong>
            </div>
          </div>

          {/* ONSTA Reviewer Suggestion */}
          <div className="space-y-1.5 pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              ONSTA suggestion
            </span>
            <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-200 leading-relaxed italic">
              "{selectedItem.suggestion}"
            </p>
          </div>

          {/* Action Buttons (Screenshot 2) */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => handleAction("Accepted")}
              className="w-full py-2.5 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors shadow-sm"
            >
              Accept suggestion
            </button>

            <button
              onClick={() => handleAction("Declined")}
              className="w-full py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Decline
            </button>

            <button
              onClick={() => handleAction("Withdrawn")}
              className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-xs hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Withdraw request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
