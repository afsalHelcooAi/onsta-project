import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  UserCheck, Plus, Search, Edit2, Trash2, ShieldCheck, Mail,
  Phone, Calendar, Clock, DollarSign, X, Check, Globe, Award,
  Cpu, Sparkles, FileText, CheckCircle2, Upload, AlertCircle
} from 'lucide-react';
import VerificationBadge from '../common/VerificationBadge';

export default function DoctorsManagement() {
  const { doctors, addDoctor, updateDoctor, deleteDoctor, toggleDoctorActive } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // AI Extraction state
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Auto-Extracted Section (Top priority)
    fullName: '',
    licenceNumber: '',
    title: 'Specialist Dermatologist',
    specialty: 'Dermatology & Aesthetic Medicine',
    authority: 'DHA',
    licenceExpiry: '2028-11-30',
    // Manual Section (Lower)
    consultationFee: '350',
    languages: 'English, Arabic',
    qualifications: 'MD, Board Certified (8+ yrs exp)',
    availableDays: 'Mon, Wed, Fri',
    phone: '+971 50 234 5678',
    email: 'doctor@alnoorclinic.ae',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    isActive: true
  });

  const specialties = [
    'All',
    'Dermatology & Aesthetic Medicine',
    'Injectable Facial Aesthetics & Anti-Aging',
    'Laser Rejuvenation & Pigmentation Therapy',
    'Clinical Dermatology & Hair Restoration'
  ];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = doc.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.licenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpec = selectedSpecialty === 'All' || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpec;
  });

  const openAddModal = () => {
    setEditingDoctor(null);
    setIsScanning(false);
    setScanSuccess(false);
    setFormData({
      fullName: '',
      licenceNumber: '',
      title: 'Specialist Dermatologist',
      specialty: 'Dermatology & Aesthetic Medicine',
      authority: 'DHA',
      licenceExpiry: '2028-12-31',
      consultationFee: '350',
      languages: 'English, Arabic',
      qualifications: 'MD, Board Certified Aesthetic Medicine (8 yrs exp)',
      availableDays: 'Mon, Tue, Thu',
      phone: '+971 50 987 6543',
      email: 'doctor@alnoorclinic.ae',
      photo: 'https://images.unsplash.com/photo-1594824813587-106579d4ff83?w=400&auto=format&fit=crop&q=80',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setIsScanning(false);
    setScanSuccess(false);
    setFormData({
      fullName: doc.fullName,
      licenceNumber: doc.licenceNumber,
      title: doc.title,
      specialty: doc.specialty,
      authority: doc.authority,
      licenceExpiry: doc.licenceExpiry,
      consultationFee: doc.consultationFee.toString(),
      languages: doc.languages,
      qualifications: doc.qualifications,
      availableDays: doc.availableDays,
      phone: doc.phone,
      email: doc.email,
      photo: doc.photo,
      isActive: doc.isActive
    });
    setIsModalOpen(true);
  };

  // Simulate AI parsing of Doctor's DHA / DoH Medical License
  const handleSimulateLicenseScan = () => {
    setIsScanning(true);
    setScanSuccess(false);

    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setFormData(prev => ({
        ...prev,
        fullName: 'Dr. Tariq Al Hashemi',
        licenceNumber: 'DHA-P-0089214',
        title: 'Consultant Dermatologist & Laser Surgeon',
        specialty: 'Dermatology & Aesthetic Medicine',
        authority: 'DHA',
        licenceExpiry: '2028-10-15'
      }));
    }, 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      consultationFee: parseFloat(formData.consultationFee || 0)
    };

    if (editingDoctor) {
      updateDoctor(editingDoctor.id, payload);
    } else {
      addDoctor(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Doctors & Clinical Team
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your licensed healthcare practitioners. Upload medical practice licenses to auto-extract credentials with AI.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e7e1d7] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name, DHA licence no, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Specialty:</span>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          >
            {specialties.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
              doc.isActive ? 'border-[#e7e1d7] hover:border-[#137333]' : 'border-gray-200 opacity-75'
            }`}
          >
            <div>
              {/* Doctor Header */}
              <div className="flex items-start gap-3.5">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                  <img src={doc.photo} alt={doc.fullName} className="w-full h-full object-cover" />
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    doc.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {doc.fullName}
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium truncate mt-0.5">
                    {doc.title}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {doc.specialty}
                  </p>
                </div>
              </div>

              {/* Verified Credentials Pills */}
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-600 bg-[#F7F4EE] px-3 py-1.5 rounded-lg">
                  <span className="text-[11px] font-medium text-gray-500">Licence ({doc.authority}):</span>
                  <span className="font-mono font-bold text-gray-900 text-[11px]">{doc.licenceNumber}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>Consultation Fee:</span>
                  <span className="font-bold text-[#0d281e]">AED {doc.consultationFee}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>Languages:</span>
                  <span className="font-medium text-gray-700">{doc.languages}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span>Licence Valid Until:</span>
                  <span className="text-emerald-700 font-semibold">{doc.licenceExpiry}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => toggleDoctorActive(doc.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  doc.isActive
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {doc.isActive ? 'Active (Open for Bookings)' : 'Inactive (Hidden)'}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(doc)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                  title="Edit doctor"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteDoctor(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Remove doctor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#0d281e] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">
                    {editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor to Clinic'}
                  </h3>
                  <p className="text-emerald-200 text-xs">
                    Auto-fill verified credentials using AI License Scanning.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TOP ACTION: AI License Scanner */}
              {!editingDoctor && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        AI Doctor Licence Parser
                      </span>
                    </div>
                    {scanSuccess && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Filled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800">
                    Upload or scan doctor's DHA / DoH medical practice licence card to auto-fill verified credentials below in seconds.
                  </p>
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleSimulateLicenseScan}
                    className="w-full py-2.5 bg-[#0d281e] hover:bg-[#153f2f] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {isScanning ? (
                      <>
                        <Cpu className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>AI Scanning License & Extracting Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-emerald-300" />
                        <span>Upload & Auto-Fill from Doctor Licence (PDF/Photo)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* SECTION 1 (AUTO-EXTRACTED FIRST) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    1. Auto-Extracted Regulatory Credentials (First Priority)
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Verified from Licence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Doctor Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Dr. Tariq Al Hashemi"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Medical Licence Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.licenceNumber}
                      onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                      placeholder="e.g. DHA-P-0089214"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Professional Title / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Consultant Dermatologist"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Primary Specialty *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="e.g. Dermatology & Aesthetic Medicine"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Licensing Authority
                    </label>
                    <select
                      value={formData.authority}
                      onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    >
                      <option value="DHA">Dubai Health Authority (DHA)</option>
                      <option value="DOH">Department of Health Abu Dhabi (DOH)</option>
                      <option value="MOHAP">Ministry of Health & Prevention (MOHAP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Licence Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.licenceExpiry}
                      onChange={(e) => setFormData({ ...formData, licenceExpiry: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 (CLINIC MANUAL FIELDS BELOW) */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    2. Clinic Practice Details (Manual Inputs Below)
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">Clinic Custom</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Consultation Fee (AED) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.consultationFee}
                      onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                      placeholder="e.g. 350"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Spoken Languages
                    </label>
                    <input
                      type="text"
                      value={formData.languages}
                      onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                      placeholder="e.g. English, Arabic, French"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Available Days / Weekly Schedule
                    </label>
                    <input
                      type="text"
                      value={formData.availableDays}
                      onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                      placeholder="e.g. Mon, Wed, Fri (9am - 5pm)"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qualifications & Experience Summary
                  </label>
                  <textarea
                    rows={2}
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                    placeholder="e.g. MD Dermatologist, Harvard Fellow, 12 years aesthetic experience"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{editingDoctor ? 'Update Doctor' : 'Save & Verify Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
