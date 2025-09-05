import React, { useEffect, useState } from 'react';
import { ThemeName } from '../types';
import WandIcon from './icons/WandIcon';
import { themes } from '../utils/styles';

interface ThemeSuggestionToastProps {
    suggestion: ThemeName | null;
    onAccept: () => void;
    onDismiss: () => void;
    onPreviewStart: (theme: ThemeName) => void;
    onPreviewEnd: () => void;
}

const ThemeSuggestionToast: React.FC<ThemeSuggestionToastProps> = ({ suggestion, onAccept, onDismiss, onPreviewStart, onPreviewEnd }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (suggestion) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [suggestion]);

    if (!isVisible || !suggestion) {
        return null;
    }

    const suggestedThemeProperties = themes[suggestion];
    // FIX: Cast style object to React.CSSProperties to allow custom CSS variables.
    const toastStyle = {
        '--toast-surface': `hsl(${suggestedThemeProperties['--color-surface-h']}, ${suggestedThemeProperties['--color-surface-s']}, ${suggestedThemeProperties['--color-surface-l']})`,
        '--toast-border': `hsl(${suggestedThemeProperties['--color-border-h']}, ${suggestedThemeProperties['--color-border-s']}, ${suggestedThemeProperties['--color-border-l']})`,
        '--toast-text-primary': `hsl(${suggestedThemeProperties['--color-text-primary-h']}, ${suggestedThemeProperties['--color-text-primary-s']}, ${suggestedThemeProperties['--color-text-primary-l']})`,
        '--toast-text-secondary': `hsl(${suggestedThemeProperties['--color-text-secondary-h']}, ${suggestedThemeProperties['--color-text-secondary-s']}, ${suggestedThemeProperties['--color-text-secondary-l']})`,
        '--toast-primary-accent': `hsl(${suggestedThemeProperties['--color-primary-accent-h']}, ${suggestedThemeProperties['--color-primary-accent-s']}, ${suggestedThemeProperties['--color-primary-accent-l']})`,
        '--toast-primary-accent-text': `hsl(${suggestedThemeProperties['--color-primary-accent-text-h']}, ${suggestedThemeProperties['--color-primary-accent-text-s']}, ${suggestedThemeProperties['--color-primary-accent-text-l']})`,
        '--toast-primary-accent-hover': `hsl(${suggestedThemeProperties['--color-primary-accent-h']}, ${suggestedThemeProperties['--color-primary-accent-s']}, calc(${suggestedThemeProperties['--color-primary-accent-l']} * 0.9))`,
        '--toast-surface-sunken': `hsl(${suggestedThemeProperties['--color-surface-sunken-h']}, ${suggestedThemeProperties['--color-surface-sunken-s']}, ${suggestedThemeProperties['--color-surface-sunken-l']})`,
        backgroundColor: 'var(--toast-surface)',
        borderColor: 'var(--toast-border)',
    } as React.CSSProperties;

    return (
        <div
            className="group fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] rounded-xl shadow-2xl p-4 w-full max-w-md border flex items-center gap-4 animate-fade-in transition-transform duration-300 hover:scale-105"
            style={toastStyle}
            onMouseEnter={() => onPreviewStart(suggestion)}
            onMouseLeave={onPreviewEnd}
            role="alert"
            aria-live="assertive"
        >
            <style>{`
                .toast-btn-accept {
                    color: var(--toast-primary-accent-text);
                    background-color: var(--toast-primary-accent);
                }
                .toast-btn-accept:hover {
                    background-color: var(--toast-primary-accent-hover);
                }
                .toast-btn-dismiss {
                    color: var(--toast-text-secondary);
                    background-color: transparent;
                    font-weight: 700;
                }
                .toast-btn-dismiss:hover {
                    background-color: var(--toast-surface-sunken);
                }
            `}</style>
            <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--toast-primary-accent)', opacity: 0.2 }}>
                <WandIcon className="h-6 w-6" style={{ color: 'var(--toast-primary-accent)' }} />
            </div>
            <div className="flex-1">
                <p className="font-semibold" style={{ color: 'var(--toast-text-primary)' }}>Theme Suggestion</p>
                <p className="text-sm" style={{ color: 'var(--toast-text-secondary)' }}>
                    We recommend the "{suggestion}" theme for your current context.
                </p>
            </div>
            <div className="flex gap-2">
                <button onClick={onDismiss} className="toast-btn-dismiss px-3 py-1.5 text-sm rounded-md transition-colors">
                    Dismiss
                </button>
                <button onClick={onAccept} className="toast-btn-accept px-3 py-1.5 text-sm font-semibold rounded-md transition-colors">
                    Accept
                </button>
            </div>
        </div>
    );
};

export default ThemeSuggestionToast;