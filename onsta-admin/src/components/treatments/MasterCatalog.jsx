import React, { useState, useEffect, useRef } from 'react';
import FaIcon from '../common/FaIcon';

export default function MasterCatalog() {
  const [catalog, setCatalog] = useState({ categories: [], treatments: [], concerns: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingTreatmentId, setUploadingTreatmentId] = useState(null);
  const modalImgInputRef = useRef(null);
  const rowImgInputRef = useRef(null);
  const targetRowTreatmentId = useRef(null);

  // Form State for Treatment
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    category: '',
    description: '',
    medical_specialty: 'Aesthetic Medicine',
    standard_duration_minutes: 45,
    reference_price_min: '',
    reference_price_max: '',
    concern_ids: []
  });

  // Form State for New Category
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    display_order: 0
  });

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('onsta_access_token');
      const res = await fetch('/api/v1/platform-admin/master-catalog', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load master treatment catalog');
      const data = await res.json();
      setCatalog(data);
      if (data.categories?.length > 0 && !formData.category_id) {
        setFormData(prev => ({
          ...prev,
          category_id: data.categories[0].id,
          category: data.categories[0].name
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleToggleActive = async (treatment) => {
    try {
      const token = localStorage.getItem('onsta_access_token');
      const res = await fetch(`/api/v1/platform-admin/master-catalog/treatments/${treatment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !treatment.is_active })
      });
      if (!res.ok) throw new Error('Failed to update treatment status');
      fetchCatalog();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleConcern = (concernId) => {
    setFormData(prev => {
      const exists = prev.concern_ids.includes(concernId);
      return {
        ...prev,
        concern_ids: exists
          ? prev.concern_ids.filter(id => id !== concernId)
          : [...prev.concern_ids, concernId]
      };
    });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('onsta_access_token');
      const res = await fetch('/api/v1/platform-admin/master-catalog/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(categoryFormData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create category');
      }

      setShowAddCategoryModal(false);
      setCategoryFormData({ name: '', description: '', display_order: 0 });
      fetchCatalog();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTreatment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('onsta_access_token');
      const res = await fetch('/api/v1/platform-admin/master-catalog/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          standard_duration_minutes: parseInt(formData.standard_duration_minutes) || 45,
          reference_price_min: formData.reference_price_min ? parseFloat(formData.reference_price_min) : null,
          reference_price_max: formData.reference_price_max ? parseFloat(formData.reference_price_max) : null,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create treatment');
      }

      const created = await res.json();
      if (selectedImageFile && created?.id) {
        const fd = new FormData();
        fd.append('file', selectedImageFile);
        await fetch(`/api/v1/platform-admin/master-catalog/treatments/${created.id}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
      }

      setShowAddModal(false);
      setSelectedImageFile(null);
      setImagePreviewUrl('');
      setFormData({
        name: '',
        category_id: catalog.categories[0]?.id || '',
        category: catalog.categories[0]?.name || '',
        description: '',
        medical_specialty: 'Aesthetic Medicine',
        standard_duration_minutes: 45,
        reference_price_min: '',
        reference_price_max: '',
        concern_ids: []
      });
      fetchCatalog();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowImageUpload = async (e) => {
    const file = e.target.files?.[0];
    const treatmentId = targetRowTreatmentId.current;
    e.target.value = '';
    if (!file || !treatmentId) return;

    try {
      setUploadingTreatmentId(treatmentId);
      const token = localStorage.getItem('onsta_access_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/v1/platform-admin/master-catalog/treatments/${treatmentId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to upload treatment image');
      }
      fetchCatalog();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingTreatmentId(null);
    }
  };

  const filteredTreatments = (catalog.treatments || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.mapped_concerns && t.mapped_concerns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-theme-canvas">
      {/* Header */}
      <header className="px-8 py-6 border-b border-theme-border bg-theme-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-theme-primary text-xs alata-regular uppercase tracking-wider mb-1">
            <FaIcon icon="fa-solid fa-wand-magic-sparkles" className="text-theme-primary" />
            AI Detection & Clinical Taxonomy
          </div>
          <h1 className="text-2xl alata-regular text-theme-ink">
            Master Treatments & AI Concerns
          </h1>
          <p className="text-sm text-theme-muted mt-1">
            Standard clinical treatments with dynamic categories and face-scan AI mapping.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-canvas border border-theme-border-strong hover:bg-theme-primary-soft text-theme-primary rounded-full text-sm alata-regular shadow-sm transition-all"
          >
            <FaIcon icon="fa-solid fa-folder-plus" />
            Add Dynamic Category
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-sm alata-regular shadow-sm transition-all"
          >
            <FaIcon icon="fa-solid fa-plus" />
            Add Master Treatment
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-theme-card p-5 rounded-3xl border border-theme-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Dynamic Categories</span>
              <span className="w-9 h-9 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
                <FaIcon icon="fa-solid fa-layer-group" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-theme-ink">{catalog.categories?.length || 0}</span>
              <span className="text-xs text-theme-muted">taxonomies</span>
            </div>
          </div>

          <div className="bg-theme-card p-5 rounded-3xl border border-theme-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Standard Treatments</span>
              <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-theme-ink">{catalog.treatments?.length || 0}</span>
              <span className="text-xs text-theme-muted">active in catalog</span>
            </div>
          </div>

          <div className="bg-theme-card p-5 rounded-3xl border border-theme-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">AI Face Scan Concerns</span>
              <span className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FaIcon icon="fa-solid fa-star" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-theme-ink">{catalog.concerns?.length || 0}</span>
              <span className="text-xs text-theme-muted">detectable conditions</span>
            </div>
          </div>

          <div className="bg-theme-card p-5 rounded-3xl border border-theme-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">AI Mapping Rules</span>
              <span className="w-9 h-9 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center">
                <FaIcon icon="fa-solid fa-shield-halved" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-theme-ink">
                {(catalog.treatments || []).reduce((acc, t) => acc + (t.mapped_concerns?.length || 0), 0)}
              </span>
              <span className="text-xs text-theme-muted">treatment matches</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-theme-card p-4 rounded-2xl border border-theme-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search treatments or concerns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs alata-regular whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-theme-primary text-white shadow-sm'
                  : 'bg-theme-surface border border-theme-border text-theme-muted hover:bg-theme-canvas hover:text-theme-primary'
              }`}
            >
              ALL
            </button>
            {(catalog.categories || []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs alata-regular whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-theme-primary text-white shadow-sm'
                    : 'bg-theme-surface border border-theme-border text-theme-muted hover:bg-theme-canvas hover:text-theme-primary'
                }`}
              >
                {cat.name} ({cat.treatments_count || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-theme-card rounded-3xl border border-theme-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-theme-muted">Loading master catalog…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 flex items-center justify-center gap-2">
              <FaIcon icon="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="p-12 text-center text-theme-muted">
              No treatments found matching your search.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-surface border-b border-theme-border text-[11px] alata-regular text-theme-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6">Treatment & Dynamic Category</th>
                  <th className="py-3.5 px-6">AI Detected Concerns Treated</th>
                  <th className="py-3.5 px-6">Standard Duration</th>
                  <th className="py-3.5 px-6">Reference Price</th>
                  <th className="py-3.5 px-6">Clinic Adoption</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border text-sm">
                {filteredTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-theme-canvas/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            targetRowTreatmentId.current = t.id;
                            rowImgInputRef.current?.click();
                          }}
                          className="w-12 h-12 rounded-xl bg-[#F6F0FA] border border-[#EAE0F2] overflow-hidden flex-shrink-0 flex items-center justify-center relative group"
                          title="Upload default treatment image"
                        >
                          {uploadingTreatmentId === t.id ? (
                            <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-[#6B3B66]" />
                          ) : t.default_image_url ? (
                            <img src={t.default_image_url} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <FaIcon icon="fa-regular fa-image" className="text-[#9E77AD]" />
                          )}
                          <span className="absolute inset-0 bg-[#1A1320]/55 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </span>
                        </button>
                        <div>
                          <div className="alata-regular text-theme-ink">{t.name}</div>
                          <div className="inline-block px-2.5 py-0.5 bg-theme-primary-soft text-theme-primary rounded-full text-xs alata-regular mt-1 border border-theme-border-strong">
                            {t.category}
                          </div>
                          {t.description && (
                            <div className="text-xs text-theme-muted mt-1 line-clamp-1 max-w-md">{t.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {t.mapped_concerns && t.mapped_concerns.length > 0 ? (
                          t.mapped_concerns.map((mc) => (
                            <span
                              key={mc.id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70"
                            >
                              <FaIcon icon="fa-solid fa-wand-magic-sparkles" className="text-[10px] text-amber-600" />
                              {mc.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-theme-muted italic">No AI concerns linked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-theme-muted">
                      <div className="flex items-center gap-1.5">
                        <FaIcon icon="fa-regular fa-clock" className="text-theme-primary/70" />
                        {t.standard_duration_minutes} min
                      </div>
                    </td>
                    <td className="py-4 px-6 text-theme-ink alata-regular">
                      {t.reference_price_min && t.reference_price_max ? (
                        <span>AED {t.reference_price_min} - {t.reference_price_max}</span>
                      ) : (
                        <span className="text-theme-muted">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs alata-regular bg-theme-primary-soft text-theme-primary border border-theme-border-strong">
                        {t.clinic_services_count || 0} clinics
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs alata-regular transition-colors border ${
                          t.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-primary-soft'
                        }`}
                      >
                        <FaIcon icon={t.is_active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                        {t.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover"
                      >
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Dynamic Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-theme-overlay/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card rounded-3xl max-w-md w-full p-6 shadow-2xl border border-theme-border">
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <h2 className="text-lg alata-regular text-theme-ink">Add Dynamic Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-theme-muted hover:text-theme-ink p-1 rounded-full hover:bg-theme-canvas">
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Body Contouring & Cryo"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical category scope..."
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-theme-border text-theme-muted rounded-full text-sm hover:bg-theme-canvas transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-sm alata-regular disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? 'Creating…' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Master Treatment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-theme-overlay/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-theme-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <h2 className="text-lg alata-regular text-theme-ink">Add Master Clinical Treatment</h2>
              <button onClick={() => setShowAddModal(false)} className="text-theme-muted hover:text-theme-ink p-1 rounded-full hover:bg-theme-canvas">
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                  Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microneedling RF / Secret RF"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                    Dynamic Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      const sel = (catalog.categories || []).find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        category_id: e.target.value,
                        category: sel ? sel.name : ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                  >
                    {(catalog.categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                    Standard Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.standard_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, standard_duration_minutes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                  Description & Clinical Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical overview and patient benefits..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                    Ref Price Min (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={formData.reference_price_min}
                    onChange={(e) => setFormData({ ...formData, reference_price_min: e.target.value })}
                    className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                    Ref Price Max (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formData.reference_price_max}
                    onChange={(e) => setFormData({ ...formData, reference_price_max: e.target.value })}
                    className="w-full px-3.5 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm text-theme-ink focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              {/* Map Target Concerns */}
              <div>
                <label className="block text-xs font-semibold text-theme-ink uppercase tracking-wider mb-1.5">
                  Map to Onsta AI Face Detection Concerns
                </label>
                <div className="border border-theme-border rounded-2xl p-3 max-h-44 overflow-y-auto space-y-2 bg-theme-surface">
                  {(catalog.concerns || []).map(c => {
                    const isSelected = formData.concern_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-theme-primary-soft border border-theme-border-strong' : 'bg-theme-card hover:bg-theme-canvas border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleConcern(c.id)}
                          className="rounded text-theme-primary focus:ring-theme-primary"
                        />
                        <div>
                          <span className="alata-regular text-theme-ink">{c.name}</span>
                          <span className="text-theme-muted text-[10px] ml-1.5">({c.category})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Default Treatment Image (Optional) */}
              <div className="bg-[#F8FAFC] border border-[#EAE0F2] rounded-2xl p-3.5">
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-2">
                  Default Treatment Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white border border-[#DECBE9] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FaIcon icon="fa-regular fa-image" className="text-[#9E77AD]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => modalImgInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-[#DECBE9] text-[#6B3B66] hover:bg-[#F0E6F6] rounded-full text-xs alata-regular inline-flex items-center gap-1.5 transition"
                    >
                      <FaIcon icon="fa-solid fa-cloud-arrow-up" />
                      <span>{imagePreviewUrl ? 'Change Default Photo' : 'Upload Default Photo'}</span>
                    </button>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Clinics mapping to this treatment automatically inherit this image unless they upload a custom one.
                    </p>
                    <input
                      ref={modalImgInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setSelectedImageFile(f);
                          setImagePreviewUrl(URL.createObjectURL(f));
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Default Treatment Image (Optional) */}
              <div className="bg-[#F8FAFC] border border-[#EAE0F2] rounded-2xl p-3.5">
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-2">
                  Default Treatment Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white border border-[#DECBE9] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FaIcon icon="fa-regular fa-image" className="text-[#9E77AD]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => modalImgInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-[#DECBE9] text-[#6B3B66] hover:bg-[#F0E6F6] rounded-full text-xs alata-regular inline-flex items-center gap-1.5 transition"
                    >
                      <FaIcon icon="fa-solid fa-cloud-arrow-up" />
                      <span>{imagePreviewUrl ? 'Change Default Photo' : 'Upload Default Photo'}</span>
                    </button>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Clinics mapping to this treatment automatically inherit this image unless they upload a custom one.
                    </p>
                    <input
                      ref={modalImgInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setSelectedImageFile(f);
                          setImagePreviewUrl(URL.createObjectURL(f));
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-theme-border text-theme-muted rounded-full text-sm hover:bg-theme-canvas transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-full text-sm alata-regular disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? 'Saving…' : 'Save Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <input
        ref={rowImgInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleRowImageUpload}
        className="hidden"
      />
    </main>
  );
}
