import React, { useState } from 'react';
import FaIcon from './FaIcon';

export default function DoctorAvatar({
  photo,
  photoUrl,
  name = 'Doctor',
  className = 'w-14 h-14',
  iconSize = 'text-lg'
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
        className={`${className} object-cover rounded-2xl border border-[#EAE0F2] bg-[#F8FAFC]`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-2xl bg-gradient-to-br from-[#F0E6F6] via-[#F6F0FA] to-[#E6D6F0] text-[#6B3B66] flex flex-col items-center justify-center border border-[#DECBE9] select-none flex-shrink-0 relative overflow-hidden shadow-xs`}
      title={name || 'Healthcare Practitioner'}
    >
      <FaIcon icon="fa-solid fa-user-doctor" className={`${iconSize} text-[#6B3B66]`} />
      <span className="text-[10px] alata-regular text-[#552B51] tracking-wider uppercase mt-0.5">
        {initials}
      </span>
    </div>
  );
}
