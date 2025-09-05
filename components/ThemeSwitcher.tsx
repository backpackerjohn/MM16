import React, { useState, useRef, useEffect } from 'react';
import { ThemeSettings, ThemeName } from '../types';
import WandIcon from './icons/WandIcon';

interface ThemeSwitcherProps {
    settings: ThemeSettings;
    setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
    activeTheme: string; // e.g., "Auto: Creative" or "Focus"
}

const themeOptions: { value: ThemeSettings['mode'] | ThemeName, label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'Creative', label: 'Creative' },
    { value: 'Focus', label: 'Focus' },
    { value: 'Recovery', label: 'Recovery' },
    { value: 'Evening', label: 'Evening' },
];

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ settings, setSettings, activeTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const handleSelect = (option: typeof themeOptions[number]) => {
        if (option.value === 'auto') {
            setSettings({ ...settings, mode: 'auto' });
        } else {
            // FIX: Spread existing settings to preserve all properties when updating state.
            setSettings({ ...settings, mode: 'manual', manualTheme: option.value as ThemeName });
        }
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--border-radius-md)] transition-all duration-300 shadow-sm"
            >
                <WandIcon className="h-4 w-4 text-[var(--color-primary-accent)]" />
                <span>{activeTheme}</span>
                 <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--border-radius-lg)] shadow-lg z-10 animate-fade-in">
                    <div className="p-1">
                        {themeOptions.map(option => (
                             <button
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--border-radius-md)] transition-colors"
                             >
                                 {option.label}
                             </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeSwitcher;