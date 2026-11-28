import React, { useState } from 'react';
import AppIcon from './AppIcon';

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
        className={`${className} object-cover rounded-2xl border border-theme-border bg-theme-surface`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-2xl bg-gradient-to-br from-theme-primary-soft via-theme-canvas to-theme-primary-tint text-theme-primary flex flex-col items-center justify-center border border-theme-border-strong select-none flex-shrink-0 relative overflow-hidden shadow-xs`}
      title={name || 'Healthcare Practitioner'}
    >
      <AppIcon name="doctor" className={`${iconSize} text-theme-primary`} />
      <span className="text-[10px] alata-regular text-theme-primary-hover tracking-wider uppercase mt-0.5">
        {initials}
      </span>
    </div>
  );
}
