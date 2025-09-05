import React from 'react';

const LockOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 20 20"
        fill="currentColor"
        {...props}
    >
        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2h-1V7a4 4 0 00-5-4H7V7a3 3 0 013-3z" />
    </svg>
);

export default LockOpenIcon;
