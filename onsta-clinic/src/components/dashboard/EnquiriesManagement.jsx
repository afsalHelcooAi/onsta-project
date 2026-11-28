import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClinic } from '../../context/ClinicContext';
import AppIcon from '../common/AppIcon';
import ModalPortal from '../common/ModalPortal';

export default function EnquiriesManagement() {
  const { t } = useTranslation();
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
    showToast("success", t('enquiries.emailDispatchedTitle'), t('enquiries.emailDispatchedMsg', { name: current.patientName }));
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!current || !noteInput.trim()) return;
    addEnquiryNote(current.id, noteInput);
    setNoteInput('');
  };

  const statusColors = {
    new: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
    contacted: 'bg-theme-primary-soft text-theme-primary border-theme-border-strong',
    booked: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
    closed: 'bg-theme-surface-muted text-theme-muted border-theme-border-slate'
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
            <AppIcon name="calendar-check" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-theme-ink tracking-tight">
              {t('enquiries.title')}
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
              {t('enquiries.subtitle')}
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
            className="px-4 py-2 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center gap-1.5 shadow-sm transition-all"
          >
            <AppIcon name="bolt" className="text-[11px]" />
            <span>{t('enquiries.simulateLead')}</span>
          </button>

          <span className="px-3 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] text-xs alata-regular flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-ping" />
            <span>{t('enquiries.newCount', { count: enquiries.filter(e => e.status === 'new').length })}</span>
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs alata-regular flex items-center gap-1.5">
            <AppIcon name="check-circle" />
            <span>{t('enquiries.bookingsCount', { count: enquiries.filter(e => e.status === 'booked').length })}</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-theme-card rounded-2xl border border-theme-border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <AppIcon name="search" className="text-xs text-theme-subtle absolute start-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            dir="auto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('enquiries.searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface text-xs text-theme-ink focus:outline-none focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['All', 'new', 'contacted', 'booked', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs alata-regular capitalize transition-colors ${
                selectedStatus === st
                  ? 'bg-theme-primary text-white shadow-xs'
                  : 'bg-theme-surface text-theme-muted border border-theme-border-slate hover:border-theme-border-strong hover:text-theme-primary'
              }`}
            >
              {st === 'All' ? t('common.all') : st === 'new' ? t('enquiries.newActionNeeded') : t(`status.${st}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Enquiries Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Enquiries List */}
        <div className="lg:col-span-5 bg-theme-card rounded-3xl border border-theme-border shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-theme-canvas border-b border-theme-border flex items-center justify-between">
            <span className="text-xs alata-regular uppercase tracking-wider text-theme-primary-hover">
              {t('enquiries.inboxCount', { count: filteredEnquiries.length })}
            </span>
            <span className="text-[11px] text-theme-muted">{t('enquiries.clickToView')}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-theme-border">
            {filteredEnquiries.length === 0 ? (
              <div className="p-8 text-center text-theme-subtle text-xs">
                {t('enquiries.noMatch')}
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
                        ? 'bg-theme-canvas border-s-4 border-s-theme-primary'
                        : 'hover:bg-theme-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong dir="auto" className="text-sm alata-regular text-theme-ink">
                          {enq.patientName}
                        </strong>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] alata-regular border uppercase tracking-wider ${statusColors[enq.status]}`}>
                          {t(`status.${enq.status}`, { defaultValue: enq.status })}
                        </span>
                      </div>
                      <span className="text-[10px] text-theme-subtle whitespace-nowrap">
                        {enq.createdAt}
                      </span>
                    </div>

                    <p dir="auto" className="text-xs font-medium text-theme-primary mt-1 line-clamp-1">
                      {enq.requestedService}
                    </p>

                    <p dir="auto" className="text-[11px] text-theme-muted mt-1 line-clamp-2 leading-relaxed">
                      "{enq.message}"
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-theme-subtle">
                      <span className="flex items-center gap-1.5">
                        <AppIcon name="calendar" />
                        <span>{enq.preferredDate} ({enq.preferredTime})</span>
                      </span>
                      <span dir="ltr" className="font-medium text-theme-muted">{enq.phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Enquiry Communication Workspace */}
        <div className="lg:col-span-7 bg-theme-card rounded-3xl border border-theme-border shadow-sm p-6 sm:p-7 flex flex-col justify-between h-[700px] overflow-y-auto">
          {current ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-theme-border">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 dir="auto" className="text-xl alata-regular text-theme-ink">
                      {current.patientName}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] alata-regular border uppercase tracking-wider ${statusColors[current.status]}`}>
                      {t(`status.${current.status}`, { defaultValue: current.status })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-theme-muted">
                    <span dir="ltr" className="font-medium text-theme-ink">{current.phone}</span>
                    <span>•</span>
                    <span dir="ltr">{current.email}</span>
                    <span>•</span>
                    <span className="text-theme-subtle">{current.createdAt}</span>
                  </div>
                </div>

                {/* DIRECT CHANNELS: WhatsApp, Email, Phone */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenWhatsApp(current)}
                    className="px-4 py-2 rounded-full bg-[#25D366] text-white hover:bg-[#1fb355] text-xs alata-regular flex items-center gap-1.5 transition-colors shadow-sm"
                    title={t('enquiries.whatsapp')}
                  >
                    <AppIcon name="whatsapp" className="text-sm" />
                    <span>{t('enquiries.whatsapp')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEmailModal(current)}
                    className="px-4 py-2 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center gap-1.5 transition-colors shadow-sm"
                    title={t('enquiries.emailPatient')}
                  >
                    <AppIcon name="mail" />
                    <span>{t('enquiries.emailPatient')}</span>
                  </button>

                  <a
                    href={`tel:${current.phone}`}
                    aria-label={t('enquiries.callPatient')}
                    className="min-w-[44px] min-h-[44px] rounded-full border border-theme-border-strong text-theme-primary hover:bg-theme-canvas flex items-center justify-center transition-colors"
                    title={t('enquiries.callPatient')}
                  >
                    <AppIcon name="phone" className="text-sm" />
                  </a>
                </div>
              </div>

              {/* Status Selector Strip */}
              <div className="p-3.5 bg-theme-surface rounded-2xl border border-theme-border-slate flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="alata-regular text-theme-ink">{t('enquiries.enquiryStatus')}</span>
                <div className="flex items-center gap-1.5">
                  {['new', 'contacted', 'booked', 'closed'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateEnquiryStatus(current.id, s)}
                      className={`px-3.5 py-1 rounded-full text-xs alata-regular capitalize transition-all ${
                        current.status === s
                          ? 'bg-theme-primary text-white shadow-xs'
                          : 'bg-theme-card text-theme-muted hover:bg-theme-canvas border border-theme-border-slate'
                      }`}
                    >
                      {t(`status.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requested Treatment Details */}
              <div className="p-4 bg-theme-canvas rounded-2xl border border-theme-border space-y-2">
                <span className="text-[10px] alata-regular uppercase tracking-wider text-theme-primary block">
                  {t('enquiries.requestedTreatment')}
                </span>
                <h4 dir="auto" className="text-sm alata-regular text-theme-ink">
                  {current.requestedService}
                </h4>
                <div className="flex items-center gap-4 text-xs text-theme-muted pt-1">
                  <span className="flex items-center gap-1.5">
                    <AppIcon name="calendar" className="text-theme-primary" />
                    <span>{t('enquiries.preferredDate')} <strong className="text-theme-ink">{current.preferredDate}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AppIcon name="clock" className="text-theme-primary" />
                    <span>{t('enquiries.time')} <strong className="text-theme-ink">{current.preferredTime}</strong></span>
                  </span>
                </div>
              </div>

              {/* Customer Inquiry Message */}
              <div className="space-y-1.5">
                <span className="text-xs alata-regular uppercase tracking-wider text-theme-muted">
                  {t('enquiries.patientMessage')}
                </span>
                <div dir="auto" className="p-4 bg-theme-surface rounded-2xl border border-theme-border-slate text-xs text-theme-ink leading-relaxed italic">
                  "{current.message}"
                </div>
              </div>

              {/* Follow-up Notes History */}
              <div className="space-y-3 pt-2 border-t border-theme-border">
                <span className="text-xs alata-regular uppercase tracking-wider text-theme-ink block">
                  {t('enquiries.followUpLog', { count: current.notes?.length || 0 })}
                </span>

                {current.notes && current.notes.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pe-1">
                    {current.notes.map((n, i) => (
                      <div key={i} className="p-3 rounded-xl bg-theme-surface border border-theme-border-slate text-xs flex items-start justify-between gap-3">
                        <span dir="auto" className="text-theme-ink">{n.text}</span>
                        <span className="text-[10px] text-theme-subtle whitespace-nowrap">{n.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-theme-subtle italic">
                    {t('enquiries.noNotes')}
                  </p>
                )}

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    dir="auto"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder={t('enquiries.notePlaceholder')}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-theme-primary text-white text-xs alata-regular hover:bg-theme-primary-hover transition-colors shadow-sm"
                  >
                    {t('enquiries.addNote')}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-subtle text-sm">
              {t('enquiries.selectPrompt')}
            </div>
          )}
        </div>
      </div>

      {/* In-App Email Response Modal */}
      {showEmailModal && current && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-theme-overlay/60 backdrop-blur-sm animate-fadeIn">
            <div className="my-auto bg-theme-card rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col border border-theme-border">
            <div className="p-6 bg-theme-sidebar-bg text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg alata-regular">{t('enquiries.composeEmail', { name: current.patientName })}</h3>
                <p className="text-xs text-theme-sidebar-kicker">{t('enquiries.directViaMail')}</p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                aria-label={t('common.close')}
                className="text-white/70 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/10"
              >
                <AppIcon name="close" className="text-base" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">{t('enquiries.toLabel')}</label>
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={`${current.patientName} <${current.email}>`}
                  className="w-full px-3 py-2 rounded-xl border border-theme-border-slate bg-theme-surface text-theme-muted"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">{t('enquiries.subjectLabel')}</label>
                <input
                  type="text"
                  dir="auto"
                  value={emailDraft.subject}
                  onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-theme-border-slate text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">{t('enquiries.messageBodyLabel')}</label>
                <textarea
                  rows={8}
                  dir="auto"
                  value={emailDraft.message}
                  onChange={(e) => setEmailDraft({ ...emailDraft, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-theme-border-slate text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-full border border-theme-border-slate text-theme-muted hover:bg-theme-surface font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailDraft}
                  className="px-5 py-2 rounded-full bg-theme-primary text-white alata-regular hover:bg-theme-primary-hover flex items-center gap-1.5"
                >
                  <AppIcon name="paper-plane" />
                  <span>{t('enquiries.sendViaEmail')}</span>
                </button>
              </div>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
