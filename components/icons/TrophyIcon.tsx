import React from 'react';

const TrophyIcon: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
    <svg 
        className={className}
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M12.75 3.75A2.25 2.25 0 0010.5 6v5.25a.75.75 0 01-1.5 0V6a3.75 3.75 0 117.5 0v5.25a.75.75 0 01-1.5 0V6A2.25 2.25 0 0012.75 3.75z" />
        <path d="M15 9.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75V9.75z" />
        <path d="M7.5 9.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75V9.75z" />
        <path fillRule="evenodd" d="M9.75 12a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-2.25h3v2.25a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM4.575 14.3a.75.75 0 00.3 1.05 8.219 8.219 0 0114.25 0 .75.75 0 00.3-1.05 9.719 9.719 0 00-14.85 0z" clipRule="evenodd" />
    </svg>
);

export default TrophyIcon;
