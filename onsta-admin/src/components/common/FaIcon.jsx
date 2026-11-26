import React from 'react';

/**
 * Curated FontAwesome 6 wrapper for human-crafted platform operations UI.
 */
export default function FaIcon({ icon, className = '', title }) {
  return (
    <i
      className={`${icon} ${className} inline-flex items-center justify-center leading-none`}
      aria-hidden="true"
      title={title}
    />
  );
}
