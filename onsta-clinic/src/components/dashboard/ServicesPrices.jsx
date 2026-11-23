import React, { useState, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Stethoscope, Plus, Search, Filter, Edit2, Trash2, CheckCircle2,
  AlertCircle, ShieldAlert, Sparkles, X, Check, ArrowRight, FileText,
  Upload, Cpu, CheckSquare, Loader2, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import VerificationBadge from '../common/VerificationBadge';
import { parseTariffSheet } from '../../api/serviceApi';

export default function ServicesPrices() {
  const { services, addService, batchAddServices, updateService, deleteService, toggleServiceActive, showToast } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // PDF / Image Batch Import States
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfParsingStep, setPdfParsingStep] = useState('upload'); // 'upload' | 'parsing' | 'review'
  const [parsedServices, setParsedServices] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [parseConfidence, setParseConfidence] = useState(0.95);
  const [parsedFileName, setParsedFileName] = useState('');
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const fileInputRef = useRef(null);

  // Modal Form State
  const [formData, setFormData] = useState({
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

  const categories = ['All', 'Laser Clinic', 'Dermatology', 'Aesthetic Clinic', 'Wellness', 'Medical Clinic'];

  const categoryScopes = {
    'Laser Clinic': 'Class 4 Medical Laser Facility Scope',
    'Dermatology': 'Dermatological Outpatient Scope',
    'Aesthetic Clinic': 'Aesthetic Medicine Scope',
    'Wellness': 'Outpatient Clinic Scope',
    'Medical Clinic': 'General Medical Scope'
  };

  const filteredServices = services.filter((srv) => {
    const matchesSearch = srv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()));
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
      category: srv.category || 'Dermatology',
      description: srv.description || '',
      duration: srv.duration || '45 mins',
      normalPrice: (srv.normalPrice || '').toString(),
      offerPrice: srv.offerPrice ? srv.offerPrice.toString() : '',
      applicableSpecialty: srv.applicableSpecialty || srv.category || 'Dermatology',
      scopeRequired: srv.scopeRequired || 'Dermatological Outpatient Scope',
      isActive: srv.isActive !== false
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (cat) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      applicableSpecialty: cat,
      scopeRequired: categoryScopes[cat] || 'Outpatient Clinic Scope'
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (editingService) {
      await updateService(editingService.id, formData);
    } else {
      await addService(formData);
    }
    setIsModalOpen(false);
  };

  // PDF / Tariff Parser Flow
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseError(null);
    }
  };

  const executeTariffParse = async (useSample = false) => {
    setPdfParsingStep('parsing');
    setParseError(null);

    const token = localStorage.getItem('onsta_access_token');
    try {
      const data = await parseTariffSheet(useSample ? null : selectedFile, useSample, token);
      setParsedServices(data.services || []);
      setParseConfidence(data.confidence || 0.92);
      setParsedFileName(data.fileName || (useSample ? 'sample-tariff.pdf' : selectedFile?.name));
      setDuplicatesCount(data.duplicatesFound || 0);
      setPdfParsingStep('review');
    } catch (err) {
      setParseError(err.message || 'Failed to parse tariff sheet.');
      setPdfParsingStep('upload');
      showToast('error', 'Parse Error', err.message);
    }
  };

  const handleUpdateParsedItem = (index, field, value) => {
    setParsedServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'category' && categoryScopes[value]) {
        updated[index].scopeRequired = categoryScopes[value];
      }
      return updated;
    });
  };

  const handleDeleteParsedItem = (index) => {
    setParsedServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomParsedItem = () => {
    setParsedServices(prev => [
      ...prev,
      {
        name: 'New Aesthetic Treatment',
        category: 'Aesthetic Clinic',
        description: 'Clinical aesthetic procedure',
        duration: '45 mins',
        normalPrice: 500,
        offerPrice: null,
        scopeRequired: 'Aesthetic Medicine Scope',
        isDuplicate: false,
        warning: null
      }
    ]);
  };

  const handleSaveAllParsedServices = async () => {
    // Filter or save all items
    const toSave = parsedServices.map(item => ({
      name: item.name,
      category: item.category,
      description: item.description,
      duration: item.duration,
      normalPrice: item.normalPrice,
      offerPrice: item.offerPrice,
      scopeRequired: item.scopeRequired,
      applicableSpecialty: item.category,
      isActive: true
    }));

    await batchAddServices(toSave);
    setIsPdfImportOpen(false);
    setPdfParsingStep('upload');
    setSelectedFile(null);
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
              setSelectedFile(null);
              setParseError(null);
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
            placeholder="Search treatments by name, category, or clinical description..."
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
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-500">
                    <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
                    <p className="font-semibold text-sm text-gray-700">
                      {services.length === 0 ? 'No services in catalogue yet' : 'No services match your criteria'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {services.length === 0
                        ? 'Import your treatment price list from a PDF Tariff sheet or click "Add Single Service" above.'
                        : 'Try another search keyword or select a different category filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-gray-900 text-sm">{srv.name}</div>
                      {srv.description && (
                        <div className="text-[11px] text-gray-500 truncate max-w-sm mt-0.5">{srv.description}</div>
                      )}
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0d281e] text-sm font-mono">
                          AED {srv.offerPrice ? srv.offerPrice : srv.normalPrice}
                        </span>
                        {srv.offerPrice && (
                          <span className="text-[10px] text-gray-400 line-through font-mono">
                            AED {srv.normalPrice}
                          </span>
                        )}
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
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                          title="Edit service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete service "${srv.name}"?`)) {
                              deleteService(srv.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF BATCH IMPORT MODAL & STEP 2 REVIEW WINDOW */}
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
                    Import Services & Prices from PDF / Image Tariff
                  </h3>
                  <p className="text-emerald-200 text-xs">
                    Multimodal Vision AI extracts treatments, AED rates, and maps them to DHA regulatory scope.
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
              <div className="p-8 text-center space-y-6 overflow-y-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#e7e1d7] rounded-2xl p-8 hover:border-[#137333] transition-colors bg-[#FAF8F5] cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 bg-emerald-50 text-[#0d281e] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif font-bold text-gray-900 text-base">
                    {selectedFile ? selectedFile.name : 'Drop your Clinic Price List or Treatment Menu'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    {selectedFile
                      ? `Selected ${(selectedFile.size / 1024).toFixed(1)} KB. Ready for AI extraction.`
                      : 'Supports multi-page PDFs, scanned price menus, or tariff sheets (PDF, PNG, JPG).'}
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-3">
                    {selectedFile ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeTariffParse(false);
                        }}
                        className="px-6 py-2.5 bg-[#0d281e] hover:bg-[#153f2f] text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span>Run AI Extraction on Uploaded File</span>
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Choose File from Computer
                      </span>
                    )}
                  </div>
                </div>

                {parseError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                    <span>{parseError}</span>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">
                    Or Test Instantly
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-950">
                      Sample UAE Aesthetic & Laser Clinic Tariff Sheet
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Extracts 6 real treatments (Hydrafacial, Candela GentleMax Laser, PRP, SkinPen, ZO Health, Carbon Peel).
                    </p>
                  </div>
                  <button
                    onClick={() => executeTariffParse(true)}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Parse Sample Menu</span>
                  </button>
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
                  AI Reading & Structuring Services from Tariff...
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Detecting treatments, duration times, categories, and matching against permitted DHA facility scopes.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-700 font-medium">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Multimodal Vision AI + UAE Regulatory Scope Engine</span>
                </div>
              </div>
            )}

            {/* Step 3: PRE-SAVE BATCH REVIEW WINDOW (Human-in-the-Loop) */}
            {pdfParsingStep === 'review' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-950">
                      AI Extracted {parsedServices.length} Treatments from {parsedFileName} (Confidence: {Math.round(parseConfidence * 100)}%)
                    </span>
                  </div>
                  {duplicatesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {duplicatesCount} already in catalogue
                    </span>
                  )}
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-[#F7F4EE] border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Service Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Standard (AED)</th>
                        <th className="py-2.5 px-3">Offer (AED)</th>
                        <th className="py-2.5 px-3">Scope Required</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedServices.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${item.isDuplicate ? 'bg-amber-50/50' : ''}`}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateParsedItem(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#0d281e]"
                            />
                            {item.isDuplicate && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Already in catalogue (will skip if duplicate)</span>
                              </div>
                            )}
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
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-xs font-mono font-bold text-[#0d281e] focus:outline-none focus:border-[#0d281e]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              placeholder="Optional"
                              value={item.offerPrice ?? ''}
                              onChange={(e) => handleUpdateParsedItem(idx, 'offerPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-xs font-mono text-gray-700 focus:outline-none focus:border-[#0d281e]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate block max-w-[140px]" title={item.scopeRequired}>
                              {item.scopeRequired}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
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

                  <div className="mt-3">
                    <button
                      onClick={handleAddCustomParsedItem}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add another treatment row</span>
                    </button>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setPdfParsingStep('upload')}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    ← Re-upload Tariff
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
                  {editingService ? 'Edit Treatment Offering' : 'Add Treatment Service'}
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
                    onChange={(e) => handleCategoryChange(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Standard Tariff (AED) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.normalPrice}
                    onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    placeholder="e.g. 450"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Offer Price (AED) <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.offerPrice}
                    onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    placeholder="e.g. 299"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Regulatory Scope (MOHAP / DHA Facility Compliance)
                </label>
                <input
                  type="text"
                  value={formData.scopeRequired}
                  onChange={(e) => setFormData({ ...formData, scopeRequired: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e] bg-gray-50"
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
