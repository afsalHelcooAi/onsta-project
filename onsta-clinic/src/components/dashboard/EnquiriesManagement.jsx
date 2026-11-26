import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import FaIcon from '../common/FaIcon';

export default function EnquiriesManagement() {
  const { enquiries, updateEnquiryStatus, addEnquiryNote, deleteEnquiry, clinicData, showToast, addCustomerEnquiry } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeEnquiry, setActiveEnquiry] = useState(enquiries[0] || null);
  const [noteInput, setNoteInput] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ subject: '', message: '' });

  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch = enq.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          enq.phone.includes(searchTerm) ||
                          enq.requestedService.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          enq.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || enq.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Current selected enquiry details
  const current = enquiries.find(e => e.id === activeEnquiry?.id) || filteredEnquiries[0] || null;

  // WhatsApp Contact Helper
  const handleOpenWhatsApp = (enquiry) => {
    // Clean phone number (strip spaces, +, -, etc.)
    const cleanPhone = enquiry.phone.replace(/[^0-9]/g, '');
    const clinicName = clinicData.displayName || "Al Noor Clinic";
    const text = encodeURIComponent(
      `Hello ${enquiry.patientName}, thank you for contacting ${clinicName} via ONSTA regarding "${enquiry.requestedService}". We would be delighted to assist you with your booking. How can we help you today?`
    );
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(whatsappUrl, '_blank');

    // Automatically update status to 'contacted' if it was 'new'
    if (enquiry.status === 'new') {
      updateEnquiryStatus(enquiry.id, 'contacted');
      addEnquiryNote(enquiry.id, 'Initiated WhatsApp conversation with patient.');
    }
  };

  // Email Contact Helper
  const handleOpenEmailModal = (enquiry) => {
    const clinicName = clinicData.displayName || "Al Noor Clinic";
    setEmailDraft({
      subject: `Regarding your inquiry for ${enquiry.requestedService} - ${clinicName}`,
      message: `Dear ${enquiry.patientName},\n\nThank you for reaching out to ${clinicName} via the ONSTA Healthcare Portal regarding ${enquiry.requestedService}.\n\nWe have received your requested date (${enquiry.preferredDate} at ${enquiry.preferredTime}). Our clinical coordinator would like to confirm your booking and answer any questions you may have.\n\nPlease feel free to reply to this email or reach us directly at ${clinicData.contactPhone}.\n\nWarm regards,\n${clinicName} Patient Care Team`
    });
    setShowEmailModal(true);
  };

  const handleSendEmailDraft = () => {
    if (!current) return;
    const mailto = `mailto:${current.email}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.message)}`;
    window.open(mailto, '_blank');
    setShowEmailModal(false);

    if (current.status === 'new') {
      updateEnquiryStatus(current.id, 'contacted');
    }
    addEnquiryNote(current.id, `Sent email response: "${emailDraft.subject}"`);
    showToast("success", "Email Dispatched", `Email client opened for ${current.patientName}.`);
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!current || !noteInput.trim()) return;
    addEnquiryNote(current.id, noteInput);
    setNoteInput('');
  };

  const statusColors = {
    new: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
    contacted: 'bg-[#F0E6F6] text-[#6B3B66] border-[#DECBE9]',
    booked: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
    closed: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="bg-white rounded-3xl border border-[#EAE0F2] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center flex-shrink-0">
            <FaIcon icon="fa-solid fa-calendar-check" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-[#1E1B2E] tracking-tight">
              Patient Enquiries & Bookings
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Incoming consultation requests from onsta.ae. Contact patients directly via WhatsApp or Email.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              if (addCustomerEnquiry) {
                const samplePatients = [
                  { name: 'Mariam Al Suwaidi', service: 'Candela GentleMax Pro Full Legs Laser', phone: '+971 50 456 7890', note: 'Need consultation regarding laser session schedule before wedding.' },
                  { name: 'Rashid Bin Butti', service: 'PRP Hair Restoration Consultation', phone: '+971 55 987 6543', note: 'Interested in PRP therapy for hair thinning.' },
                  { name: 'Elena Rostova', service: 'Hydrafacial MD Deluxe Treatment', phone: '+971 52 111 2233', note: 'Looking for an appointment this Thursday afternoon.' }
                ];
                const pick = samplePatients[Math.floor(Math.random() * samplePatients.length)];
                addCustomerEnquiry({
                  patientName: pick.name,
                  requestedService: pick.service,
                  phone: pick.phone,
                  message: pick.note
                });
              }
            }}
            className="px-4 py-2 rounded-full bg-[#6B3B66] text-white hover:bg-[#552B51] text-xs alata-regular flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FaIcon icon="fa-solid fa-bolt" className="text-[11px]" />
            <span>Simulate Inbound Lead</span>
          </button>

          <span className="px-3 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] text-xs alata-regular flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-ping" />
            <span>{enquiries.filter(e => e.status === 'new').length} New</span>
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs alata-regular flex items-center gap-1.5">
            <FaIcon icon="fa-solid fa-circle-check" />
            <span>{enquiries.filter(e => e.status === 'booked').length} Bookings</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE0F2] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <FaIcon icon="fa-solid fa-magnifying-glass" className="text-xs text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, phone, or service..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#1E1B2E] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#6B3B66]/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['All', 'new', 'contacted', 'booked', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs alata-regular capitalize transition-colors ${
                selectedStatus === st
                  ? 'bg-[#6B3B66] text-white shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:border-[#DECBE9] hover:text-[#6B3B66]'
              }`}
            >
              {st === 'new' ? 'New (Action Needed)' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Enquiries Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Enquiries List */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EAE0F2] shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-[#F6F0FA] border-b border-[#EAE0F2] flex items-center justify-between">
            <span className="text-xs alata-regular uppercase tracking-wider text-[#552B51]">
              Inbox ({filteredEnquiries.length})
            </span>
            <span className="text-[11px] text-[#64748B]">Click to view & contact</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F1EDF6]">
            {filteredEnquiries.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs">
                No patient enquiries match the selected filter.
              </div>
            ) : (
              filteredEnquiries.map((enq) => {
                const isSelected = current?.id === enq.id;
                return (
                  <div
                    key={enq.id}
                    onClick={() => setActiveEnquiry(enq)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#F6F0FA] border-l-4 border-l-[#6B3B66]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm alata-regular text-[#1E1B2E]">
                          {enq.patientName}
                        </strong>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] alata-regular border uppercase tracking-wider ${statusColors[enq.status]}`}>
                          {enq.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">
                        {enq.createdAt}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#6B3B66] mt-1 line-clamp-1">
                      {enq.requestedService}
                    </p>

                    <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                      "{enq.message}"
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span className="flex items-center gap-1.5">
                        <FaIcon icon="fa-regular fa-calendar" />
                        <span>{enq.preferredDate} ({enq.preferredTime})</span>
                      </span>
                      <span className="font-medium text-[#475569]">{enq.phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Enquiry Communication Workspace */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EAE0F2] shadow-sm p-6 sm:p-7 flex flex-col justify-between h-[700px] overflow-y-auto">
          {current ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#F1EDF6]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl alata-regular text-[#1E1B2E]">
                      {current.patientName}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular border uppercase tracking-wider ${statusColors[current.status]}`}>
                      {current.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#64748B]">
                    <span className="font-medium text-[#1E1B2E]">{current.phone}</span>
                    <span>•</span>
                    <span>{current.email}</span>
                    <span>•</span>
                    <span className="text-[#94A3B8]">{current.createdAt}</span>
                  </div>
                </div>

                {/* DIRECT CHANNELS: WhatsApp, Email, Phone */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenWhatsApp(current)}
                    className="px-4 py-2 rounded-full bg-[#25D366] text-white hover:bg-[#1fb355] text-xs alata-regular flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Open WhatsApp chat with prefilled reply"
                  >
                    <FaIcon icon="fa-brands fa-whatsapp" className="text-sm" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleOpenEmailModal(current)}
                    className="px-4 py-2 rounded-full bg-[#6B3B66] text-white hover:bg-[#552B51] text-xs alata-regular flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Draft email response"
                  >
                    <FaIcon icon="fa-solid fa-envelope" />
                    <span>Email Patient</span>
                  </button>

                  <a
                    href={`tel:${current.phone}`}
                    className="w-9 h-9 rounded-full border border-[#DECBE9] text-[#6B3B66] hover:bg-[#F6F0FA] flex items-center justify-center transition-colors"
                    title="Call Patient"
                  >
                    <FaIcon icon="fa-solid fa-phone" className="text-xs" />
                  </a>
                </div>
              </div>

              {/* Status Selector Strip */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="alata-regular text-[#1E1B2E]">Enquiry Status:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'new', label: 'New' },
                    { id: 'contacted', label: 'Contacted' },
                    { id: 'booked', label: 'Booked' },
                    { id: 'closed', label: 'Closed' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateEnquiryStatus(current.id, s.id)}
                      className={`px-3.5 py-1 rounded-full text-xs alata-regular capitalize transition-all ${
                        current.status === s.id
                          ? 'bg-[#6B3B66] text-white shadow-xs'
                          : 'bg-white text-[#64748B] hover:bg-[#F6F0FA] border border-[#E2E8F0]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requested Treatment Details */}
              <div className="p-4 bg-[#F6F0FA] rounded-2xl border border-[#EAE0F2] space-y-2">
                <span className="text-[10px] alata-regular uppercase tracking-wider text-[#6B3B66] block">
                  Requested Treatment
                </span>
                <h4 className="text-sm alata-regular text-[#1E1B2E]">
                  {current.requestedService}
                </h4>
                <div className="flex items-center gap-4 text-xs text-[#475569] pt-1">
                  <span className="flex items-center gap-1.5">
                    <FaIcon icon="fa-regular fa-calendar" className="text-[#6B3B66]" />
                    <span>Preferred Date: <strong className="text-[#1E1B2E]">{current.preferredDate}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FaIcon icon="fa-regular fa-clock" className="text-[#6B3B66]" />
                    <span>Time: <strong className="text-[#1E1B2E]">{current.preferredTime}</strong></span>
                  </span>
                </div>
              </div>

              {/* Customer Inquiry Message */}
              <div className="space-y-1.5">
                <span className="text-xs alata-regular uppercase tracking-wider text-[#64748B]">
                  Patient Message / Notes
                </span>
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs text-[#1E1B2E] leading-relaxed italic">
                  "{current.message}"
                </div>
              </div>

              {/* Follow-up Notes History */}
              <div className="space-y-3 pt-2 border-t border-[#F1EDF6]">
                <span className="text-xs alata-regular uppercase tracking-wider text-[#1E1B2E] block">
                  Internal Follow-Up Log ({current.notes?.length || 0})
                </span>

                {current.notes && current.notes.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {current.notes.map((n, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-start justify-between gap-3">
                        <span className="text-[#1E1B2E]">{n.text}</span>
                        <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">{n.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">
                    No follow-up notes logged yet. Contact patient or add a clinical note below.
                  </p>
                )}

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add follow-up note (e.g. 'Confirmed appointment for Thursday 4:30 PM')..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-[#6B3B66] text-white text-xs alata-regular hover:bg-[#552B51] transition-colors shadow-sm"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm">
              Select an enquiry from the left list to view details and contact the patient.
            </div>
          )}
        </div>
      </div>

      {/* In-App Email Response Modal */}
      {showEmailModal && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1320]/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#EAE0F2]">
            <div className="p-6 bg-[#1A1320] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg alata-regular">Compose Email to {current.patientName}</h3>
                <p className="text-xs text-[#C7B0D8]">Direct response via clinic mail</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-white/70 hover:text-white">
                <FaIcon icon="fa-solid fa-xmark" className="text-base" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">To</label>
                <input
                  type="text"
                  readOnly
                  value={`${current.patientName} <${current.email}>`}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">Subject</label>
                <input
                  type="text"
                  value={emailDraft.subject}
                  onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B2E] mb-1">Message Body</label>
                <textarea
                  rows={8}
                  value={emailDraft.message}
                  onChange={(e) => setEmailDraft({ ...emailDraft, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-[#6B3B66]/30 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#F1EDF6]">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailDraft}
                  className="px-5 py-2 rounded-full bg-[#6B3B66] text-white alata-regular hover:bg-[#552B51] flex items-center gap-1.5"
                >
                  <FaIcon icon="fa-solid fa-paper-plane" />
                  <span>Send via Email Client</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
