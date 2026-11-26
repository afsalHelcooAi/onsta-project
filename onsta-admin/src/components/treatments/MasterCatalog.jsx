import React, { useState, useEffect } from 'react';
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

      setShowAddModal(false);
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

  const filteredTreatments = (catalog.treatments || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.mapped_concerns && t.mapped_concerns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F6F0FA]">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[#EAE0F2] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#6B3B66] text-xs alata-regular uppercase tracking-wider mb-1">
            <FaIcon icon="fa-solid fa-wand-magic-sparkles" className="text-[#6B3B66]" />
            AI Detection & Clinical Taxonomy
          </div>
          <h1 className="text-2xl alata-regular text-[#1E1B2E]">
            Master Treatments & AI Concerns
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Standard clinical treatments with dynamic categories and face-scan AI mapping.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F6F0FA] border border-[#DECBE9] hover:bg-[#F0E6F6] text-[#6B3B66] rounded-full text-sm alata-regular shadow-sm transition-all"
          >
            <FaIcon icon="fa-solid fa-folder-plus" />
            Add Dynamic Category
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-sm alata-regular shadow-sm transition-all"
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
          <div className="bg-white p-5 rounded-3xl border border-[#EAE0F2] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Dynamic Categories</span>
              <span className="w-9 h-9 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center">
                <FaIcon icon="fa-solid fa-layer-group" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-[#1E1B2E]">{catalog.categories?.length || 0}</span>
              <span className="text-xs text-[#64748B]">taxonomies</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#EAE0F2] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Standard Treatments</span>
              <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-[#1E1B2E]">{catalog.treatments?.length || 0}</span>
              <span className="text-xs text-[#64748B]">active in catalog</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#EAE0F2] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">AI Face Scan Concerns</span>
              <span className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FaIcon icon="fa-solid fa-star" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-[#1E1B2E]">{catalog.concerns?.length || 0}</span>
              <span className="text-xs text-[#64748B]">detectable conditions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#EAE0F2] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">AI Mapping Rules</span>
              <span className="w-9 h-9 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center">
                <FaIcon icon="fa-solid fa-shield-halved" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl alata-regular text-[#1E1B2E]">
                {(catalog.treatments || []).reduce((acc, t) => acc + (t.mapped_concerns?.length || 0), 0)}
              </span>
              <span className="text-xs text-[#64748B]">treatment matches</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAE0F2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-[#64748B] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search treatments or concerns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs alata-regular whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-[#6B3B66] text-white shadow-sm'
                  : 'bg-[#F8FAFC] border border-[#EAE0F2] text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#6B3B66]'
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
                    ? 'bg-[#6B3B66] text-white shadow-sm'
                    : 'bg-[#F8FAFC] border border-[#EAE0F2] text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#6B3B66]'
                }`}
              >
                {cat.name} ({cat.treatments_count || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-3xl border border-[#EAE0F2] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#64748B]">Loading master catalog…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 flex items-center justify-center gap-2">
              <FaIcon icon="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="p-12 text-center text-[#64748B]">
              No treatments found matching your search.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EAE0F2] text-[11px] alata-regular text-[#64748B] uppercase tracking-wider">
                  <th className="py-3.5 px-6">Treatment & Dynamic Category</th>
                  <th className="py-3.5 px-6">AI Detected Concerns Treated</th>
                  <th className="py-3.5 px-6">Standard Duration</th>
                  <th className="py-3.5 px-6">Reference Price</th>
                  <th className="py-3.5 px-6">Clinic Adoption</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0F2] text-sm">
                {filteredTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F6F0FA]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="alata-regular text-[#1E1B2E]">{t.name}</div>
                      <div className="inline-block px-2.5 py-0.5 bg-[#F0E6F6] text-[#6B3B66] rounded-full text-xs alata-regular mt-1 border border-[#DECBE9]">
                        {t.category}
                      </div>
                      {t.description && (
                        <div className="text-xs text-[#64748B] mt-1 line-clamp-1 max-w-md">{t.description}</div>
                      )}
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
                          <span className="text-xs text-[#64748B] italic">No AI concerns linked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#64748B]">
                      <div className="flex items-center gap-1.5">
                        <FaIcon icon="fa-regular fa-clock" className="text-[#6B3B66]/70" />
                        {t.standard_duration_minutes} min
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#1E1B2E] alata-regular">
                      {t.reference_price_min && t.reference_price_max ? (
                        <span>AED {t.reference_price_min} - {t.reference_price_max}</span>
                      ) : (
                        <span className="text-[#64748B]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs alata-regular bg-[#F0E6F6] text-[#6B3B66] border border-[#DECBE9]">
                        {t.clinic_services_count || 0} clinics
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs alata-regular transition-colors border ${
                          t.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-[#F8FAFC] text-[#64748B] border-[#EAE0F2] hover:bg-[#F0E6F6]'
                        }`}
                      >
                        <FaIcon icon={t.is_active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                        {t.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="text-xs alata-regular text-[#6B3B66] hover:text-[#552B51]"
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
        <div className="fixed inset-0 z-50 bg-[#1A1320]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE0F2]">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE0F2]">
              <h2 className="text-lg alata-regular text-[#1E1B2E]">Add Dynamic Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-[#64748B] hover:text-[#1E1B2E] p-1 rounded-full hover:bg-[#F6F0FA]">
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Body Contouring & Cryo"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical category scope..."
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE0F2]">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-[#EAE0F2] text-[#64748B] rounded-full text-sm hover:bg-[#F6F0FA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-sm alata-regular disabled:opacity-50 transition shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-[#1A1320]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EAE0F2] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE0F2]">
              <h2 className="text-lg alata-regular text-[#1E1B2E]">Add Master Clinical Treatment</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#1E1B2E] p-1 rounded-full hover:bg-[#F6F0FA]">
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                  Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microneedling RF / Secret RF"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                  >
                    {(catalog.categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                    Standard Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.standard_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, standard_duration_minutes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                  Description & Clinical Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical overview and patient benefits..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                    Ref Price Min (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={formData.reference_price_min}
                    onChange={(e) => setFormData({ ...formData, reference_price_min: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                    Ref Price Max (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formData.reference_price_max}
                    onChange={(e) => setFormData({ ...formData, reference_price_max: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#EAE0F2] rounded-xl text-sm text-[#1E1B2E] focus:outline-none focus:border-[#6B3B66]"
                  />
                </div>
              </div>

              {/* Map Target Concerns */}
              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] uppercase tracking-wider mb-1.5">
                  Map to Onsta AI Face Detection Concerns
                </label>
                <div className="border border-[#EAE0F2] rounded-2xl p-3 max-h-44 overflow-y-auto space-y-2 bg-[#F8FAFC]">
                  {(catalog.concerns || []).map(c => {
                    const isSelected = formData.concern_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F0E6F6] border border-[#DECBE9]' : 'bg-white hover:bg-[#F6F0FA] border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleConcern(c.id)}
                          className="rounded text-[#6B3B66] focus:ring-[#6B3B66]"
                        />
                        <div>
                          <span className="alata-regular text-[#1E1B2E]">{c.name}</span>
                          <span className="text-[#64748B] text-[10px] ml-1.5">({c.category})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE0F2]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#EAE0F2] text-[#64748B] rounded-full text-sm hover:bg-[#F6F0FA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#6B3B66] hover:bg-[#552B51] text-white rounded-full text-sm alata-regular disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? 'Saving…' : 'Save Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
