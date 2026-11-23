import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';

export default function DoctorAvatar({
  photo,
  photoUrl,
  name = 'Doctor',
  className = 'w-14 h-14',
  iconSize = 'w-6 h-6'
}) {
  const [imgError, setImgError] = useState(false);
  const actualPhoto = photo || photoUrl;

  const initials = (name || '')
    .replace(/^dr\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'MD';

  if (actualPhoto && !imgError) {
    return (
      <img
        src={actualPhoto}
        alt={name || 'Doctor'}
        onError={() => setImgError(true)}
        className={`${className} object-cover rounded-2xl`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-2xl bg-gradient-to-br from-[#0d281e] via-[#12382b] to-[#1c5541] text-white flex flex-col items-center justify-center shadow-xs border border-emerald-800/30 select-none flex-shrink-0 relative overflow-hidden`}
      title={name || 'Healthcare Practitioner'}
    >
      <div className="flex items-center justify-center">
        <UserCheck className={`${iconSize} text-emerald-300`} />
      </div>
      <span className="text-[10px] font-bold text-emerald-100 tracking-wider font-mono uppercase mt-0.5">
        {initials}
      </span>
    </div>
  );
}
