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
import DoctorAvatar from '../common/DoctorAvatar';
import FaIcon from '../common/FaIcon';

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
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

  const getLanguageTags = (langStr) => {
    const items = (langStr || 'English, Arabic').split(',').map((s) => s.trim()).filter(Boolean);
    return items.slice(0, 3).map((lang) => {
      const lower = lang.toLowerCase();
      if (lower.includes('arab')) return { code: 'AR', label: 'Arabic' };
      if (lower.includes('eng')) return { code: 'EN', label: 'English' };
      if (lower.includes('russ')) return { code: 'RU', label: 'Russian' };
      if (lower.includes('fren')) return { code: 'FR', label: 'French' };
      if (lower.includes('hindi') || lower.includes('urdu')) return { code: 'HI', label: lang };
      return { code: lang.slice(0, 2).toUpperCase(), label: lang };
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Actions */}
      <div className="bg-white rounded-3xl border border-[#EAE0F2] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center flex-shrink-0">
            <FaIcon icon="fa-solid fa-user-doctor" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-[#1E1B2E] tracking-tight">
              Our Doctors & Clinical Team
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage licensed medical practitioners. Upload practice licences to auto-extract credentials instantly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white hover:bg-[#552B51] text-xs alata-regular flex items-center gap-2 transition-all shadow-sm hover:shadow-md self-start sm:self-center"
        >
          <FaIcon icon="fa-solid fa-plus" className="text-xs" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EAE0F2] shadow-sm">
        <div className="relative flex-1">
          <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name, DHA licence no, or treatment service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#1E1B2E] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] font-medium">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66] max-w-[220px]"
            >
              {serviceFilterOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-[#F6F0FA] p-1 rounded-xl border border-[#EAE0F2]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-[#6B3B66]' : 'text-[#94A3B8] hover:text-[#1E1B2E]'
              }`}
              title="Cards view"
            >
              <FaIcon icon="fa-solid fa-grip" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[#6B3B66]' : 'text-[#94A3B8] hover:text-[#1E1B2E]'
              }`}
              title="Table view"
            >
              <FaIcon icon="fa-solid fa-list" />
            </button>
          </div>
        </div>
      </div>

      {/* Doctors List: Cards View (Polyclinic.ae Inspiration) or Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl border border-[#EAE0F2] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F0FA] border-b border-[#EAE0F2] text-[#552B51] alata-regular uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Doctor / Specialist</th>
                  <th className="py-3.5 px-4">Authority & Licence</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Assigned Service</th>
                  <th className="py-3.5 px-4">Consultation Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EDF6]">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                          <DoctorAvatar photo={doc.photo} name={doc.fullName} className="w-10 h-10" iconSize="text-sm" />
                        </div>
                        <div>
                          <div className="alata-regular text-[#1E1B2E] text-sm">{doc.fullName}</div>
                          <div className="text-[11px] text-[#6B3B66] font-medium">{doc.title || doc.specialty}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="alata-regular text-[#1E1B2E] bg-[#F8FAFC] px-2.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[11px]">
                        {doc.licenceNumber}
                      </span>
                      <div className="text-[10px] text-[#64748B] mt-0.5">{doc.authority || 'DHA'} Licensed</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={doc.service || ''}
                        onChange={(e) => handleServiceChange(doc, e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#DECBE9] font-medium text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {clinicServiceNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 alata-regular text-[#6B3B66] text-sm">
                      {doc.consultationFee ? `${doc.consultationFee} AED` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc)}
                        className={`text-[11px] alata-regular px-3 py-1 rounded-full transition-colors ${
                          doc.isActive
                            ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                            : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="w-8 h-8 rounded-xl text-[#64748B] hover:text-[#6B3B66] hover:bg-[#F6F0FA] flex items-center justify-center transition-colors"
                          title="Edit doctor"
                        >
                          <FaIcon icon="fa-solid fa-pen-to-square" className="text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                          title="Delete doctor"
                        >
                          <FaIcon icon="fa-solid fa-trash-can" className="text-xs" />
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
        /* Doctors Grid (Polyclinic.ae Luxury Card Style) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => {
            const langTags = getLanguageTags(doc.languages);
            return (
              <div
                key={doc.id}
                className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  doc.isActive ? 'border-[#EAE0F2] hover:border-[#DECBE9]' : 'border-[#E2E8F0] opacity-75'
                }`}
              >
                <div>
                  {/* Top Portrait & Language Tags (Inspired by Polyclinic.ae Screenshot 3) */}
                  <div className="relative rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] p-4 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                      <DoctorAvatar photo={doc.photo} name={doc.fullName} className="w-full h-full" iconSize="text-xl" />
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          doc.isActive ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        {langTags.map((lt) => (
                          <span
                            key={lt.code}
                            title={lt.label}
                            className="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-[9px] alata-regular text-[#475569]"
                          >
                            {lt.code}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-base alata-regular text-[#1E1B2E] truncate">
                        {doc.fullName}
                      </h3>
                      <p className="text-xs text-[#64748B] truncate mt-0.5">
                        {doc.title || 'Medical Specialist'}
                      </p>
                      <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-[#F0E6F6] text-[#6B3B66] text-[10px] alata-regular truncate max-w-full">
                        {doc.specialty}
                      </span>
                    </div>
                  </div>

                  {/* Verified Credentials & Service Details */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between bg-[#F6F0FA] px-3.5 py-2 rounded-xl border border-[#EAE0F2]">
                      <span className="text-[11px] font-medium text-[#64748B]">
                        <FaIcon icon="fa-solid fa-id-card-clip" className="mr-1.5 text-[#6B3B66]" />
                        {doc.authority || 'DHA'} Licence
                      </span>
                      <span className="alata-regular text-[#1E1B2E] text-[11px]">{doc.licenceNumber}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="font-medium text-[#64748B]">Assigned Service</span>
                      <select
                        value={doc.service || ''}
                        onChange={(e) => handleServiceChange(doc, e.target.value)}
                        className="text-[11px] py-1 px-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-[#1E1B2E] max-w-[175px] truncate focus:outline-none focus:ring-1 focus:ring-[#6B3B66]"
                      >
                        <option value="">Unassigned</option>
                        {clinicServiceNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-[#64748B]">Consultation Fee</span>
                      <span className="alata-regular text-[#6B3B66] text-xs">{doc.consultationFee} AED</span>
                    </div>

                    {doc.licenceExpiry && (
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="text-[#64748B]">Valid Until</span>
                        <span className="alata-regular text-[#166534]">{doc.licenceExpiry}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-[#F1EDF6] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(doc)}
                    className={`text-[11px] alata-regular px-3 py-1 rounded-full transition-colors ${
                      doc.isActive
                        ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {doc.isActive ? 'Active on onsta.ae' : 'Hidden'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(doc)}
                      className="w-8 h-8 rounded-xl text-[#64748B] hover:text-[#6B3B66] hover:bg-[#F6F0FA] flex items-center justify-center transition-colors"
                      title="Edit doctor"
                    >
                      <FaIcon icon="fa-solid fa-pen-to-square" className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                      title="Remove doctor"
                    >
                      <FaIcon icon="fa-solid fa-trash-can" className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredDoctors.length === 0 && (
        <div className="text-center py-14 bg-white rounded-3xl border border-[#EAE0F2] text-[#64748B]">
          <div className="w-14 h-14 rounded-2xl bg-[#F6F0FA] text-[#6B3B66] flex items-center justify-center mx-auto mb-3">
            <FaIcon icon="fa-solid fa-user-doctor" className="text-2xl" />
          </div>
          <p className="text-base alata-regular text-[#1E1B2E]">No doctors registered yet</p>
          <p className="text-xs text-[#64748B] mt-1">Click "Add New Doctor" to upload a DHA licence and register your clinical team.</p>
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A1320]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#EAE0F2] max-h-[92vh] flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#1A1320] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6B3B66] text-white flex items-center justify-center">
                  <FaIcon icon="fa-solid fa-user-doctor" className="text-sm" />
                </div>
                <div>
                  <h3 className="alata-regular text-base">
                    {editingDoctor ? 'Edit Doctor Profile' : 'Add Healthcare Practitioner'}
                  </h3>
                  <p className="text-[#C7B0D8] text-xs">
                    {modalStep === 1 ? 'Step 1: Upload doctor medical licence' : 'Step 2: Review auto-filled details'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
              >
                <FaIcon icon="fa-solid fa-xmark" className="text-base" />
              </button>
            </div>

            {/* Stepper Tabs */}
            {!editingDoctor && (
              <div className="grid grid-cols-2 gap-2 p-3 sm:px-6 sm:py-3 bg-[#F6F0FA] border-b border-[#EAE0F2] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  className={`rounded-xl px-3.5 py-2 text-left text-xs alata-regular flex items-center gap-2 transition ${
                    modalStep === 1
                      ? 'bg-[#6B3B66] text-white shadow-sm'
                      : scanResult
                      ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                      : 'bg-white text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] alata-regular ${
                    modalStep === 1 ? 'bg-white/20 text-white' : 'bg-[#F0E6F6] text-[#6B3B66]'
                  }`}>
                    {scanResult ? '✓' : '1'}
                  </span>
                  <span className="truncate">1. Licence Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (scanResult) setModalStep(2);
                  }}
                  disabled={!scanResult}
                  className={`rounded-xl px-3.5 py-2 text-left text-xs alata-regular flex items-center gap-2 transition ${
                    modalStep === 2
                      ? 'bg-[#6B3B66] text-white shadow-sm'
                      : scanResult
                      ? 'bg-white text-[#1E1B2E] hover:bg-[#F8FAFC] border border-[#EAE0F2]'
                      : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] alata-regular ${
                    modalStep === 2 ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
                  }`}>
                    2
                  </span>
                  <span className="truncate">2. Review & Details</span>
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div role="alert" className="mx-6 mt-4 p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2.5">
                <FaIcon icon="fa-solid fa-circle-exclamation" className="text-sm text-[#DC2626] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: License Upload Screen */}
            {modalStep === 1 && !editingDoctor && (
              <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] alata-regular uppercase tracking-wider text-[#6B3B66]">
                      AI Powered Registration
                    </span>
                    <h2 className="text-xl alata-regular text-[#1E1B2E] mt-0.5">
                      Upload Medical Practice Licence
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Upload the doctor's UAE healthcare professional licence (DHA, DoH Abu Dhabi, or MOHAP). Our AI scanner extracts credentials automatically.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={licenseInputRef}
                    onChange={handleLicenseFileUpload}
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                  />

                  <div
                    onClick={() => !isScanning && licenseInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                      isScanning
                        ? 'border-[#6B3B66] bg-[#F6F0FA] cursor-wait'
                        : scanResult
                        ? 'border-[#16A34A] bg-[#F0FDF4]'
                        : 'border-[#DECBE9] hover:border-[#6B3B66] hover:bg-[#F6F0FA]/60 bg-[#F8FAFC]'
                    }`}
                  >
                    {isScanning ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center">
                          <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-2xl" />
                        </div>
                        <div>
                          <p className="text-sm alata-regular text-[#1E1B2E]">
                            AI Analyzing Medical Licence...
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Extracting full name, licence number, specialty, and authority.
                          </p>
                        </div>
                      </div>
                    ) : scanResult ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                          <FaIcon icon="fa-solid fa-circle-check" className="text-2xl" />
                        </div>
                        <div>
                          <p className="text-sm alata-regular text-[#166534]">
                            Licence Successfully Analyzed!
                          </p>
                          <p className="text-xs text-[#15803D] mt-0.5">
                            {scannedFileName || 'Medical Licence File'} • {scanResult.authority || 'DHA'} Verified
                          </p>
                        </div>
                        <span className="text-xs text-[#64748B] underline pt-1">
                          Click to upload a different file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center border border-[#DECBE9]">
                          <FaIcon icon="fa-solid fa-cloud-arrow-up" className="text-xl" />
                        </div>
                        <div>
                          <p className="text-sm alata-regular text-[#1E1B2E]">
                            Drop licence document here, or <span className="text-[#6B3B66] underline">browse</span>
                          </p>
                          <p className="text-xs text-[#94A3B8] mt-1">
                            Supports PDF, JPEG, PNG • DHA, DoH, MOHAP Licences (Up to 15MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Test Option */}
                  <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5">
                      <FaIcon icon="fa-solid fa-wand-magic-sparkles" className="text-[#6B3B66] text-base" />
                      <div>
                        <p className="text-xs alata-regular text-[#1E1B2E]">Don't have a licence file handy?</p>
                        <p className="text-[11px] text-[#64748B]">Test the auto-fill flow with a sample DHA licence.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={handleSampleDhaLicense}
                      className="px-4 py-1.5 bg-white text-[#6B3B66] border border-[#DECBE9] hover:bg-[#F6F0FA] rounded-full text-xs alata-regular transition-colors disabled:opacity-50"
                    >
                      Try Sample Licence
                    </button>
                  </div>
                </div>

                {/* Footer buttons for Step 1 */}
                <div className="pt-4 border-t border-[#F1EDF6] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-[#E2E8F0] text-[#475569] text-xs font-medium hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>

                  {scanResult && (
                    <button
                      type="button"
                      onClick={() => setModalStep(2)}
                      className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] shadow-sm flex items-center gap-2 transition-all"
                    >
                      <span>Continue to Doctor Details</span>
                      <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Review & Add Remaining Details */}
            {(modalStep === 2 || editingDoctor) && (
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                {scanResult && !editingDoctor && (
                  <div className="p-3.5 rounded-2xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaIcon icon="fa-solid fa-circle-check" className="text-[#166534]" />
                      <span className="text-xs alata-regular text-[#166534]">
                        Auto-Extracted from {formData.authority || 'DHA'} Licence ({scannedFileName || 'Uploaded file'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="text-xs text-[#166534] hover:underline alata-regular"
                    >
                      Change Licence
                    </button>
                  </div>
                )}

                {scanWarning && (
                  <div className="p-3.5 rounded-2xl bg-[#FFEDD5] border border-[#FED7AA] text-xs text-[#9A3412] flex items-start gap-2.5">
                    <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[#C2410C] shrink-0 mt-0.5" />
                    <div>
                      <p className="alata-regular">Verification Notice</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{scanWarning}</p>
                    </div>
                  </div>
                )}

                {/* SECTION 1: ESSENTIAL REQUIRED FIELDS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F1EDF6]">
                    <h4 className="text-xs alata-regular uppercase tracking-wider text-[#1E1B2E] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#6B3B66]" />
                      Essential Details (Required)
                    </h4>
                    <span className="text-[10px] text-[#94A3B8] font-medium">* Required for discovery</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                        Doctor Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Dr. Sarah Al Mansoori"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                        Medical Licence Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.licenceNumber}
                        onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                        placeholder="e.g. DHA-P-0091823"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs alata-regular text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                        Primary Medical Specialty *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="e.g. Dermatology & Aesthetic Medicine"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                        Consultation Fee (AED) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.consultationFee}
                        onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                        placeholder="e.g. 350"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs alata-regular text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">
                        Assigned Service
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E1B2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 focus:border-[#6B3B66]"
                      >
                        <option value="">Unassigned (Assign now or later from roster)</option>
                        {clinicServiceNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: OPTIONAL PRACTICE & PROFILE DETAILS */}
                <div className="space-y-4 pt-2 border-t border-[#F1EDF6]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F1EDF6]">
                    <h4 className="text-xs alata-regular uppercase tracking-wider text-[#64748B] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#DECBE9]" />
                      Additional Profile Details (Optional)
                    </h4>
                    <span className="text-[10px] text-[#94A3B8]">Can be added anytime</span>
                  </div>

                  {/* Headshot Upload */}
                  <div className="flex items-center gap-4 p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 group">
                      <DoctorAvatar photo={formData.photo} name={formData.fullName} className="w-full h-full" iconSize="text-base" />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute inset-0 bg-[#1A1320]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Upload photo"
                      >
                        <FaIcon icon="fa-solid fa-camera" className="text-sm" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs alata-regular text-[#1E1B2E]">Doctor Headshot Photo</p>
                      <p className="text-[11px] text-[#64748B]">Professional portrait shown to patients.</p>
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
                        className="mt-1 text-xs alata-regular text-[#6B3B66] hover:underline inline-flex items-center gap-1.5"
                      >
                        <FaIcon icon="fa-solid fa-upload" className="text-[10px]" />
                        <span>Upload photo</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Professional Title / Designation
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Consultant Dermatologist"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Licensing Authority
                      </label>
                      <select
                        value={formData.authority}
                        onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      >
                        <option value="DHA">Dubai Health Authority (DHA)</option>
                        <option value="DOH">Department of Health Abu Dhabi (DOH)</option>
                        <option value="MOHAP">Ministry of Health & Prevention (MOHAP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Licence Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.licenceExpiry}
                        onChange={(e) => setFormData({ ...formData, licenceExpiry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Spoken Languages
                      </label>
                      <input
                        type="text"
                        value={formData.languages}
                        onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                        placeholder="e.g. English, Arabic, French"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Available Schedule
                      </label>
                      <input
                        type="text"
                        value={formData.availableDays}
                        onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                        placeholder="e.g. Mon, Wed, Fri"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+971 50 123 4567"
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1">
                      Qualifications Summary
                    </label>
                    <textarea
                      rows={2}
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                      placeholder="e.g. MD, Board Certified Dermatologist, 10+ years aesthetic medicine experience"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-[#F1EDF6] flex items-center justify-between flex-shrink-0">
                  {!editingDoctor ? (
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="text-xs text-[#64748B] hover:text-[#1E1B2E] alata-regular flex items-center gap-1.5"
                    >
                      <FaIcon icon="fa-solid fa-arrow-left" className="text-[11px]" />
                      <span>Back to Licence Upload</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-full border border-[#E2E8F0] text-[#475569] text-xs font-medium hover:bg-[#F8FAFC] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <FaIcon icon={isSubmitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-circle-check'} />
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
