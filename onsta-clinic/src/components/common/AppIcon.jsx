import React from 'react';
import { DIRECTIONAL_ICONS, ICON_MAP } from './iconMap';

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Unified Phosphor icon wrapper.
 * Color inherits from currentColor; directional arrows/carets mirror in RTL.
 */
export default function AppIcon({
  name,
  size,
  weight = 'regular',
  className = '',
  decorative = true,
  spin = false,
  title,
  'aria-label': ariaLabel,
}) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;

  const resolvedSize = typeof size === 'number' ? size : SIZE_MAP[size] || '1em';
  const isRtl =
    typeof document !== 'undefined' && document.documentElement?.dir === 'rtl';
  const mirrorRtl = isRtl && DIRECTIONAL_ICONS.has(name);

  const classes = [
    'inline-block shrink-0 align-middle',
    spin ? 'animate-spin' : '',
    mirrorRtl ? '-scale-x-100' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleLabel = ariaLabel || (!decorative ? title : undefined);
  const isDecorative = decorative && !accessibleLabel;

  return (
    <IconComponent
      size={resolvedSize}
      weight={weight}
      color="currentColor"
      className={classes}
      aria-hidden={isDecorative ? 'true' : undefined}
      aria-label={accessibleLabel}
      role={accessibleLabel ? 'img' : undefined}
    />
  );
}
