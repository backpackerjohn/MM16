import React from 'react';

const AppLogoIcon: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: 'currentColor', stopOpacity: 0.5}} />
        <stop offset="100%" style={{stopColor: 'currentColor', stopOpacity: 1}} />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#grad1)" strokeWidth="2" />
    <path
      d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default AppLogoIcon;