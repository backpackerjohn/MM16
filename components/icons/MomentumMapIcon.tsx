import React from 'react';

const MomentumMapIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a12.025 12.025 0 01-4.132 4.965m-2.223-7.38a11.95 11.95 0 00-4.132 4.965m-2.223-7.38a11.95 11.95 0 00-4.132 4.965M12 3a9 9 0 100 18 9 9 0 000-18z" />
  </svg>
);

export default MomentumMapIcon;
