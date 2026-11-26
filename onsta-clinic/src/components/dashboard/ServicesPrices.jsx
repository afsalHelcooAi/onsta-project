import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import VerificationBadge from '../common/VerificationBadge';
import FaIcon from '../common/FaIcon';
import { parseTariffSheet, fetchMasterTreatments } from '../../api/serviceApi';

export default function ServicesPrices() {
  const { services, addService, batchAddServices, updateService, deleteService, toggleServiceActive, showToast } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Master Treatments from Platform Super Admin
  const [masterTreatments, setMasterTreatments] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('onsta_access_token');
    fetchMasterTreatments(token)
      .then(data => {
        setMasterTreatments(data.treatments || []);
        setMasterCategories(data.categories || []);
      })
      .catch(err => {
        console.warn('Could not load master treatments:', err);
      });
  }, []);

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
    masterTreatmentId: '',
    category: 'Facial & Skin Health',
    description: '',
    duration: '45 mins',
    normalPrice: '450',
    offerPrice: '',
    applicableSpecialty: 'Aesthetic Medicine',
    scopeRequired: 'Aesthetic Medicine Scope',
    isActive: true
  });

  const dynamicCategories = Array.from(
    new Set([
      'All',
      ...services.map((s) => s.category).filter(Boolean),
      ...masterCategories.map((c) => c.name).filter(Boolean),
    ])
  );

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
      masterTreatmentId: '',
      category: masterCategories[0]?.name || 'Facial & Skin Health',
      description: '',
      duration: '45 mins',
      normalPrice: '450',
      offerPrice: '',
      applicableSpecialty: 'Aesthetic Medicine',
      scopeRequired: 'Aesthetic Medicine Scope',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (srv) => {
    setEditingService(srv);
    setFormData({
      name: srv.name,
      masterTreatmentId: srv.masterTreatmentId || '',
      category: srv.category || 'Facial & Skin Health',
      description: srv.description || '',
      duration: srv.duration || '45 mins',
      normalPrice: (srv.normalPrice || '').toString(),
      offerPrice: srv.offerPrice ? srv.offerPrice.toString() : '',
      applicableSpecialty: srv.applicableSpecialty || srv.category || 'Aesthetic Medicine',
      scopeRequired: srv.scopeRequired || 'Aesthetic Medicine Scope',
      isActive: srv.isActive !== false
    });
    setIsModalOpen(true);
  };

  const handleMasterTreatmentSelect = (treatmentId) => {
    const selected = masterTreatments.find(t => t.id === treatmentId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        masterTreatmentId: selected.id,
        name: prev.name || selected.name,
        category: selected.category || prev.category,
        description: prev.description || selected.description || '',
        duration: `${selected.standard_duration_minutes || 45} mins`,
        normalPrice: prev.normalPrice || (selected.reference_price_min ? selected.reference_price_min.toString() : '450'),
        applicableSpecialty: selected.medical_specialty || 'Aesthetic Medicine',
        scopeRequired: `${selected.category} Clinical Scope`
      }));
    } else {
      setFormData(prev => ({ ...prev, masterTreatmentId: '' }));
    }
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
      <div className="bg-white rounded-3xl border border-[#EAE0F2] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center flex-shrink-0">
            <FaIcon icon="fa-solid fa-stethoscope" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-[#1E1B2E] tracking-tight">
              Services & Pricing Catalogue
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Maintain your clinical treatment offerings. Add single services or import full tariffs from PDF sheets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => {
              setSelectedFile(null);
              setParseError(null);
              setPdfParsingStep('upload');
              setIsPdfImportOpen(true);
            }}
            className="px-4 py-2.5 rounded-full bg-[#F6F0FA] text-[#6B3B66] border border-[#DECBE9] hover:bg-[#F0E6F6] text-xs alata-regular flex items-center gap-2 transition-colors shadow-xs"
          >
            <FaIcon icon="fa-solid fa-file-pdf" />
            <span>Import PDF Tariff</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white hover:bg-[#552B51] text-xs alata-regular flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            <FaIcon icon="fa-solid fa-plus" className="text-xs" />
            <span>Add Single Service</span>
          </button>
        </div>
      </div>

      {/* Department Pills & Search Bar (Polyclinic.ae Inspiration) */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAE0F2] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search treatments by name, category, or clinical description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#1E1B2E] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] font-medium">Department:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
            >
              {dynamicCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        {dynamicCategories.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] alata-regular transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#6B3B66] text-white shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:border-[#DECBE9] hover:text-[#6B3B66]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl border border-[#EAE0F2] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F0FA] border-b border-[#EAE0F2] text-[#552B51] alata-regular uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-[#F1EDF6]">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#64748B]">
                    <div className="w-12 h-12 rounded-2xl bg-[#F6F0FA] text-[#6B3B66] flex items-center justify-center mx-auto mb-3">
                      <FaIcon icon="fa-solid fa-stethoscope" className="text-xl" />
                    </div>
                    <p className="alata-regular text-sm text-[#1E1B2E]">
                      {services.length === 0 ? 'No services in catalogue yet' : 'No services match your criteria'}
                    </p>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                      {services.length === 0
                        ? 'Import your treatment price list from a PDF Tariff sheet or click "Add Single Service" above.'
                        : 'Try another search keyword or select a different department filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="alata-regular text-[#1E1B2E] text-sm">{srv.name}</div>
                      {srv.description && (
                        <div className="text-[11px] text-[#64748B] truncate max-w-sm mt-0.5">{srv.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] alata-regular bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]">
                        {srv.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569] font-medium">
                      <FaIcon icon="fa-regular fa-clock" className="mr-1.5 text-[#94A3B8]" />
                      {srv.duration}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="alata-regular text-[#6B3B66] text-sm">
                          {srv.offerPrice ? srv.offerPrice : srv.normalPrice} AED
                        </span>
                        {srv.offerPrice && (
                          <span className="text-[10px] text-[#94A3B8] line-through">
                            {srv.normalPrice} AED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                        {srv.scopeRequired || 'Outpatient Scope'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleServiceActive(srv.id)}
                        className={`px-3 py-1 rounded-full text-[10px] alata-regular transition-colors ${
                          srv.isActive
                            ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                            : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {srv.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(srv)}
                          className="w-8 h-8 rounded-xl text-[#64748B] hover:text-[#6B3B66] hover:bg-[#F6F0FA] flex items-center justify-center transition-colors"
                          title="Edit service"
                        >
                          <FaIcon icon="fa-solid fa-pen-to-square" className="text-xs" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete service "${srv.name}"?`)) {
                              deleteService(srv.id);
                            }
                          }}
                          className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                          title="Delete service"
                        >
                          <FaIcon icon="fa-solid fa-trash-can" className="text-xs" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1320]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[#EAE0F2] max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#1A1320] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6B3B66] text-white flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-file-pdf" className="text-sm" />
                </div>
                <div>
                  <h3 className="alata-regular text-base">
                    Import Services & Prices from PDF / Image Tariff
                  </h3>
                  <p className="text-[#C7B0D8] text-xs">
                    Multimodal Vision AI extracts treatments, AED rates, and maps them to DHA regulatory scope.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfImportOpen(false)}
                className="text-white/70 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
              >
                <FaIcon icon="fa-solid fa-xmark" className="text-base" />
              </button>
            </div>

            {pdfParsingStep === 'upload' && (
              <div className="p-8 text-center space-y-6 overflow-y-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DECBE9] rounded-3xl p-8 hover:border-[#6B3B66] transition-colors bg-[#F8FAFC] cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 bg-[#F0E6F6] text-[#6B3B66] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#DECBE9]">
                    <FaIcon icon="fa-solid fa-cloud-arrow-up" className="text-2xl" />
                  </div>
                  <h4 className="alata-regular text-[#1E1B2E] text-base">
                    {selectedFile ? selectedFile.name : 'Drop your Clinic Price List or Treatment Menu'}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
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
                        className="px-6 py-2.5 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-xs alata-regular shadow-sm inline-flex items-center gap-2"
                      >
                        <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
                        <span>Run AI Extraction on Uploaded File</span>
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-white border border-[#DECBE9] rounded-full text-xs alata-regular text-[#6B3B66] hover:bg-[#F6F0FA]">
                        Choose File from Computer
                      </span>
                    )}
                  </div>
                </div>

                {parseError && (
                  <div className="p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-2xl text-xs text-[#991B1B] flex items-center gap-2 text-left">
                    <FaIcon icon="fa-solid fa-circle-exclamation" className="flex-shrink-0 text-[#DC2626]" />
                    <span>{parseError}</span>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#EAE0F2]"></div>
                  <span className="flex-shrink mx-4 text-[#94A3B8] text-xs font-medium uppercase tracking-wider">
                    Or Test Instantly
                  </span>
                  <div className="flex-grow border-t border-[#EAE0F2]"></div>
                </div>

                <div className="p-4 bg-[#F6F0FA] border border-[#EAE0F2] rounded-2xl flex items-center justify-between gap-4">
                  <div className="text-left">
                    <p className="text-xs alata-regular text-[#1E1B2E]">
                      Sample UAE Aesthetic & Laser Clinic Tariff Sheet
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Extracts 6 real treatments (Hydrafacial, Candela GentleMax Laser, PRP, SkinPen, ZO Health, Carbon Peel).
                    </p>
                  </div>
                  <button
                    onClick={() => executeTariffParse(true)}
                    className="px-4 py-2 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-xs alata-regular shadow-sm inline-flex items-center gap-1.5 flex-shrink-0"
                  >
                    <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
                    <span>Parse Sample Menu</span>
                  </button>
                </div>
              </div>
            )}

            {pdfParsingStep === 'parsing' && (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-[#F0E6F6] text-[#6B3B66] rounded-2xl flex items-center justify-center mx-auto border border-[#DECBE9]">
                  <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-2xl" />
                </div>
                <h4 className="alata-regular text-[#1E1B2E] text-lg">
                  AI Reading & Structuring Services from Tariff...
                </h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Detecting treatments, duration times, categories, and matching against permitted DHA facility scopes.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-[#6B3B66] font-medium">
                  <FaIcon icon="fa-solid fa-microchip" />
                  <span>Multimodal Vision AI + UAE Regulatory Scope Engine</span>
                </div>
              </div>
            )}

            {pdfParsingStep === 'review' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 bg-[#DCFCE7] border-b border-[#BBF7D0] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FaIcon icon="fa-solid fa-circle-check" className="text-[#166534]" />
                    <span className="text-xs alata-regular text-[#166534]">
                      AI Extracted {parsedServices.length} Treatments from {parsedFileName} (Confidence: {Math.round(parseConfidence * 100)}%)
                    </span>
                  </div>
                  {duplicatesCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] flex items-center gap-1">
                      <FaIcon icon="fa-solid fa-triangle-exclamation" />
                      {duplicatesCount} already in catalogue
                    </span>
                  )}
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border border-[#EAE0F2] rounded-xl overflow-hidden">
                    <thead className="bg-[#F6F0FA] border-b border-[#EAE0F2] text-[#552B51] alata-regular uppercase text-[10px]">
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
                    <tbody className="divide-y divide-[#F1EDF6]">
                      {parsedServices.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-[#F8FAFC] ${item.isDuplicate ? 'bg-[#FFF9F2]' : ''}`}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateParsedItem(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                            />
                            {item.isDuplicate && (
                              <div className="text-[10px] text-[#9A3412] font-semibold mt-0.5 flex items-center gap-1">
                                <FaIcon icon="fa-solid fa-triangle-exclamation" />
                                <span>Already in catalogue</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateParsedItem(idx, 'category', e.target.value)}
                              className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
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
                              className="w-20 px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.normalPrice}
                              onChange={(e) => handleUpdateParsedItem(idx, 'normalPrice', e.target.value)}
                              className="w-20 px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs alata-regular text-[#6B3B66] focus:outline-none focus:border-[#6B3B66]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              placeholder="Optional"
                              value={item.offerPrice ?? ''}
                              onChange={(e) => handleUpdateParsedItem(idx, 'offerPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-20 px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs alata-regular text-[#475569] focus:outline-none focus:border-[#6B3B66]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#BBF7D0] truncate block max-w-[140px]" title={item.scopeRequired}>
                              {item.scopeRequired}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleDeleteParsedItem(idx)}
                              className="text-[#94A3B8] hover:text-[#991B1B] p-1 rounded"
                              title="Remove item"
                            >
                              <FaIcon icon="fa-solid fa-trash-can" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-3">
                    <button
                      onClick={handleAddCustomParsedItem}
                      className="text-xs text-[#6B3B66] hover:text-[#552B51] alata-regular inline-flex items-center gap-1.5"
                    >
                      <FaIcon icon="fa-solid fa-plus" className="text-[10px]" />
                      <span>Add another treatment row</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#F8FAFC] border-t border-[#EAE0F2] flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setPdfParsingStep('upload')}
                    className="text-xs text-[#64748B] hover:underline"
                  >
                    ← Re-upload Tariff
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPdfImportOpen(false)}
                      className="px-4 py-2 border border-[#E2E8F0] rounded-full text-xs text-[#475569] hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllParsedServices}
                      className="px-6 py-2 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-xs alata-regular shadow-sm flex items-center gap-2"
                    >
                      <FaIcon icon="fa-solid fa-circle-check" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1320]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#EAE0F2]">
            <div className="p-5 bg-[#1A1320] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#6B3B66] flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-stethoscope" className="text-sm" />
                </div>
                <h3 className="alata-regular text-base">
                  {editingService ? 'Edit Treatment Offering' : 'Add Treatment Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
              >
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="bg-[#F6F0FA] p-4 rounded-2xl border border-[#EAE0F2]">
                <div className="flex items-center gap-1.5 text-xs alata-regular text-[#6B3B66] mb-1">
                  <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
                  <span>Map to Onsta Master Treatment (AI Face Detection)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mb-2">
                  Selecting a standard treatment links your clinic's service to patient face scan recommendations automatically.
                </p>
                <select
                  value={formData.masterTreatmentId}
                  onChange={(e) => handleMasterTreatmentSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#DECBE9] text-xs text-[#1E1B2E] font-medium focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                >
                  <option value="">-- Custom / Other Clinic Service --</option>
                  {masterTreatments.map((mt) => (
                    <option key={mt.id} value={mt.id}>
                      {mt.name} ({mt.category})
                    </option>
                  ))}
                </select>
                {formData.masterTreatmentId && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {masterTreatments.find(t => t.id === formData.masterTreatmentId)?.target_concerns?.map((c) => (
                      <span key={c.id} className="text-[10px] bg-white border border-[#DECBE9] text-[#6B3B66] px-2.5 py-0.5 rounded-full alata-regular">
                        ✓ Treats: {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                  Service / Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                  placeholder="e.g. Hydrafacial MD Deep Extraction"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                  >
                    {masterCategories.length > 0 ? (
                      masterCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Facial & Skin Health">Facial & Skin Health</option>
                        <option value="Laser & Light Therapy">Laser & Light Therapy</option>
                        <option value="Skin Rejuvenation">Skin Rejuvenation</option>
                        <option value="Injectables & Neuromodulators">Injectables & Neuromodulators</option>
                        <option value="Lifting & Contouring">Lifting & Contouring</option>
                        <option value="Dermatology">Dermatology</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    placeholder="e.g. 45 mins"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                    Standard Tariff (AED) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.normalPrice}
                    onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs alata-regular text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    placeholder="e.g. 450"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                    Offer Price (AED) <span className="text-[#94A3B8] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.offerPrice}
                    onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs alata-regular text-[#6B3B66] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    placeholder="e.g. 299"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                  Regulatory Scope (MOHAP / DHA Facility Compliance)
                </label>
                <input
                  type="text"
                  value={formData.scopeRequired}
                  onChange={(e) => setFormData({ ...formData, scopeRequired: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] bg-[#F8FAFC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                  Clinical Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                  placeholder="Describe treatment procedure, clinical benefits, and technology used."
                />
              </div>

              <div className="pt-4 border-t border-[#F1EDF6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-full text-xs text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-xs alata-regular shadow-sm flex items-center gap-2"
                >
                  <FaIcon icon="fa-solid fa-circle-check" />
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
