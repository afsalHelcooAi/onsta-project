import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Stethoscope, Plus, Search, Filter, Edit2, Trash2, CheckCircle2,
  AlertCircle, ShieldAlert, Sparkles, X, Check, ArrowRight, FileText,
  Upload, Cpu, CheckSquare, Loader2
} from 'lucide-react';
import VerificationBadge from '../common/VerificationBadge';

export default function ServicesPrices() {
  const { services, addService, batchAddServices, updateService, deleteService, toggleServiceActive } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // PDF Batch Import States
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfParsingStep, setPdfParsingStep] = useState('upload'); // 'upload' | 'parsing' | 'review'
  const [parsedServices, setParsedServices] = useState([]);

  // Modal Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Dermatology',
    description: '',
    duration: '45 mins',
    normalPrice: '',
    offerPrice: '',
    applicableSpecialty: 'Dermatology',
    scopeRequired: 'Dermatological Outpatient Scope',
    isActive: true
  });

  const categories = ['All', 'Laser Clinic', 'Dermatology', 'Aesthetic Clinic', 'Wellness', 'Medical Clinic'];

  const filteredServices = services.filter((srv) => {
    const matchesSearch = srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          srv.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'Dermatology',
      description: '',
      duration: '45 mins',
      normalPrice: '450',
      offerPrice: '',
      applicableSpecialty: 'Dermatology',
      scopeRequired: 'Dermatological Outpatient Scope',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (srv) => {
    setEditingService(srv);
    setFormData({
      name: srv.name,
      category: srv.category,
      description: srv.description,
      duration: srv.duration,
      normalPrice: srv.normalPrice.toString(),
      offerPrice: srv.offerPrice ? srv.offerPrice.toString() : '',
      applicableSpecialty: srv.applicableSpecialty,
      scopeRequired: srv.scopeRequired,
      isActive: srv.isActive
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingService) {
      updateService(editingService.id, formData);
    } else {
      addService(formData);
    }
    setIsModalOpen(false);
  };

  // PDF Parser Simulation
  const handleStartPdfScan = () => {
    setPdfParsingStep('parsing');
    setTimeout(() => {
      setParsedServices([
        {
          name: "Hydrafacial MD Deluxe Treatment",
          category: "Aesthetic Clinic",
          description: "Multi-step resurfacing treatment clearing pores and infusing hydrating peptides.",
          duration: "45 mins",
          normalPrice: 550,
          offerPrice: null,
          scopeRequired: "Dermatological Outpatient Scope"
        },
        {
          name: "Candela GentleMax Pro Full Legs Laser",
          category: "Laser Clinic",
          description: "Dual wavelength medical laser for gentle hair reduction with dynamic cooling device.",
          duration: "60 mins",
          normalPrice: 850,
          offerPrice: null,
          scopeRequired: "Class 4 Medical Laser Facility Scope"
        },
        {
          name: "PRP Vampire Facial with Micro-Needling",
          category: "Dermatology",
          description: "Autologous platelet-rich plasma infusion to stimulate collagen and skin renewal.",
          duration: "50 mins",
          normalPrice: 950,
          offerPrice: null,
          scopeRequired: "Clinical Dermatology Scope"
        },
        {
          name: "SkinPen Precision Micro-Needling",
          category: "Dermatology",
          description: "FDA-cleared medical microneedling for acne scar repair and skin tightening.",
          duration: "45 mins",
          normalPrice: 700,
          offerPrice: null,
          scopeRequired: "Dermatological Outpatient Scope"
        },
        {
          name: "ZO Skin Health Ultra Hydration Facial",
          category: "Wellness",
          description: "Medical-grade barrier repair facial with aloe, hyaluronic acid, and cooling masque.",
          duration: "60 mins",
          normalPrice: 400,
          offerPrice: null,
          scopeRequired: "Outpatient Clinic Scope"
        },
        {
          name: "Carbon Spectra Laser Peel (Hollywood Peel)",
          category: "Laser Clinic",
          description: "Q-switched Nd:YAG laser treatment targeting enlarged pores and pigmentation.",
          duration: "40 mins",
          normalPrice: 650,
          offerPrice: null,
          scopeRequired: "Class 4 Medical Laser Facility Scope"
        }
      ]);
      setPdfParsingStep('review');
    }, 1500);
  };

  const handleUpdateParsedItem = (index, field, value) => {
    setParsedServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteParsedItem = (index) => {
    setParsedServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAllParsedServices = () => {
    batchAddServices(parsedServices);
    setIsPdfImportOpen(false);
    setPdfParsingStep('upload');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Services & Pricing Catalogue
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maintain your clinical treatment offerings. Add single services or import full price lists from a PDF tariff sheet.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              setPdfParsingStep('upload');
              setIsPdfImportOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Import from PDF Tariff</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Service</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e7e1d7] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search treatments by name, specialty, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F4EE] border-b border-[#e7e1d7] text-gray-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Treatment / Service Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Price (AED)</th>
                <th className="py-3.5 px-4">Regulatory Scope</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-gray-900 text-sm">{srv.name}</div>
                    <div className="text-[11px] text-gray-500 truncate max-w-sm mt-0.5">{srv.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F7F4EE] text-gray-800 border border-[#e7e1d7]">
                      {srv.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 font-medium">
                    {srv.duration}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0d281e] text-sm font-mono">
                      AED {srv.normalPrice}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {srv.scopeRequired || "Outpatient Scope"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => toggleServiceActive(srv.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        srv.isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {srv.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(srv)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                        title="Edit service"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteService(srv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        title="Delete service"
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

      {/* PDF BATCH IMPORT MODAL & REVIEW WINDOW */}
      {isPdfImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 bg-[#0d281e] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">
                    Import Services & Prices from PDF
                  </h3>
                  <p className="text-emerald-200 text-xs">
                    Upload clinic price list brochure. AI splits rows into individual services for review.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfImportOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Upload */}
            {pdfParsingStep === 'upload' && (
              <div className="p-8 text-center space-y-6">
                <div className="border-2 border-dashed border-[#e7e1d7] rounded-2xl p-10 hover:border-[#137333] transition-colors bg-[#FAF8F5]">
                  <div className="w-16 h-16 bg-emerald-50 text-[#0d281e] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif font-bold text-gray-900 text-base">
                    Drop your Clinic Price List or Treatment Menu (PDF)
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Supports multi-page PDFs, scanned price menus, or tariff sheets. AI will extract names, categories, durations, and AED pricing.
                  </p>
                  <div className="mt-5">
                    <button
                      onClick={handleStartPdfScan}
                      className="px-6 py-2.5 bg-[#0d281e] hover:bg-[#153f2f] text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Parse Sample Clinic Price Sheet (al-noor-menu.pdf)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Parsing Animation */}
            {pdfParsingStep === 'parsing' && (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-[#0d281e] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
                </div>
                <h4 className="font-serif font-bold text-gray-900 text-lg">
                  AI Reading & Structuring Services from PDF...
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Detecting treatments, duration times, categories, and matching against permitted DHA facility scope.
                </p>
              </div>
            )}

            {/* Step 3: PRE-SAVE BATCH REVIEW WINDOW */}
            {pdfParsingStep === 'review' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      AI Extracted {parsedServices.length} Services. Review and edit before saving to catalogue:
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    All prices in AED
                  </span>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-[#F7F4EE] border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Service Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Price (AED)</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedServices.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateParsedItem(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#0d281e]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateParsedItem(idx, 'category', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#0d281e]"
                            >
                              <option value="Dermatology">Dermatology</option>
                              <option value="Laser Clinic">Laser Clinic</option>
                              <option value="Aesthetic Clinic">Aesthetic Clinic</option>
                              <option value="Wellness">Wellness</option>
                              <option value="Medical Clinic">Medical Clinic</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.duration}
                              onChange={(e) => handleUpdateParsedItem(idx, 'duration', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#0d281e]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.normalPrice}
                              onChange={(e) => handleUpdateParsedItem(idx, 'normalPrice', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-200 rounded text-xs font-mono font-bold text-[#0d281e] focus:outline-none focus:border-[#0d281e]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => handleDeleteParsedItem(idx)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setPdfParsingStep('upload')}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    ← Re-upload PDF
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPdfImportOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllParsedServices}
                      className="px-6 py-2 bg-[#0d281e] hover:bg-[#153f2f] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Confirm & Save All ({parsedServices.length} Services)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Single Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
            <div className="p-5 bg-[#0d281e] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-300" />
                <h3 className="font-serif font-bold text-base">
                  {editingService ? 'Edit Treatment' : 'Add Treatment Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Service / Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  placeholder="e.g. Hydrafacial MD Deep Extraction"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  >
                    <option value="Dermatology">Dermatology</option>
                    <option value="Laser Clinic">Laser Clinic</option>
                    <option value="Aesthetic Clinic">Aesthetic Clinic</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Medical Clinic">Medical Clinic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    placeholder="e.g. 45 mins"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Standard Price (AED) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.normalPrice}
                  onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  placeholder="e.g. 450"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Clinical Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  placeholder="Describe treatment procedure, clinical benefits, and technology used."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0d281e] hover:bg-[#153f2f] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{editingService ? 'Update Service' : 'Save Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
