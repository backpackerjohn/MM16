import React from 'react';

const BrainDumpIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM12.75 12a8.25 8.25 0 00-7.5 6.75h15a8.25 8.25 0 00-7.5-6.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a8.25 8.25 0 00-7.5 6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 12a8.25 8.25 0 01-7.5 6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 12a8.25 8.25 0 00-7.5 6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 12a8.25 8.25 0 007.5 6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a8.25 8.25 0 017.5 6.75" />
  </svg>
);

export default BrainDumpIcon;
