import React from 'react';

// Update props to accept standard SVGElement props to allow `style` and other attributes.
const WandIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.998 15.998 0 011.622-3.385m5.043.025a15.998 15.998 0 001.622-3.385m3.388 1.62a15.998 15.998 0 00-1.62-3.385m0 0a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0c-.246-.633-.5-1.226-.784-1.794A15.998 15.998 0 0012 2.25c-2.996 0-5.717 1.1-7.754 2.922c-.284.254-.509.533-.708.836l.002-.001z" />
  </svg>
);

export default WandIcon;
