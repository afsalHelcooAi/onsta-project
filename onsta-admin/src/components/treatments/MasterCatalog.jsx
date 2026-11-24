import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Tag, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  Edit2,
  X,
  FolderPlus
} from 'lucide-react';

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
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F7F4EE]">
      {/* Header */}
      <header className="p-8 pb-4 border-b border-[#E5E0D8] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            AI Detection & Clinical Taxonomy
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#0D281E]">
            Master Treatments & AI Concerns
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Standard clinical treatments with dynamic categories and face-scan AI mapping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E0D8] hover:bg-gray-50 text-[#0D281E] rounded-lg text-sm font-medium shadow-sm transition-all"
          >
            <FolderPlus className="w-4 h-4 text-emerald-700" />
            Add Dynamic Category
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Master Treatment
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E0D8] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dynamic Categories</span>
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0D281E]">{catalog.categories?.length || 0}</span>
              <span className="text-xs text-gray-400">taxonomies</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E0D8] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Standard Treatments</span>
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0D281E]">{catalog.treatments?.length || 0}</span>
              <span className="text-xs text-gray-400">active in catalog</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E0D8] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Face Scan Concerns</span>
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0D281E]">{catalog.concerns?.length || 0}</span>
              <span className="text-xs text-gray-400">detectable conditions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E0D8] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Mapping Rules</span>
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#0D281E]">
                {(catalog.treatments || []).reduce((acc, t) => acc + (t.mapped_concerns?.length || 0), 0)}
              </span>
              <span className="text-xs text-gray-400">treatment matches</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search treatments or concerns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-[#0D281E] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ALL
            </button>
            {(catalog.categories || []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-[#0D281E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name} ({cat.treatments_count || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading master catalog…</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No treatments found matching your search.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Treatment & Dynamic Category</th>
                  <th className="py-3.5 px-6">AI Detected Concerns Treated</th>
                  <th className="py-3.5 px-6">Standard Duration</th>
                  <th className="py-3.5 px-6">Reference Price</th>
                  <th className="py-3.5 px-6">Clinic Adoption</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D8] text-sm">
                {filteredTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#0D281E]">{t.name}</div>
                      <div className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-xs font-medium mt-1 border border-emerald-200/50">
                        {t.category}
                      </div>
                      {t.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-md">{t.description}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {t.mapped_concerns && t.mapped_concerns.length > 0 ? (
                          t.mapped_concerns.map((mc) => (
                            <span
                              key={mc.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              {mc.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No AI concerns linked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {t.standard_duration_minutes} min
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700 font-medium">
                      {t.reference_price_min && t.reference_price_max ? (
                        <span>AED {t.reference_price_min} - {t.reference_price_max}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {t.clinic_services_count || 0} clinics
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          t.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {t.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold font-serif text-[#0D281E]">Add Dynamic Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Body Contouring & Cryo"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical category scope..."
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold font-serif text-[#0D281E]">Add Master Clinical Treatment</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Treatment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microneedling RF / Secret RF"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {(catalog.categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Standard Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.standard_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, standard_duration_minutes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description & Clinical Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical overview and patient benefits..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Ref Price Min (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={formData.reference_price_min}
                    onChange={(e) => setFormData({ ...formData, reference_price_min: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Ref Price Max (AED)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formData.reference_price_max}
                    onChange={(e) => setFormData({ ...formData, reference_price_max: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Map Target Concerns */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Map to Onsta AI Face Detection Concerns
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-44 overflow-y-auto space-y-2 bg-gray-50">
                  {(catalog.concerns || []).map(c => {
                    const isSelected = formData.concern_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-100/70 border border-amber-300' : 'bg-white hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleConcern(c.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-semibold text-gray-900">{c.name}</span>
                          <span className="text-gray-400 text-[10px] ml-1.5">({c.category})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
