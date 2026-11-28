import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClinic } from '../../context/ClinicContext';
import VerificationBadge from '../common/VerificationBadge';
import AppIcon from '../common/AppIcon';
import ModalPortal from '../common/ModalPortal';

export default function OffersManagement({ onOpenPreview }) {
  const { t } = useTranslation();
  const { offers, services, clinicData, addOffer, updateOffer, deleteOffer, toggleOfferActive } = useClinic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const clinicDisplayName = clinicData?.displayName || clinicData?.legalName || 'Your Clinic';
  const clinicDisplayArea = clinicData?.cityArea ? `${clinicData.cityArea}, ${clinicData?.emirate || 'Dubai'}` : (clinicData?.emirate || 'Dubai, UAE');

  // Form State matching Screenshot 1
  const [formData, setFormData] = useState({
    title: '',
    linkedServiceId: services[0]?.id || '',
    normalPrice: services[0]?.normalPrice || 450,
    offerPrice: 299,
    startDate: '2026-11-01',
    endDate: '2026-12-31',
    terms: 'Valid for new and returning clients. Prior clinical consultation required.',
    description: 'Promotional medical aesthetics package with certified dermatologist oversight.',
    declaration: true,
    isActive: true
  });

  // Calculate discount percentage automatically
  const normal = parseFloat(formData.normalPrice || 0);
  const offer = parseFloat(formData.offerPrice || 0);
  const discountPercent = normal > 0 && offer < normal ? Math.round(((normal - offer) / normal) * 100) : 0;

  // Real-time Wording Check (Matching Screenshot 1)
  const wordingProhibited = /\b(best|only|100%|guaranteed|cheapest)\b/i.exec(formData.title);

  const openAddModal = () => {
    setEditingOffer(null);
    const defaultSrv = services[0] || {};
    setFormData({
      title: defaultSrv.name ? `${defaultSrv.name} Special Promotion` : 'Special Treatment Promotion',
      linkedServiceId: defaultSrv.id || '',
      normalPrice: defaultSrv.normalPrice || 450,
      offerPrice: defaultSrv.normalPrice ? Math.round(defaultSrv.normalPrice * 0.75) : 299,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms: 'Valid for new & returning clients. Advance appointment required.',
      description: defaultSrv.description || 'Promotional treatment package with verified clinical practitioner oversight.',
      declaration: true,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (offerItem) => {
    setEditingOffer(offerItem);
    setFormData({
      title: offerItem.title,
      linkedServiceId: offerItem.linkedServiceId,
      normalPrice: offerItem.normalPrice,
      offerPrice: offerItem.offerPrice,
      startDate: offerItem.startDate,
      endDate: offerItem.endDate,
      terms: offerItem.terms || '',
      description: offerItem.description || '',
      declaration: true,
      isActive: offerItem.isActive
    });
    setIsModalOpen(true);
  };

  const handleLinkedServiceChange = (serviceId) => {
    const srv = services.find(s => s.id === serviceId);
    setFormData(prev => ({
      ...prev,
      linkedServiceId: serviceId,
      normalPrice: srv ? srv.normalPrice : prev.normalPrice
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingOffer) {
      updateOffer(editingOffer.id, formData);
    } else {
      addOffer(formData);
    }
    setIsModalOpen(false);
  };

  // Demo shortcut to trigger "Best laser offer in Dubai" from Screenshot 1
  const handleTriggerBestWording = () => {
    setEditingOffer(null);
    setFormData({
      title: 'Best laser offer in Dubai',
      linkedServiceId: services[0]?.id || '',
      normalPrice: 850,
      offerPrice: 499,
      startDate: '2026-11-15',
      endDate: '2027-01-15',
      terms: 'Terms apply.',
      description: 'Laser hair removal treatment.',
      declaration: true,
      isActive: true
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title & Actions */}
      <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
            <AppIcon name="tag" className="text-lg" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl alata-regular text-theme-ink tracking-tight">
              {t('offers.title')}
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
              {t('offers.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerBestWording}
            disabled={services.length === 0}
            className="px-3.5 py-2 rounded-full bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] border border-[#FECACA] text-xs alata-regular flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <AppIcon name="warning" />
            <span>{t('offers.testBestWording')}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={services.length === 0}
            className="px-5 py-2.5 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <AppIcon name="plus" className="text-xs" />
            <span>{t('offers.createNewOffer')}</span>
          </button>
        </div>
      </div>

      {/* No Services Added Warning Banner */}
      {services.length === 0 && (
        <div className="p-4 bg-theme-accent-soft border border-theme-accent-border rounded-2xl flex items-start gap-3">
          <AppIcon name="warning" className="text-base text-theme-accent shrink-0 mt-0.5" />
          <div className="text-xs text-theme-accent-text">
            <p className="alata-regular">{t('offers.noServicesTitle')}</p>
            <p className="mt-0.5 opacity-90">
              {t('offers.noServicesDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Multiple Active Offers Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-theme-muted font-medium">{t('offers.totalOffers')}</p>
            <h4 className="text-2xl alata-regular text-theme-ink mt-1">{offers.length}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-theme-accent-soft border border-theme-accent-border text-theme-accent flex items-center justify-center">
            <AppIcon name="tag" />
          </div>
        </div>

        <div className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-theme-muted font-medium">{t('offers.liveActive')}</p>
            <h4 className="text-2xl alata-regular text-[#166534] mt-1">
              {offers.filter(o => o.isActive).length}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
            <AppIcon name="eye" />
          </div>
        </div>

        <div className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-theme-muted font-medium">{t('offers.inactiveHidden')}</p>
            <h4 className="text-2xl alata-regular text-theme-muted mt-1">
              {offers.filter(o => !o.isActive).length}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-theme-surface text-theme-muted flex items-center justify-center border border-theme-border-slate">
            <AppIcon name="eye-off" />
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-theme-card rounded-3xl border border-theme-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-theme-canvas text-theme-primary-hover alata-regular uppercase tracking-wider text-[11px] border-b border-theme-border">
              <tr>
                <th className="py-3.5 px-4">{t('offers.colTitle')}</th>
                <th className="py-3.5 px-3">{t('offers.colLinked')}</th>
                <th className="py-3.5 px-3 text-end">{t('offers.colNormal')}</th>
                <th className="py-3.5 px-3 text-end">{t('offers.colOffer')}</th>
                <th className="py-3.5 px-3 text-center">{t('offers.colDiscount')}</th>
                <th className="py-3.5 px-3">{t('offers.colValidity')}</th>
                <th className="py-3.5 px-3 text-center">{t('offers.colToggle')}</th>
                <th className="py-3.5 px-3 text-center">{t('offers.colVerification')}</th>
                <th className="py-3.5 px-4 text-end">{t('offers.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {offers.map((offerItem) => (
                <tr key={offerItem.id} className="hover:bg-theme-surface transition-colors">
                  <td className="py-3.5 px-4">
                    <div dir="auto" className="alata-regular text-theme-ink text-sm max-w-[220px]">
                      {offerItem.title}
                    </div>
                    <div dir="auto" className="text-[11px] text-theme-muted mt-0.5 line-clamp-1">
                      {offerItem.description}
                    </div>
                  </td>

                  <td dir="auto" className="py-3.5 px-3 text-theme-muted max-w-[180px] truncate">
                    {offerItem.linkedServiceName}
                  </td>

                  <td className="py-3.5 px-3 text-end text-theme-subtle line-through">
                    {offerItem.normalPrice} {t('common.aed')}
                  </td>

                  <td className="py-3.5 px-3 text-end alata-regular text-theme-accent text-sm">
                    {offerItem.offerPrice} {t('common.aed')}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-theme-primary text-theme-accent alata-regular text-[11px]">
                      {t('overview.percentOff', { percent: offerItem.discountPercent })}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-theme-muted whitespace-nowrap text-[11px]">
                    {t('offers.toDate', { start: offerItem.startDate, end: offerItem.endDate })}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => toggleOfferActive(offerItem.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs alata-regular transition-all ${
                        offerItem.isActive
                          ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] border border-[#BBF7D0]'
                          : 'bg-theme-surface-muted text-theme-muted hover:bg-theme-border-slate border border-theme-border-slate'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${offerItem.isActive ? 'bg-[#16A34A] animate-pulse' : 'bg-theme-subtle'}`} />
                      <span>{offerItem.isActive ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <VerificationBadge status={offerItem.verificationStatus} />
                  </td>

                  <td className="py-3.5 px-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(offerItem)}
                        aria-label={`${t('common.edit')} ${offerItem.title}`}
                        className="min-w-[44px] min-h-[44px] rounded-xl text-theme-muted hover:text-theme-primary hover:bg-theme-canvas flex items-center justify-center transition-colors"
                        title={t('common.edit')}
                      >
                        <AppIcon name="edit" className="text-sm" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(offerItem.id)}
                        aria-label={`${t('common.delete')} ${offerItem.title}`}
                        className="min-w-[44px] min-h-[44px] rounded-xl text-theme-subtle hover:text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                        title={t('common.delete')}
                      >
                        <AppIcon name="trash" className="text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Offer Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-theme-overlay/60 backdrop-blur-sm animate-fadeIn">
            <div className="my-auto bg-theme-canvas rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-theme-border">
            <div className="p-6 pb-4 border-b border-theme-border flex items-start justify-between bg-theme-card">
              <div>
                <h2 className="text-2xl sm:text-3xl alata-regular text-theme-ink">
                  {editingOffer ? t('offers.editOffer') : t('offers.newOffer')}
                </h2>
                <p className="text-xs text-theme-muted mt-1">
                  {t('offers.modalSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label={t('common.close')}
                className="text-theme-muted hover:text-theme-ink min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-theme-surface"
              >
                <AppIcon name="close" className="text-base" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleSubmit} className="lg:col-span-2 bg-theme-card rounded-2xl border border-theme-border p-6 shadow-sm space-y-4">
                <h3 className="text-base alata-regular text-theme-ink">
                  {t('offers.offerDetails')}
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    {t('offers.offerTitleLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    dir="auto"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('offers.offerTitlePlaceholder')}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-theme-ink focus:outline-none focus:ring-2 ${
                      wordingProhibited
                        ? 'border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] focus:ring-red-400'
                        : 'border-theme-border-slate focus:ring-theme-primary/30'
                    }`}
                  />

                  {wordingProhibited && (
                    <div className="mt-2 p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] space-y-1">
                      <p className="alata-regular">
                        {t('offers.wordingCheckError', { word: wordingProhibited[0] })}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    {t('offers.linkedServiceLabel')}
                  </label>
                  <select
                    value={formData.linkedServiceId}
                    onChange={(e) => handleLinkedServiceChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink bg-theme-card focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({t('common.aed')} {srv.normalPrice})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-theme-ink mb-1">
                      {t('offers.normalPriceLabel')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      dir="ltr"
                      value={formData.normalPrice}
                      onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs alata-regular text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-ink mb-1">
                      {t('offers.offerPriceLabel')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      dir="ltr"
                      value={formData.offerPrice}
                      onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs alata-regular text-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    />
                  </div>
                </div>

                {discountPercent > 0 && (
                  <div className="p-3 bg-theme-accent-soft rounded-xl border border-theme-accent-border text-xs text-theme-accent-text flex items-center justify-between">
                    <span>{t('offers.calculatedDiscount')}</span>
                    <strong className="alata-regular text-sm text-theme-accent">{t('offers.savingsForPatients', { percent: discountPercent })}</strong>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-theme-ink mb-1">
                      {t('offers.startDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-ink mb-1">
                      {t('offers.endDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-ink mb-1">
                    {t('offers.termsLabel')}
                  </label>
                  <textarea
                    rows={3}
                    dir="auto"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder={t('offers.termsPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border-slate text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.declaration}
                      onChange={(e) => setFormData({ ...formData, declaration: e.target.checked })}
                      className="mt-0.5 rounded text-theme-primary focus:ring-theme-primary"
                    />
                    <span className="text-xs text-theme-muted font-medium">
                      {t('offers.declaration')}
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-theme-border flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full border border-theme-border-slate text-xs font-medium text-theme-muted hover:bg-theme-surface"
                  >
                    {t('offers.saveDraft')}
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-theme-primary text-white text-xs alata-regular hover:bg-theme-primary-hover transition-colors shadow-sm"
                  >
                    {t('offers.submitForReview')}
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                <div className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm alata-regular text-theme-ink">
                      {t('offers.customerPreview')}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] alata-regular bg-theme-accent-soft border border-theme-accent-border text-theme-accent-text">
                      {t('offers.pendingVersion')}
                    </span>
                  </div>

                  <div className="h-32 rounded-2xl bg-theme-primary-soft flex flex-col items-center justify-center text-theme-primary text-xs alata-regular">
                    <AppIcon name="image" className="text-2xl mb-1 opacity-60" />
                    <span>{t('offers.promotionalBanner')}</span>
                  </div>

                  <div>
                    <h5 dir="auto" className="text-sm alata-regular text-theme-ink">
                      {formData.title || t('offers.offerTitleFallback')}
                    </h5>
                    <p dir="auto" className="text-[11px] text-theme-muted mt-0.5">
                      {clinicDisplayName} • {clinicDisplayArea}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base alata-regular text-theme-accent">
                        {formData.offerPrice || '000'} {t('common.aed')}
                      </span>
                      <span className="text-xs text-theme-subtle line-through">
                        {formData.normalPrice || '000'} {t('common.aed')}
                      </span>
                    </div>
                    <p className="text-[10px] text-theme-subtle mt-1">
                      {t('offers.validRange', { start: formData.startDate, end: formData.endDate })}
                    </p>
                  </div>
                </div>

                <div className="bg-theme-card rounded-2xl border border-theme-border p-5 shadow-sm space-y-3">
                  <h4 className="text-sm alata-regular text-theme-ink">
                    {t('offers.reviewPath')}
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-theme-border">
                      <span className="text-theme-muted">{t('offers.step1')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534]">
                        {t('offers.automatic')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-theme-border">
                      <span className="text-theme-muted">{t('offers.step2')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] alata-regular bg-[#DCFCE7] text-[#166534]">
                        {t('offers.autonomous')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-theme-muted">{t('offers.step3')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] alata-regular bg-theme-surface text-theme-muted">
                        {t('offers.instantUponPass')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-theme-overlay/60 backdrop-blur-sm animate-fadeIn">
            <div className="my-auto bg-theme-card rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-theme-border">
            <h4 className="text-base alata-regular text-theme-ink">
              {t('offers.deleteTitle')}
            </h4>
            <p className="text-xs text-theme-muted leading-relaxed">
              {t('offers.deleteDesc')}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-full border border-theme-border-slate text-xs font-medium text-theme-muted hover:bg-theme-surface"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  deleteOffer(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-5 py-2 rounded-full bg-[#DC2626] text-white text-xs alata-regular hover:bg-[#B91C1C]"
              >
                {t('offers.confirmDelete')}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
