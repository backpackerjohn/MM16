import React from 'react';

const FinishLineIcon: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 4H6V8H4V4Z" fill="currentColor" />
    <path d="M6 4H8V8H6V4Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M8 4H10V8H8V4Z" fill="currentColor" />
    <path d="M10 4H12V8H10V4Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M4 8H6V12H4V8Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M6 8H8V12H6V8Z" fill="currentColor" />
    <path d="M8 8H10V12H8V8Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M10 8H12V12H10V8Z" fill="currentColor" />
    <path d="M4 12H6V16H4V12Z" fill="currentColor" />
    <path d="M6 12H8V16H6V12Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M8 12H10V16H8V12Z" fill="currentColor" />
    <path d="M10 12H12V16H10V12Z" fill="currentColor" fillOpacity="0.6" />
    <path fillRule="evenodd" clipRule="evenodd" d="M3 3H13V17H3V3ZM5 5V15H11V5H5Z" fill="currentColor" />
    <path d="M3 21V3H1V21H3Z" fill="currentColor" />
    <path d="M13 17C16.75 17 18.6667 19 21 21V10C18.3333 11.1667 16.6 13 13 13V17Z" fill="currentColor" />
  </svg>
);

export default FinishLineIcon;