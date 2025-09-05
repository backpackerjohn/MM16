import React from 'react';

const HandRaisedIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 20 20"
        fill="currentColor"
        {...props}
    >
        <path d="M10 3.75a2 2 0 00-2 2v5.5a2 2 0 002 2h3.5a2 2 0 002-2v-5.5a2 2 0 00-2-2h-3.5zM10 5.25h3.5a.5.5 0 01.5.5v5.5a.5.5 0 01-.5.5h-3.5a.5.5 0 01-.5-.5v-5.5a.5.5 0 01.5-.5z" />
        <path d="M5 6.25a2 2 0 00-2 2v5.5a2 2 0 002 2V6.25zM5 7.75v5.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5v-5.5a.5.5 0 00-.5-.5h-.5a.5.5 0 00-.5.5z" />
        <path d="M3.5 8.25a1 1 0 00-1 1v2a1 1 0 001 1V8.25z" />
    </svg>
);

export default HandRaisedIcon;
