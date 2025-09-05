import React from 'react';

const BookmarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 20 20"
        fill="currentColor"
        {...props}
    >
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12l-5-3-5 3V4z" />
    </svg>
);

export default BookmarkIcon;
