import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  MessageSquare, Mail, Phone, Calendar, Clock, CheckCircle2,
  AlertCircle, Send, Plus, Search, Filter, MessageCircle, ExternalLink,
  ChevronDown, User, Tag, ArrowRight, X, FileText
} from 'lucide-react';

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
    new: "bg-amber-100 text-amber-800 border-amber-300",
    contacted: "bg-blue-100 text-blue-800 border-blue-300",
    booked: "bg-emerald-100 text-emerald-800 border-emerald-300",
    closed: "bg-gray-100 text-gray-700 border-gray-300"
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Patient Enquiries & Bookings
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Incoming treatment requests and consultation enquiries from customers browsing ONSTA. Contact directly via WhatsApp or Email.
          </p>
        </div>

        {/* Actions & Live Leads */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              if (addCustomerEnquiry) {
                const samplePatients = [
                  { name: "Mariam Al Suwaidi", service: "Candela GentleMax Pro Full Legs Laser", phone: "+971 50 456 7890", note: "Need consultation regarding laser session schedule before wedding." },
                  { name: "Rashid Bin Butti", service: "PRP Hair Restoration Consultation", phone: "+971 55 987 6543", note: "Interested in PRP therapy for hair thinning." },
                  { name: "Elena Rostova", service: "Hydrafacial MD Deluxe Treatment", phone: "+971 52 111 2233", note: "Looking for an appointment this Thursday afternoon." }
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
            className="px-3.5 py-1.5 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>⚡ Simulate Inbound Lead from onsta.ae</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{enquiries.filter(e => e.status === 'new').length} New Enquiries</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{enquiries.filter(e => e.status === 'booked').length} Bookings</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#e7e1d7] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, phone, or service..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['All', 'new', 'contacted', 'booked', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                selectedStatus === st
                  ? "bg-[#0d281e] text-white font-semibold shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {st === 'new' ? 'New (Action Needed)' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Enquiries Layout: Left List & Right Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Enquiries List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#e7e1d7] shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Inbox ({filteredEnquiries.length})
            </span>
            <span className="text-[11px] text-gray-400">Click to view & contact</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredEnquiries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
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
                        ? "bg-emerald-50/70 border-l-4 border-l-[#0d281e]"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-900 font-serif">
                          {enq.patientName}
                        </strong>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColors[enq.status]}`}>
                          {enq.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {enq.createdAt}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-emerald-800 mt-1 line-clamp-1">
                      {enq.requestedService}
                    </p>

                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      "{enq.message}"
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{enq.preferredDate} ({enq.preferredTime})</span>
                      </span>
                      <span className="font-mono text-gray-600">{enq.phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Enquiry Communication & Management Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e7e1d7] shadow-sm p-6 sm:p-7 flex flex-col justify-between h-[700px] overflow-y-auto">
          {current ? (
            <div className="space-y-6">
              {/* Header: Patient Info & Quick Contact Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold font-serif text-gray-900">
                      {current.patientName}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${statusColors[current.status]}`}>
                      {current.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-600">
                    <span className="font-mono font-medium">{current.phone}</span>
                    <span>•</span>
                    <span>{current.email}</span>
                    <span>•</span>
                    <span className="text-gray-400">{current.createdAt}</span>
                  </div>
                </div>

                {/* DIRECT CHANNELS: WhatsApp, Email, Phone */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* WhatsApp Direct */}
                  <button
                    onClick={() => handleOpenWhatsApp(current)}
                    className="px-3.5 py-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1fb355] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Open WhatsApp chat with prefilled reply"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Email Direct */}
                  <button
                    onClick={() => handleOpenEmailModal(current)}
                    className="px-3.5 py-2 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Draft email response"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Patient</span>
                  </button>

                  {/* Direct Dial */}
                  <a
                    href={`tel:${current.phone}`}
                    className="p-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Call Patient"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Status Selector Strip */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-gray-700">Enquiry Status:</span>
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
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        current.status === s.id
                          ? 'bg-[#0d281e] text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requested Treatment Details */}
              <div className="p-4 bg-[#FCFAF6] rounded-xl border border-[#e7e1d7] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Requested Treatment
                </span>
                <h4 className="text-sm font-bold text-gray-900">
                  {current.requestedService}
                </h4>
                <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Preferred Date: <strong>{current.preferredDate}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Time: <strong>{current.preferredTime}</strong></span>
                  </span>
                </div>
              </div>

              {/* Customer Inquiry Message */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Patient Message / Notes
                </span>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed italic">
                  "{current.message}"
                </div>
              </div>

              {/* Follow-up Notes History */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                  Internal Follow-Up Log ({current.notes?.length || 0})
                </span>

                {current.notes && current.notes.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {current.notes.map((n, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs flex items-start justify-between gap-3">
                        <span className="text-gray-800">{n.text}</span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">{n.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No follow-up notes logged yet. Contact patient or add a clinical note below.
                  </p>
                )}

                {/* Add Note Form */}
                <form onSubmit={handleAddNoteSubmit} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add follow-up note (e.g. 'Confirmed appointment for Thursday 4:30 PM')..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f] transition-colors"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select an enquiry from the left list to view details and contact the patient.
            </div>
          )}
        </div>
      </div>

      {/* In-App Email Response Modal */}
      {showEmailModal && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
            <div className="p-6 bg-[#0d281e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-serif">Compose Email to {current.patientName}</h3>
                <p className="text-xs text-emerald-300">Direct response via clinic mail</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  readOnly
                  value={`${current.patientName} <${current.email}>`}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailDraft.subject}
                  onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body</label>
                <textarea
                  rows={8}
                  value={emailDraft.message}
                  onChange={(e) => setEmailDraft({ ...emailDraft, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e] font-sans leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailDraft}
                  className="px-5 py-2 rounded-xl bg-[#0d281e] text-white font-semibold hover:bg-[#153f2f] flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
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
