import React from 'react';
import FaIcon from './FaIcon';

export default function VerificationBadge({ status, text, size = 'sm' }) {
  const norm = (status || '').toLowerCase().trim();
  const paddingClass = size === 'lg' ? 'px-3.5 py-1 text-xs' : size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  if (norm === 'pass' || norm === 'verified' || norm === 'approved' || norm === 'live' || norm === 'valid') {
    return (
      <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] ${paddingClass}`}>
        <FaIcon icon="fa-solid fa-circle-check" className="text-[11px]" />
        <span>{text || (norm === 'approved' ? 'Application approved' : norm === 'valid' ? 'Valid' : 'Verified')}</span>
      </span>
    );
  }

  if (norm === 'fail' || norm === 'failed' || norm === 'rejected' || norm === 'expired') {
    return (
      <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] ${paddingClass}`}>
        <FaIcon icon="fa-solid fa-circle-xmark" className="text-[11px]" />
        <span>{text || (norm === 'expired' ? 'Expired' : 'Verification failed')}</span>
      </span>
    );
  }

  if (norm === 'warning' || norm === 'expiring_soon' || norm === 'changes requested' || norm === 'changes_requested' || norm === 'review' || norm === 'review_required') {
    return (
      <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA] ${paddingClass}`}>
        <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-[11px]" />
        <span>{text || (norm === 'expiring_soon' ? 'Expiring soon' : norm.includes('changes') ? 'Changes requested' : 'Review required')}</span>
      </span>
    );
  }

  if (norm === 'active') {
    return (
      <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
        <span>{text || 'Active'}</span>
      </span>
    );
  }

  if (norm === 'inactive') {
    return (
      <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] ${paddingClass}`}>
        <FaIcon icon="fa-solid fa-eye-slash" className="text-[10px]" />
        <span>{text || 'Inactive'}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 alata-regular rounded-full bg-[#F0E6F6] text-[#552B51] border border-[#DECBE9] ${paddingClass}`}>
      <FaIcon icon="fa-regular fa-clock" className="text-[11px]" />
      <span>{text || (norm === 'pending_review' ? 'Pending review' : 'Draft')}</span>
    </span>
  );
}
