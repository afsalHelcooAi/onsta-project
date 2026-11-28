import React from 'react';

export default function BrandLogo({ className = 'w-10 h-10 rounded-xl', alt = 'ONSTA' }) {
  return (
    <img
      src="/onsta-logo.png"
      alt={alt}
      className={`object-cover shrink-0 select-none ${className}`}
    />
  );
}
