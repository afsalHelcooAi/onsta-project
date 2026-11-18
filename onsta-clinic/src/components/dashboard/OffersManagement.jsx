import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Tag, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Sparkles, Calendar, Clock, DollarSign, X, Check, ArrowRight
} from 'lucide-react';
import VerificationBadge from '../common/VerificationBadge';

export default function OffersManagement({ onOpenPreview }) {
  const { offers, services, addOffer, updateOffer, deleteOffer, toggleOfferActive } = useClinic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State matching Screenshot 1
  const [formData, setFormData] = useState({
    title: '',
    linkedServiceId: services[0]?.id || '',
    normalPrice: services[0]?.normalPrice || 450,
    offerPrice: 299,
    startDate: '2026-11-01',
    endDate: '2026-12-31',
    terms: 'Valid for new and returning clients. Prior clinical consultation required.',
    description: 'Promotional medical aesthetics package with certified dermatologist oversight.',
    declaration: true,
    isActive: true
  });

  // Calculate discount percentage automatically
  const normal = parseFloat(formData.normalPrice || 0);
  const offer = parseFloat(formData.offerPrice || 0);
  const discountPercent = normal > 0 && offer < normal ? Math.round(((normal - offer) / normal) * 100) : 0;

  // Real-time Wording Check (Matching Screenshot 1)
  const wordingProhibited = /\b(best|only|100%|guaranteed|cheapest)\b/i.exec(formData.title);

  const openAddModal = () => {
    setEditingOffer(null);
    const defaultSrv = services[0] || {};
    setFormData({
      title: 'Hydrafacial Glow & Deep Extraction Special',
      linkedServiceId: defaultSrv.id || '',
      normalPrice: defaultSrv.normalPrice || 450,
      offerPrice: 299,
      startDate: '2026-11-01',
      endDate: '2027-01-31',
      terms: 'Valid for new & returning clients. Advance appointment required. DHA ST-21 terms apply.',
      description: 'Medical grade 45-minute revitalizing extraction and antioxidant infusion treatment.',
      declaration: true,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (offerItem) => {
    setEditingOffer(offerItem);
    setFormData({
      title: offerItem.title,
      linkedServiceId: offerItem.linkedServiceId,
      normalPrice: offerItem.normalPrice,
      offerPrice: offerItem.offerPrice,
      startDate: offerItem.startDate,
      endDate: offerItem.endDate,
      terms: offerItem.terms || '',
      description: offerItem.description || '',
      declaration: true,
      isActive: offerItem.isActive
    });
    setIsModalOpen(true);
  };

  const handleLinkedServiceChange = (serviceId) => {
    const srv = services.find(s => s.id === serviceId);
    setFormData(prev => ({
      ...prev,
      linkedServiceId: serviceId,
      normalPrice: srv ? srv.normalPrice : prev.normalPrice
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingOffer) {
      updateOffer(editingOffer.id, formData);
    } else {
      addOffer(formData);
    }
    setIsModalOpen(false);
  };

  // Demo shortcut to trigger "Best laser offer in Dubai" from Screenshot 1
  const handleTriggerBestWording = () => {
    setEditingOffer(null);
    setFormData({
      title: 'Best laser offer in Dubai',
      linkedServiceId: services[0]?.id || '',
      normalPrice: 850,
      offerPrice: 499,
      startDate: '2026-11-15',
      endDate: '2027-01-15',
      terms: 'Terms apply.',
      description: 'Laser hair removal treatment.',
      declaration: true,
      isActive: true
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Offers
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage multiple active promotional offers. Each offer has an independent active toggle and automated rule check.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Test Screenshot 1 Prohibited Wording */}
          <button
            type="button"
            onClick={handleTriggerBestWording}
            className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Test "Best" Claim Wording Warning</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Offer</span>
          </button>
        </div>
      </div>

      {/* Multiple Active Offers Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Promotional Offers</p>
            <h4 className="text-2xl font-bold font-mono text-gray-900 mt-1">{offers.length}</h4>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-100 text-gray-700">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Live & Active on ONSTA</p>
            <h4 className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {offers.filter(o => o.isActive).length}
            </h4>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e7e1d7] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Inactive (Hidden from Customers)</p>
            <h4 className="text-2xl font-bold font-mono text-gray-500 mt-1">
              {offers.filter(o => !o.isActive).length}
            </h4>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Offers Table (Multiple Offers Listing Specification) */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-gray-500 font-semibold border-b border-[#e7e1d7]">
              <tr>
                <th className="py-3.5 px-4">Offer title</th>
                <th className="py-3.5 px-3">Linked treatment</th>
                <th className="py-3.5 px-3 text-right">Normal</th>
                <th className="py-3.5 px-3 text-right">Offer</th>
                <th className="py-3.5 px-3 text-center">Discount</th>
                <th className="py-3.5 px-3">Validity period</th>
                <th className="py-3.5 px-3 text-center">Active toggle</th>
                <th className="py-3.5 px-3 text-center">Verification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offerItem) => (
                <tr key={offerItem.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-900 max-w-[220px]">
                      {offerItem.title}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                      {offerItem.description}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-gray-700 max-w-[180px] truncate">
                    {offerItem.linkedServiceName}
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono text-gray-400 line-through">
                    AED {offerItem.normalPrice}
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono font-bold text-[#0d281e]">
                    AED {offerItem.offerPrice}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      {offerItem.discountPercent}% OFF
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap text-[11px]">
                    {offerItem.startDate} to {offerItem.endDate}
                  </td>

                  {/* Independent Active / Inactive Toggle (Strict requirement) */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => toggleOfferActive(offerItem.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        offerItem.isActive
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${offerItem.isActive ? "bg-emerald-600 animate-pulse" : "bg-gray-400"}`} />
                      <span>{offerItem.isActive ? "Active" : "Inactive"}</span>
                    </button>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <VerificationBadge status={offerItem.verificationStatus} />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(offerItem)}
                        className="p-1 rounded text-gray-500 hover:text-[#0d281e] hover:bg-gray-100 transition-colors"
                        title="Edit Offer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(offerItem.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Offer Modal (Exact Replica of Reference Screenshot 1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#e7e1d7] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-6 pb-2 border-b border-gray-200 flex items-start justify-between bg-white">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                  {editingOffer ? "Edit offer" : "New offer"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Goes live only after ONSTA rule verification.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid matching Screenshot 1 */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form: Offer details (2 Cols) */}
              <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-[#e7e1d7] p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 font-serif">
                  Offer details
                </h3>

                {/* Offer Title & Wording Check (Screenshot 1) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Offer title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Laser hair removal special offer"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      wordingProhibited
                        ? "border-red-400 bg-red-50/30 text-red-900 focus:ring-red-400"
                        : "border-gray-300 focus:ring-[#0d281e]"
                    }`}
                  />

                  {/* Screenshot 1 Exact Callout */}
                  {wordingProhibited && (
                    <div className="mt-2 p-3 bg-[#FCE8E6] border border-[#FAD2CF] rounded-xl text-xs text-[#C5221F] space-y-1">
                      <p className="font-semibold">
                        Wording check: "{wordingProhibited[0]}" is an absolute claim and is not allowed. Suggested: "Laser hair removal offer".
                      </p>
                    </div>
                  )}
                </div>

                {/* Linked Service */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Linked service
                  </label>
                  <select
                    value={formData.linkedServiceId}
                    onChange={(e) => handleLinkedServiceChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} (AED {srv.normalPrice})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Normal Price & Offer Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Normal price (AED)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.normalPrice}
                      onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Offer price (AED)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.offerPrice}
                      onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>

                {/* Calculated Discount Badge */}
                {discountPercent > 0 && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                    <span>Calculated promotional discount:</span>
                    <strong className="font-bold text-sm">{discountPercent}% savings for patients</strong>
                  </div>
                )}

                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>

                {/* Terms Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Terms
                  </label>
                  <textarea
                    rows={3}
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="[Offer terms]"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  />
                </div>

                {/* Confirmation Checkbox (Screenshot 1) */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.declaration}
                      onChange={(e) => setFormData({ ...formData, declaration: e.target.checked })}
                      className="mt-0.5 rounded text-[#0d281e] focus:ring-[#0d281e]"
                    />
                    <span className="text-xs text-gray-700 font-medium">
                      I confirm this content follows the advertising rules and I am responsible for it.
                    </span>
                  </label>
                </div>

                {/* Action Buttons (Screenshot 1) */}
                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Save draft
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors shadow-sm"
                  >
                    Submit for review
                  </button>
                </div>
              </form>

              {/* Right Side: Customer preview & Review path (Screenshot 1) */}
              <div className="space-y-6">
                
                {/* Customer Preview Card (Screenshot 1) */}
                <div className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 font-serif">
                      Customer preview
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF7E0] text-[#B06000]">
                      Pending version, not live
                    </span>
                  </div>

                  <div className="h-32 rounded-xl bg-[#ede7dc] flex items-center justify-center text-gray-400 text-xs font-medium">
                    [Offer image]
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-gray-900">
                      {formData.title || "[Offer title]"}
                    </h5>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Al Noor Clinic • Jumeirah 1, Dubai
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base font-bold text-[#0d281e]">
                        AED {formData.offerPrice || "[000]"}
                      </span>
                      <span className="text-xs text-gray-400 line-through">
                        AED {formData.normalPrice || "[000]"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Valid {formData.startDate} to {formData.endDate}
                    </p>
                  </div>
                </div>

                {/* Review Path Card (Screenshot 1) */}
                <div className="bg-white rounded-2xl border border-[#e7e1d7] p-5 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 font-serif">
                    Review path
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-gray-700">1. Draft and wording check</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">
                        Automatic
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-gray-700">2. ONSTA Rule Engine</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">
                        Autonomous
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">3. Live on ONSTA</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                        Instant upon pass
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-200 animate-scaleUp">
            <h4 className="text-base font-bold text-gray-900 font-serif">
              Delete Offer?
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to remove this promotional offer? It will be immediately withdrawn from the customer platform.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteOffer(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
