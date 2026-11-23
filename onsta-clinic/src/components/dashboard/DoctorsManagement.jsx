import React, { useState, useEffect, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  scanDoctorLicense,
  fetchDoctors,
  createDoctor,
  updateDoctor as apiUpdateDoctor,
  deleteDoctor as apiDeleteDoctor,
  toggleDoctorStatus,
  uploadDoctorPhoto
} from '../../api/doctorApi';
import {
  UserCheck, Plus, Search, Edit2, Trash2, ShieldCheck, Mail,
  Phone, Calendar, Clock, DollarSign, X, Check, Globe, Award,
  Cpu, Sparkles, FileText, CheckCircle2, Upload, AlertCircle,
  Loader2, Camera, ChevronRight, ArrowLeft, LayoutGrid, List,
  Stethoscope
} from 'lucide-react';
import DoctorAvatar from '../common/DoctorAvatar';

export default function DoctorsManagement() {
  const {
    doctors = [],
    setDoctors,
    services = [],
    showToast
  } = useClinic();

  const token = localStorage.getItem('onsta_access_token');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1 = License Upload, 2 = Review & Details
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // AI Extraction state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannedFileName, setScannedFileName] = useState('');

  const licenseInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Form State - Only required fields: fullName, licenceNumber, specialty, consultationFee
  const [formData, setFormData] = useState({
    fullName: '',
    licenceNumber: '',
    title: '',
    specialty: '',
    service: '',
    authority: 'DHA',
    licenceExpiry: '',
    consultationFee: '',
    languages: 'English, Arabic',
    qualifications: '',
    availableDays: 'Mon, Wed, Fri',
    phone: '',
    email: '',
    photo: '',
    isActive: true
  });

  // Sync doctors on mount
  useEffect(() => {
    if (token) {
      fetchDoctors(token)
        .then((liveDocs) => {
          setDoctors(liveDocs || []);
        })
        .catch(() => {});
    }
  }, [token]);

  // Dynamic available services from clinic services catalogue & registered doctors
  const clinicServiceNames = Array.from(
    new Set([
      ...services.map((s) => s.name).filter(Boolean),
      ...doctors.map((d) => d.service).filter(Boolean),
    ])
  );
  const serviceFilterOptions = ['All', ...clinicServiceNames];

  const filteredDoctors = doctors.filter((doc) => {
    const nameStr = doc.fullName || '';
    const specStr = doc.specialty || '';
    const licStr = doc.licenceNumber || '';
    const servStr = doc.service || '';
    const matchesSearch =
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      specStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      licStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = selectedService === 'All' || (doc.service || '') === selectedService;
    return matchesSearch && matchesService;
  });

  // Direct Inline Service Changer for Doctor
  const handleServiceChange = async (doc, newService) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, service: newService } : d))
    );
    if (token) {
      try {
        await apiUpdateDoctor(doc.id, { service: newService }, token);
        showToast?.('success', 'Service Assigned', `Assigned "${newService || 'Unassigned'}" to ${doc.fullName}.`);
      } catch (err) {
        showToast?.('error', 'Update Failed', err.message);
      }
    } else {
      showToast?.('success', 'Service Assigned', `Assigned "${newService || 'Unassigned'}" to ${doc.fullName}.`);
    }
  };

  const openAddModal = () => {
    setEditingDoctor(null);
    setModalStep(1); // Start with License Upload
    setIsScanning(false);
    setScanResult(null);
    setScannedFileName('');
    setErrorMessage('');
    setScanWarning('');
    setSuccessNotice('');
    setFormData({
      fullName: '',
      licenceNumber: '',
      title: 'Specialist Physician',
      specialty: '',
      service: '',
      authority: 'DHA',
      licenceExpiry: '',
      consultationFee: '',
      languages: 'English, Arabic',
      qualifications: '',
      availableDays: 'Mon, Wed, Fri',
      phone: '',
      email: '',
      photo: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setModalStep(2); // Jump directly to Review & Edit Details
    setIsScanning(false);
    setScanResult(null);
    setScannedFileName('');
    setErrorMessage('');
    setScanWarning('');
    setSuccessNotice('');
    setFormData({
      fullName: doc.fullName || '',
      licenceNumber: doc.licenceNumber || '',
      title: doc.title || '',
      specialty: doc.specialty || '',
      service: doc.service || '',
      authority: doc.authority || 'DHA',
      licenceExpiry: doc.licenceExpiry || '',
      consultationFee: doc.consultationFee ? doc.consultationFee.toString() : '',
      languages: doc.languages || 'English, Arabic',
      qualifications: doc.qualifications || '',
      availableDays: doc.availableDays || 'Mon, Wed, Fri',
      phone: doc.phone || '',
      email: doc.email || '',
      photo: doc.photo || '',
      isActive: doc.isActive !== false
    });
    setIsModalOpen(true);
  };

  // Real File Upload & AI Document License Parser -> Auto-navigates to Review Step
  const handleLicenseFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);
    setErrorMessage('');
    setScannedFileName(file.name);

    try {
      const res = await scanDoctorLicense(file, token, editingDoctor?.id);
      const extracted = res.extracted || {};

      // Client-side instant duplicate check across existing roster
      const extractedLic = (extracted.licence_number || '').trim().toLowerCase();
      if (extractedLic) {
        const localDup = doctors.find(
          (d) => d.id !== editingDoctor?.id && (d.licenceNumber || '').trim().toLowerCase() === extractedLic
        );
        if (localDup) {
          throw new Error(
            `Duplicate license detected: Licence '${extracted.licence_number}' is already registered to ${localDup.fullName} in your clinic roster.`
          );
        }
      }

      setFormData((prev) => ({
        ...prev,
        fullName: extracted.full_name || prev.fullName,
        licenceNumber: extracted.licence_number || prev.licenceNumber,
        title: extracted.title || prev.title || 'Specialist Physician',
        specialty: extracted.specialty || prev.specialty || 'Dermatology & Aesthetic Medicine',
        authority: extracted.authority || prev.authority || 'DHA',
        licenceExpiry: extracted.licence_expiry || prev.licenceExpiry,
      }));

      setScanResult(extracted);
      const scanWarn = res.warning || extracted.warning;
      if (scanWarn) {
        setScanWarning(scanWarn);
        showToast?.('warning', 'License Parsed with Note', scanWarn);
      } else {
        setScanWarning('');
        showToast?.('success', 'License Parsed', `${extracted.authority || 'DHA'} license credentials extracted.`);
      }
      
      // Automatic transition to next tab (Review & Details) for optimal UX
      setTimeout(() => {
        setModalStep(2);
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Could not parse medical license file.');
      showToast?.('error', 'License Scan Failed', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Sample DHA License Quick-Fill for Testing -> Auto-navigates to Review Step
  const handleSampleDhaLicense = () => {
    setIsScanning(true);
    setErrorMessage('');
    setTimeout(() => {
      setIsScanning(false);
      // Ensure unique license number for sample testing if already in roster
      const baseLic = 'DHA-P-0091823';
      const isTaken = doctors.some(
        (d) => d.id !== editingDoctor?.id && (d.licenceNumber || '').trim().toLowerCase() === baseLic.toLowerCase()
      );
      const sampleLic = isTaken ? `DHA-P-00${Math.floor(10000 + Math.random() * 90000)}` : baseLic;

      const sample = {
        full_name: 'Dr. Sarah Al Mansoori',
        licence_number: sampleLic,
        title: 'Consultant Dermatologist & Laser Surgeon',
        specialty: 'Dermatology & Aesthetic Medicine',
        authority: 'DHA',
        licence_expiry: '2029-05-15',
        confidence: 0.95,
      };
      setFormData((prev) => ({
        ...prev,
        fullName: sample.full_name,
        licenceNumber: sample.licence_number,
        title: sample.title,
        specialty: sample.specialty,
        authority: sample.authority,
        licenceExpiry: sample.licence_expiry,
      }));
      setScanResult(sample);
      setScannedFileName('sample_dha_medical_license.pdf');
      showToast?.('success', 'Sample License Loaded', 'DHA credentials auto-filled.');
      
      // Auto-transition to Step 2
      setModalStep(2);
    }, 400);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editingDoctor && token) {
      try {
        const res = await uploadDoctorPhoto(editingDoctor.id, file, token);
        setFormData((prev) => ({ ...prev, photo: res.photo_url }));
        setDoctors((prev) =>
          prev.map((d) => (d.id === editingDoctor.id ? { ...d, photo: res.photo_url } : d))
        );
        showToast?.('success', 'Photo Updated', 'Doctor profile picture updated.');
      } catch (err) {
        showToast?.('error', 'Upload Failed', err.message);
      }
    } else {
      const localUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, photo: localUrl }));
    }
  };

  // Save / Update Doctor
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Doctor full name is required.');
      return;
    }
    if (!formData.licenceNumber.trim()) {
      setErrorMessage('Medical licence number is required.');
      return;
    }
    if (!formData.specialty.trim()) {
      setErrorMessage('Primary specialty is required.');
      return;
    }
    if (!formData.consultationFee) {
      setErrorMessage('Consultation fee is required.');
      return;
    }

    // Check duplicate doctor license across local clinic roster
    const cleanedLicence = formData.licenceNumber.trim().toLowerCase();
    const duplicate = doctors.find(
      (d) => d.id !== editingDoctor?.id && (d.licenceNumber || '').trim().toLowerCase() === cleanedLicence
    );
    if (duplicate) {
      setErrorMessage(
        `Duplicate Doctor License: '${formData.licenceNumber}' is already registered in your clinic for ${duplicate.fullName}.`
      );
      showToast?.('error', 'Duplicate License Detected', `License is already in use by ${duplicate.fullName}`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      consultationFee: parseFloat(formData.consultationFee || 0)
    };

    try {
      if (token) {
        if (editingDoctor) {
          await apiUpdateDoctor(editingDoctor.id, payload, token);
          setDoctors((prev) =>
            prev.map((d) => (d.id === editingDoctor.id ? { ...d, ...payload } : d))
          );
          showToast?.('success', 'Doctor Updated', `${payload.fullName} details updated.`);
        } else {
          const created = await createDoctor(payload, token);
          setDoctors((prev) => [created, ...prev]);
          showToast?.('success', 'Doctor Added', `${payload.fullName} registered successfully.`);
        }
      } else {
        // Fallback local state
        if (editingDoctor) {
          setDoctors((prev) =>
            prev.map((d) => (d.id === editingDoctor.id ? { ...d, ...payload } : d))
          );
        } else {
          const newDoc = {
            ...payload,
            id: `DOC-${Date.now()}`,
            isActive: true,
            verificationStatus: 'VERIFIED'
          };
          setDoctors((prev) => [newDoc, ...prev]);
        }
        showToast?.('success', 'Doctor Saved', `${payload.fullName} saved.`);
      }

      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save doctor.');
      showToast?.('error', 'Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Doctor Active / Inactive Status
  const handleToggleStatus = async (doc) => {
    const nextStatus = !doc.isActive;
    try {
      if (token) {
        await toggleDoctorStatus(doc.id, nextStatus, token);
      }
      setDoctors((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, isActive: nextStatus } : d))
      );
      showToast?.(
        'info',
        'Visibility Updated',
        `${doc.fullName} is now ${nextStatus ? 'active and visible on marketplace' : 'hidden from public view'}.`
      );
    } catch (err) {
      showToast?.('error', 'Status Update Failed', err.message);
    }
  };

  // Delete Doctor
  const handleDelete = async (doc) => {
    if (!confirm(`Are you sure you want to remove ${doc.fullName} from the clinic roster?`)) return;

    try {
      if (token) {
        await apiDeleteDoctor(doc.id, token);
      }
      setDoctors((prev) => prev.filter((d) => d.id !== doc.id));
      showToast?.('info', 'Doctor Removed', `${doc.fullName} removed from roster.`);
    } catch (err) {
      showToast?.('error', 'Deletion Failed', err.message);
    }
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
            Manage your licensed healthcare practitioners. Upload medical practice licenses to auto-extract credentials in seconds.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-center"
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
            placeholder="Search by doctor name, DHA licence no, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e] max-w-[220px]"
            >
              {serviceFilterOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[#0d281e]' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-[#0d281e]' : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Cards view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Doctors List: Table View or Cards View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-[#e7e1d7] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F4EE] border-b border-[#e7e1d7] text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Doctor / Specialist</th>
                  <th className="py-3.5 px-4">Authority & Licence</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Service</th>
                  <th className="py-3.5 px-4">Consultation Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                          <DoctorAvatar photo={doc.photo} name={doc.fullName} className="w-10 h-10" iconSize="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{doc.fullName}</div>
                          <div className="text-[11px] text-emerald-800 font-medium">{doc.title || doc.specialty}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-gray-800 bg-[#F7F4EE] px-2 py-0.5 rounded border border-gray-200/60 text-[11px]">
                        {doc.licenceNumber}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{doc.authority || 'DHA'} Licensed</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={doc.service || ''}
                        onChange={(e) => handleServiceChange(doc, e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0d281e] cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {clinicServiceNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0d281e]">
                      {doc.consultationFee ? `AED ${doc.consultationFee}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          doc.isActive
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit doctor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete doctor"
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
      ) : (
        /* Doctors Grid */
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
                    <DoctorAvatar photo={doc.photo} name={doc.fullName} className="w-full h-full" iconSize="w-5 h-5" />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        doc.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    />
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
                    <span className="text-[11px] font-medium text-gray-500">Licence ({doc.authority || 'DHA'}):</span>
                    <span className="font-mono font-bold text-gray-900 text-[11px]">{doc.licenceNumber}</span>
                  </div>

                  {/* Dropdown column/field for Service in Card view */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 py-1 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-700">Service:</span>
                    <select
                      value={doc.service || ''}
                      onChange={(e) => handleServiceChange(doc, e.target.value)}
                      className="text-xs py-1 px-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-800 max-w-[170px] truncate focus:outline-none focus:ring-1 focus:ring-[#0d281e]"
                    >
                      <option value="">Unassigned</option>
                      {clinicServiceNames.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                    <span>Consultation Fee:</span>
                    <span className="font-bold text-[#0d281e]">AED {doc.consultationFee}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                    <span>Languages:</span>
                    <span className="font-medium text-gray-700">{doc.languages}</span>
                  </div>

                  {doc.licenceExpiry && (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                      <span>Licence Valid Until:</span>
                      <span className="text-emerald-700 font-semibold">{doc.licenceExpiry}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(doc)}
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
                    type="button"
                    onClick={() => openEditModal(doc)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                    title="Edit doctor"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
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
      )}

      {filteredDoctors.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No doctors added yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add New Doctor" to upload a DHA license and register your clinical team.</p>
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0d281e] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">
                    {editingDoctor ? 'Edit Doctor Profile' : 'Add Healthcare Practitioner'}
                  </h3>
                  <p className="text-emerald-200 text-xs">
                    {modalStep === 1 ? 'Step 1: Upload doctor medical license' : 'Step 2: Review auto-filled details'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Tabs (Like Clinic Registration) */}
            {!editingDoctor && (
              <div className="grid grid-cols-2 gap-2 p-3 sm:px-6 sm:py-3 bg-[#F7F4EE] border-b border-[#e7e1d7] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 transition ${
                    modalStep === 1
                      ? 'bg-[#0d281e] text-white shadow-sm'
                      : scanResult
                      ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    modalStep === 1 ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {scanResult ? '✓' : '1'}
                  </span>
                  <span className="truncate">1. License Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (scanResult) setModalStep(2);
                  }}
                  disabled={!scanResult}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 transition ${
                    modalStep === 2
                      ? 'bg-[#0d281e] text-white shadow-sm'
                      : scanResult
                      ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    modalStep === 2 ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </span>
                  <span className="truncate">2. Review & Details</span>
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div role="alert" className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: License Upload Screen */}
            {modalStep === 1 && !editingDoctor && (
              <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      AI Powered Registration
                    </span>
                    <h2 className="text-xl font-serif font-bold text-gray-900 mt-0.5">
                      Upload Medical Practice License
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Upload the doctor's UAE healthcare professional license (DHA, DoH Abu Dhabi, or MOHAP). Our AI scanner will analyze the document, extract credentials, and advance you to review.
                    </p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={licenseInputRef}
                    onChange={handleLicenseFileUpload}
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                  />

                  {/* Large Drag & Drop Box */}
                  <div
                    onClick={() => !isScanning && licenseInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                      isScanning
                        ? 'border-emerald-500 bg-emerald-50/50 cursor-wait'
                        : scanResult
                        ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
                        : 'border-gray-300 hover:border-[#0d281e] hover:bg-gray-50/70 bg-[#FCFAF6]'
                    }`}
                  >
                    {isScanning ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="relative">
                          <Cpu className="w-12 h-12 text-emerald-600 animate-pulse" />
                          <Loader2 className="w-6 h-6 text-emerald-700 animate-spin absolute -top-1 -right-1" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            AI Analyzing Medical License...
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Extracting full name, license number, specialty, and authority.
                          </p>
                        </div>
                      </div>
                    ) : scanResult ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-950">
                            License Successfully Analyzed!
                          </p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            {scannedFileName || 'Medical License File'} • {scanResult.authority || 'DHA'} Verified
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 underline pt-1">
                          Click to upload a different file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            Drop license document here, or <span className="text-emerald-800 underline">browse</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Supports PDF, JPEG, PNG • DHA, DoH, MOHAP Licenses (Up to 15MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Test Option */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Don't have a license file handy?</p>
                        <p className="text-[11px] text-gray-500">Test the auto-fill flow with a sample DHA license.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={handleSampleDhaLicense}
                      className="px-3.5 py-1.5 bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/60 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <span>Try Sample License</span>
                    </button>
                  </div>
                </div>

                {/* Footer buttons for Step 1 */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  {scanResult && (
                    <button
                      type="button"
                      onClick={() => setModalStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <span>Continue to Doctor Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Review & Add Remaining Details */}
            {(modalStep === 2 || editingDoctor) && (
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* AI Extracted Banner */}
                {scanResult && !editingDoctor && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        Auto-Extracted from {formData.authority || 'DHA'} License ({scannedFileName || 'Uploaded file'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="text-xs text-emerald-800 hover:underline font-semibold"
                    >
                      Change License
                    </button>
                  </div>
                )}

                {/* Soft Warning Banner (e.g. facility reference note) */}
                {scanWarning && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-950">Verification Notice</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{scanWarning}</p>
                    </div>
                  </div>
                )}

                {/* SECTION 1: ESSENTIAL REQUIRED FIELDS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Essential Details (Required)
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium">* Required for discovery</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Doctor Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Dr. Sarah Al Mansoori"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Medical Licence Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.licenceNumber}
                        onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                        placeholder="e.g. DHA-P-0091823"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Primary Medical Specialty *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="e.g. Dermatology & Aesthetic Medicine"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Consultation Fee (AED) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.consultationFee}
                        onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                        placeholder="e.g. 350"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Assigned Service
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      >
                        <option value="">Unassigned (Assign now or later from table)</option>
                        {clinicServiceNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        You can also quickly assign or change doctor services directly using the dropdown in the Doctors list table.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: OPTIONAL PRACTICE & PROFILE DETAILS */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      Additional Profile Details (Optional)
                    </h4>
                    <span className="text-[10px] text-gray-400">Can be added anytime</span>
                  </div>

                  {/* Headshot Upload */}
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0 group">
                      <DoctorAvatar photo={formData.photo} name={formData.fullName} className="w-full h-full" iconSize="w-5 h-5" />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Upload photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">Doctor Headshot Photo</p>
                      <p className="text-[11px] text-gray-500">Professional portrait shown to patients.</p>
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="mt-0.5 text-xs font-semibold text-[#0d281e] hover:underline flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload photo</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Professional Title / Designation
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Consultant Dermatologist"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Licensing Authority
                      </label>
                      <select
                        value={formData.authority}
                        onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      >
                        <option value="DHA">Dubai Health Authority (DHA)</option>
                        <option value="DOH">Department of Health Abu Dhabi (DOH)</option>
                        <option value="MOHAP">Ministry of Health & Prevention (MOHAP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Licence Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.licenceExpiry}
                        onChange={(e) => setFormData({ ...formData, licenceExpiry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Available Schedule
                      </label>
                      <input
                        type="text"
                        value={formData.availableDays}
                        onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                        placeholder="e.g. Mon, Wed, Fri"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+971 50 123 4567"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Qualifications Summary
                    </label>
                    <textarea
                      rows={2}
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                      placeholder="e.g. MD, Board Certified Dermatologist, 10+ years aesthetic medicine experience"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                  {!editingDoctor ? (
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="text-xs text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to License Upload</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      )}
                      <span>{isSubmitting ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Save & Add Doctor'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
