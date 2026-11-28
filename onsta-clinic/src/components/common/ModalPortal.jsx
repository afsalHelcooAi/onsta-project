import { createPortal } from 'react-dom';

/**
 * Renders modals directly into document.body so parent scroll containers,
 * spacing utilities (space-y-*), or CSS animations never shift fixed centering.
 */
export default function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
