import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import VerificationBadge from '../common/VerificationBadge';
import AppIcon from '../common/AppIcon';
import ModalPortal from '../common/ModalPortal';
import { parseTariffSheet, fetchMasterTreatments, uploadServiceImage, deleteServiceImage } from '../../api/serviceApi';

export default function ServicesPrices() {
  const { services, setServices, addService, batchAddServices, updateService, deleteService, toggleServiceActive, showToast } = useClinic();

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

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const serviceImgInputRef = useRef(null);

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
    imageUrl: '',
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
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setFormError('');
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
      imageUrl: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (srv) => {
    setEditingService(srv);
    setSelectedImageFile(null);
    setImagePreviewUrl(srv.imageUrl || '');
    setFormError('');
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
      imageUrl: srv.customImageUrl || '',
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
        scopeRequired: `${selected.category} Clinical Scope`,
        masterImageUrl: selected.default_image_url || ''
      }));
      if (!selectedImageFile && !formData.imageUrl && selected.default_image_url) {
        setImagePreviewUrl(selected.default_image_url);
      }
    } else {
      setFormData(prev => ({ ...prev, masterTreatmentId: '', masterImageUrl: '' }));
      if (!selectedImageFile && !formData.imageUrl) {
        setImagePreviewUrl('');
      }
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

  const handleServiceImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveCustomServiceImage = async () => {
    const token = localStorage.getItem('onsta_access_token');
    setSelectedImageFile(null);
    if (editingService && token) {
      try {
        await deleteServiceImage(editingService.id, token);
        const fallback = editingService.masterImageUrl || '';
        setImagePreviewUrl(fallback);
        setFormData(prev => ({ ...prev, imageUrl: '' }));
        setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, customImageUrl: null, imageUrl: fallback || null } : s));
        showToast('info', 'Custom Image Removed', 'Service image reset.');
      } catch (err) {
        showToast('error', 'Remove Failed', err.message);
      }
    } else {
      const mt = masterTreatments.find(t => t.id === formData.masterTreatmentId);
      setImagePreviewUrl(mt?.default_image_url || '');
      setFormData(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const normalNum = parseFloat(formData.normalPrice || 0);
    const hasOffer = formData.offerPrice !== '' && formData.offerPrice !== null && formData.offerPrice !== undefined;
    const offerNum = hasOffer ? parseFloat(formData.offerPrice) : null;

    if (offerNum !== null) {
      if (Number.isNaN(offerNum) || offerNum < 0) {
        setFormError('Offer price must be a valid positive amount.');
        return;
      }
      if (offerNum >= normalNum) {
        const msg = `Offer price (AED ${offerNum}) must be strictly lower than the standard tariff (AED ${normalNum}).`;
        setFormError(msg);
        showToast('error', 'Invalid Offer Price', msg);
        return;
      }
    }

    const payloadToSave = {
      ...formData,
      normalPrice: normalNum,
      offerPrice: offerNum,
    };

    const token = localStorage.getItem('onsta_access_token');
    let savedId = editingService?.id;

    if (editingService) {
      const res = await updateService(editingService.id, payloadToSave);
      if (res?.success === false) return;
    } else {
      const res = await addService(payloadToSave);
      if (res?.success === false) return;
      savedId = res?.service?.id;
    }

    if (selectedImageFile && savedId && token) {
      setUploadingImage(true);
      try {
        const imgRes = await uploadServiceImage(savedId, selectedImageFile, token);
        setServices(prev => prev.map(s => s.id === savedId ? { ...s, imageUrl: imgRes.imageUrl, customImageUrl: imgRes.imageUrl } : s));
        showToast('success', 'Treatment Photo Uploaded', 'Service image optimized and saved.');
      } catch (err) {
        showToast('error', 'Image Upload Failed', err.message);
      } finally {
        setUploadingImage(false);
      }
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
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
            <AppIcon name="stethoscope" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-theme-ink tracking-tight">
              Services & Pricing Catalogue
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
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
            className="px-4 py-2.5 rounded-full bg-theme-canvas text-theme-primary border border-theme-border-strong hover:bg-theme-primary-soft text-xs alata-regular flex items-center gap-2 transition-colors shadow-xs"
          >
            <AppIcon name="file-pdf" />
            <span>Import PDF Tariff</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            <AppIcon name="plus" className="text-xs" />
            <span>Add Single Service</span>
          </button>
        </div>
      </div>

      {/* Department Pills & Search Bar */}
      <div className="bg-theme-card p-4 rounded-2xl border border-theme-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <AppIcon name="search" className="text-xs text-theme-subtle absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search treatments by name, category, or clinical description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface text-xs text-theme-ink focus:outline-none focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted font-medium">Department:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-theme-border-slate text-xs text-theme-ink bg-theme-surface focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
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
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-theme-surface text-theme-muted border border-theme-border-slate hover:border-theme-border-strong hover:text-theme-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-theme-card rounded-3xl border border-theme-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-theme-canvas border-b border-theme-border text-theme-primary-hover alata-regular uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-theme-border">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-theme-muted">
                    <div className="w-12 h-12 rounded-2xl bg-theme-canvas text-theme-primary flex items-center justify-center mx-auto mb-3">
                      <AppIcon name="stethoscope" className="text-xl" />
                    </div>
                    <p className="alata-regular text-sm text-theme-ink">
                      {services.length === 0 ? 'No services in catalogue yet' : 'No services match your criteria'}
                    </p>
                    <p className="text-xs text-theme-muted mt-1 max-w-sm mx-auto">
                      {services.length === 0
                        ? 'Import your treatment price list from a PDF Tariff sheet or click "Add Single Service" above.'
                        : 'Try another search keyword or select a different department filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-theme-surface transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F6F0FA] border border-[#EAE0F2] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {srv.imageUrl ? (
                            <img src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
                          ) : (
                            <AppIcon name="stethoscope" size="sm" className="text-[#9E77AD]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="alata-regular text-theme-ink text-sm truncate max-w-xs">{srv.name}</div>
                          {srv.description && (
                            <div className="text-[11px] text-theme-muted truncate max-w-sm mt-0.5">{srv.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] alata-regular bg-theme-primary-soft text-theme-primary border border-theme-border-strong">
                        {srv.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-muted font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <AppIcon name="clock" className="text-theme-subtle" />
                        <span>{srv.duration}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`alata-regular text-sm ${srv.offerPrice ? 'text-theme-accent' : 'text-theme-primary'}`}>
                          {srv.offerPrice ? srv.offerPrice : srv.normalPrice} AED
                        </span>
                        {srv.offerPrice && (
                          <span className="text-[10px] text-theme-subtle line-through">
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
                            : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-border-slate'
                        }`}
                      >
                        {srv.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(srv)}
                          aria-label={`Edit ${srv.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl text-theme-muted hover:text-theme-primary hover:bg-theme-canvas flex items-center justify-center transition-colors"
                          title="Edit service"
                        >
                          <AppIcon name="edit" className="text-sm" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete service "${srv.name}"?`)) {
                              deleteService(srv.id);
                            }
                          }}
                          aria-label={`Delete ${srv.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl text-theme-subtle hover:text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                          title="Delete service"
                        >
                          <AppIcon name="trash" className="text-sm" />
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
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-theme-overlay/60 backdrop-blur-sm animate-fadeIn">
            <div className="my-auto bg-theme-card rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-theme-border max-h-[90vh] flex flex-col">
            <div className="p-5 bg-theme-sidebar-bg text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-primary text-white flex items-center justify-center">
                  <AppIcon name="file-pdf" className="text-sm" />
                </div>
                <div>
                  <h3 className="alata-regular text-base">
                    Import Services & Prices from PDF / Image Tariff
                  </h3>
                  <p className="text-theme-sidebar-kicker text-xs">
                    Multimodal Vision AI extracts treatments, AED rates, and maps them to DHA regulatory scope.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfImportOpen(false)}
                aria-label="Close tariff import modal"
                className="text-white/70 hover:text-white min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-white/10"
              >
                <AppIcon name="close" className="text-base" />
              </button>
            </div>

            {pdfParsingStep === 'upload' && (
              <div className="p-8 text-center space-y-6 overflow-y-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-theme-border-strong rounded-3xl p-8 hover:border-theme-primary transition-colors bg-theme-surface cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 bg-theme-primary-soft text-theme-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-theme-border-strong">
                    <AppIcon name="cloud-upload" className="text-2xl" />
                  </div>
                  <h4 className="alata-regular text-theme-ink text-base">
                    {selectedFile ? selectedFile.name : 'Drop your Clinic Price List or Treatment Menu'}
                  </h4>
                  <p className="text-xs text-theme-muted mt-1 max-w-md mx-auto">
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
                        className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-xs alata-regular shadow-sm inline-flex items-center gap-2"
                      >
                        <AppIcon name="ai" />
                        <span>Run AI Extraction on Uploaded File</span>
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-theme-card border border-theme-border-strong rounded-full text-xs alata-regular text-theme-primary hover:bg-theme-canvas">
                        Choose File from Computer
                      </span>
                    )}
                  </div>
                </div>

                {parseError && (
                  <div className="p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-2xl text-xs text-[#991B1B] flex items-center gap-2 text-left">
                    <AppIcon name="warning-circle" className="flex-shrink-0 text-[#DC2626]" />
                    <span>{parseError}</span>
                  </div>
                )}

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-theme-border"></div>
                  <span className="flex-shrink mx-4 text-theme-subtle text-xs font-medium uppercase tracking-wider">
                    Or Test Instantly
                  </span>
                  <div className="flex-grow border-t border-theme-border"></div>
                </div>

                <div className="p-4 bg-theme-canvas border border-theme-border rounded-2xl flex items-center justify-between gap-4">
                  <div className="text-left">
                    <p className="text-xs alata-regular text-theme-ink">
                      Sample UAE Aesthetic & Laser Clinic Tariff Sheet
                    </p>
                    <p className="text-[11px] text-theme-muted mt-0.5">
                      Extracts 6 real treatments (Hydrafacial, Candela GentleMax Laser, PRP, SkinPen, ZO Health, Carbon Peel).
                    </p>
                  </div>
                  <button
                    onClick={() => executeTariffParse(true)}
                    className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-xs alata-regular shadow-sm inline-flex items-center gap-1.5 flex-shrink-0"
                  >
                    <AppIcon name="ai" />
                    <span>Parse Sample Menu</span>
                  </button>
                </div>
              </div>
            )}

            {pdfParsingStep === 'parsing' && (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-theme-primary-soft text-theme-primary rounded-2xl flex items-center justify-center mx-auto border border-theme-border-strong">
                  <AppIcon name="spinner" spin className="text-2xl" />
                </div>
                <h4 className="alata-regular text-theme-ink text-lg">
                  AI Reading & Structuring Services from Tariff...
                </h4>
                <p className="text-xs text-theme-muted max-w-sm mx-auto">
                  Detecting treatments, duration times, categories, and matching against permitted DHA facility scopes.
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-theme-primary font-medium">
                  <AppIcon name="cpu" />
                  <span>Multimodal Vision AI + UAE Regulatory Scope Engine</span>
                </div>
              </div>
            )}

            {pdfParsingStep === 'review' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 bg-[#DCFCE7] border-b border-[#BBF7D0] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <AppIcon name="check-circle" className="text-[#166534]" />
                    <span className="text-xs alata-regular text-[#166534]">
                      AI Extracted {parsedServices.length} Treatments from {parsedFileName} (Confidence: {Math.round(parseConfidence * 100)}%)
                    </span>
                  </div>
                  {duplicatesCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] flex items-center gap-1">
                      <AppIcon name="warning" />
                      {duplicatesCount} already in catalogue
                    </span>
                  )}
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border border-theme-border rounded-xl overflow-hidden">
                    <thead className="bg-theme-canvas border-b border-theme-border text-theme-primary-hover alata-regular uppercase text-[10px]">
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
                    <tbody className="divide-y divide-theme-border">
                      {parsedServices.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-theme-surface ${item.isDuplicate ? 'bg-[#FFF9F2]' : ''}`}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateParsedItem(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-theme-border-slate rounded-lg text-xs text-theme-ink focus:outline-none focus:border-theme-primary"
                            />
                            {item.isDuplicate && (
                              <div className="text-[10px] text-[#9A3412] font-semibold mt-0.5 flex items-center gap-1">
                                <AppIcon name="warning" />
                                <span>Already in catalogue</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateParsedItem(idx, 'category', e.target.value)}
                              className="w-full px-2 py-1 border border-theme-border-slate rounded-lg text-xs text-theme-ink focus:outline-none focus:border-theme-primary"
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
                              className="w-20 px-2 py-1 border border-theme-border-slate rounded-lg text-xs text-theme-ink focus:outline-none focus:border-theme-primary"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.normalPrice}
                              onChange={(e) => handleUpdateParsedItem(idx, 'normalPrice', e.target.value)}
                              className="w-20 px-2 py-1 border border-theme-border-slate rounded-lg text-xs alata-regular text-theme-primary focus:outline-none focus:border-theme-primary"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              placeholder="Optional"
                              value={item.offerPrice ?? ''}
                              onChange={(e) => handleUpdateParsedItem(idx, 'offerPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-20 px-2 py-1 border border-theme-border-slate rounded-lg text-xs alata-regular text-theme-muted focus:outline-none focus:border-theme-primary"
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
                              aria-label={`Remove ${item.name}`}
                              className="text-theme-subtle hover:text-[#991B1B] min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-red-50"
                              title="Remove item"
                            >
                              <AppIcon name="trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-3">
                    <button
                      onClick={handleAddCustomParsedItem}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover alata-regular inline-flex items-center gap-1.5"
                    >
                      <AppIcon name="plus" className="text-[10px]" />
                      <span>Add another treatment row</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-theme-surface border-t border-theme-border flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setPdfParsingStep('upload')}
                    className="text-xs text-theme-muted hover:underline"
                  >
                    ← Re-upload Tariff
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPdfImportOpen(false)}
                      className="px-4 py-2 border border-theme-border-slate rounded-full text-xs text-theme-muted hover:bg-theme-card"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllParsedServices}
                      className="px-6 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-xs alata-regular shadow-sm flex items-center gap-2"
                    >
                      <AppIcon name="check-circle" />
                      <span>Confirm & Save All ({parsedServices.length} Services)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Add / Edit Single Service Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-theme-overlay/60 backdrop-blur-sm animate-fadeIn">
            <div className="my-auto bg-theme-card rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-theme-border max-h-[92vh] flex flex-col">
              <div className="p-5 bg-theme-sidebar-bg text-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-theme-primary flex items-center justify-center">
                    <AppIcon name="stethoscope" className="text-sm" />
                  </div>
                  <h3 className="alata-regular text-base">
                    {editingService ? 'Edit Treatment Offering' : 'Add Treatment Service'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close service modal"
                  className="text-white/70 hover:text-white min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-white/10"
                >
                  <AppIcon name="close" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-theme-canvas p-4 rounded-2xl border border-theme-border">
                <div className="flex items-center gap-1.5 text-xs alata-regular text-theme-primary mb-1">
                  <AppIcon name="ai" />
                  <span>Map to Onsta Master Treatment (AI Face Detection)</span>
                </div>
                <p className="text-[11px] text-theme-muted mb-2">
                  Selecting a standard treatment links your clinic's service to patient face scan recommendations automatically.
                </p>
                <select
                  value={formData.masterTreatmentId}
                  onChange={(e) => handleMasterTreatmentSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-card rounded-xl border border-theme-border-strong text-xs text-theme-ink font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
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
                      <span key={c.id} className="inline-flex items-center gap-1 text-[10px] bg-theme-card border border-theme-border-strong text-theme-primary px-2.5 py-0.5 rounded-full alata-regular">
                        <AppIcon name="check" className="text-[10px]" />
                        <span>Treats: {c.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">
                  Service / Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                  placeholder="e.g. Hydrafacial MD Deep Extraction"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
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
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    placeholder="e.g. 45 mins"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    Standard Tariff (AED) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.normalPrice}
                    onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs alata-regular text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    placeholder="e.g. 450"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    Offer Price (AED) <span className="text-theme-subtle font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.offerPrice}
                    onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs alata-regular text-[#6B3B66] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                    placeholder="e.g. 299"
                  />
                </div>
              </div>

              {formError && (
                <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-2.5 text-xs text-[#991B1B] flex items-center gap-2">
                  <AppIcon name="warning-circle" size="sm" className="text-[#DC2626] shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">
                  Regulatory Scope (MOHAP / DHA Facility Compliance)
                </label>
                <input
                  type="text"
                  value={formData.scopeRequired}
                  onChange={(e) => setFormData({ ...formData, scopeRequired: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink bg-theme-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">
                  Clinical Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                  placeholder="Describe treatment procedure, clinical benefits, and technology used."
                />
              </div>

              {/* Optional Treatment Photo */}
              <div className="bg-[#FAF8FC] border border-[#EAE0F2] rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#1E1B2E]">
                    Treatment Photo <span className="text-[#64748B] font-normal">(Optional — auto-inherits Master Default if mapped)</span>
                  </label>
                  {(selectedImageFile || formData.imageUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomServiceImage}
                      className="text-[11px] text-[#991B1B] hover:underline"
                    >
                      Reset / Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white border border-[#DECBE9] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Service Preview" className="w-full h-full object-cover" />
                    ) : (
                      <AppIcon name="image" size="md" className="text-[#9E77AD]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => serviceImgInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-full bg-white border border-[#DECBE9] text-[#6B3B66] hover:bg-[#F0E6F6] text-xs alata-regular inline-flex items-center gap-1.5 transition"
                    >
                      <AppIcon name="cloud-upload" size="sm" />
                      <span>{imagePreviewUrl ? 'Change Photo' : 'Upload Treatment Photo'}</span>
                    </button>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Show equipment or treatment suite (JPG, PNG, WebP). Avoid unpermitted before/after photos.
                    </p>
                    <input
                      ref={serviceImgInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleServiceImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-theme-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-theme-border-slate rounded-full text-xs text-theme-muted hover:bg-theme-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-xs alata-regular shadow-sm flex items-center gap-2"
                >
                  <AppIcon name="check-circle" />
                  <span>{editingService ? 'Update Service' : 'Save Service'}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
