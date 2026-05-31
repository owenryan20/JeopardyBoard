import type { ReactNode } from 'react';
import './FinalJeopardyRainbowWrap.css';

interface FinalJeopardyRainbowWrapProps {
  children: ReactNode;
  className?: string;
}

/** Uma Musume–style rotating rainbow ring on hover. */
export function FinalJeopardyRainbowWrap({ children, className = '' }: FinalJeopardyRainbowWrapProps) {
  return (
    <span className={`fj-rainbow-wrap${className ? ` ${className}` : ''}`}>
      <span className="fj-rainbow-spin" aria-hidden="true" />
      {children}
    </span>
  );
}
