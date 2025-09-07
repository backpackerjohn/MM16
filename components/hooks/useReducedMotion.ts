import React, { useState, useEffect } from 'react';

const query = '(prefers-reduced-motion: reduce)';

const getInitialState = () => {
    // Check for the media query on the client side
    if (typeof window !== 'undefined') {
        return window.matchMedia(query).matches;
    }
    // Default to false on the server or in environments without window
    return false;
};

export const useReducedMotion = () => {
    const [reducedMotion, setReducedMotion] = useState(getInitialState);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        const listener = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
        };

        // Support for addEventListener is widespread, but addListener is a fallback
        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', listener);
        } else {
            mediaQueryList.addListener(listener);
        }

        return () => {
            if (mediaQueryList.removeEventListener) {
                mediaQueryList.removeEventListener('change', listener);
            } else {
                mediaQueryList.removeListener(listener);
            }
        };
    }, []);

    return reducedMotion;
};
