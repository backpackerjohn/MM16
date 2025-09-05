import React from 'react';
import { ThemeSettings, ThemeName, PresetName, CustomThemeProperties } from '../types';
import { themePresets, themes } from '../utils/styles';
import XIcon from './icons/XIcon';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  onThemeSelect: (themeName: ThemeName) => void;
}

const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose, settings, setSettings, onThemeSelect }) => {
    if (!isOpen) return null;

    const handleModeChange = (mode: 'auto' | 'manual') => {
        const lastOverrideTime = settings.userOverrides?.lastOverride;
        const newOverrides = mode === 'manual' && settings.mode === 'auto'
          ? { ...settings.userOverrides, lastOverride: Date.now() }
          : settings.userOverrides;

        setSettings(prev => ({ ...prev, mode, userOverrides: newOverrides }));
    };

    const handlePresetApply = (presetName: PresetName) => {
        setSettings(prev => ({
            ...prev,
            customThemeProperties: themePresets[presetName],
        }));
    };

    const handleSliderChange = (prop: keyof CustomThemeProperties, value: number) => {
        setSettings(prev => ({
            ...prev,
            customThemeProperties: {
                ...prev.customThemeProperties,
                [prop]: value,
            }
        }));
    };

    const handleManualThemeSelect = (themeName: ThemeName) => {
        setSettings(prev => ({ ...prev, manualTheme: themeName, mode: 'manual' }));
        onThemeSelect(themeName);
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-settings-title"
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 flex flex-col h-auto max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
                    <h2 id="theme-settings-title" className="text-2xl font-bold text-[var(--color-text-primary)]">Theme Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Mode Selection */}
                    <div className="p-4 border border-[var(--color-border)] rounded-lg">
                        <h3 className="font-bold text-[var(--color-text-primary)] mb-3">Theme Mode</h3>
                        <div className="flex items-center space-x-2 p-1 bg-[var(--color-surface-sunken)] rounded-lg">
                            <button
                                onClick={() => handleModeChange('auto')}
                                className={`flex-1 px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${settings.mode === 'auto' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}
                            >
                                Auto (Recommended)
                            </button>
                            <button
                                onClick={() => handleModeChange('manual')}
                                className={`flex-1 px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${settings.mode === 'manual' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}
                            >
                                Manual
                            </button>
                        </div>
                        {settings.mode === 'manual' && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {(Object.keys(themes) as ThemeName[]).map(themeName => (
                                    <button key={themeName} onClick={() => handleManualThemeSelect(themeName)} className={`px-3 py-1.5 text-sm font-semibold rounded-md border-2 ${settings.manualTheme === themeName ? 'border-[var(--color-primary-accent)] text-[var(--color-primary-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-accent)]'}`}>
                                        {themeName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Presets */}
                    <div className="p-4 border border-[var(--color-border)] rounded-lg">
                        <h3 className="font-bold text-[var(--color-text-primary)] mb-3">Quick Presets</h3>
                         <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(themePresets) as PresetName[]).map(presetName => (
                                <button key={presetName} onClick={() => handlePresetApply(presetName)} className="px-3 py-1.5 text-sm font-bold rounded-md bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)]">
                                    {presetName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fine-Tuning */}
                     <div className="p-4 border border-[var(--color-border)] rounded-lg space-y-4">
                        <h3 className="font-bold text-[var(--color-text-primary)] mb-3">Fine-Tune Sensory Experience</h3>
                        <div>
                             <label htmlFor="animation-speed" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Animation Speed</label>
                             <input type="range" id="animation-speed" min="0" max="2" step="0.1" value={settings.customThemeProperties.animationSpeed} onChange={e => handleSliderChange('animationSpeed', parseFloat(e.target.value))} className="w-full" />
                        </div>
                         <div>
                             <label htmlFor="color-intensity" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Color Intensity</label>
                             <input type="range" id="color-intensity" min="0" max="1.5" step="0.1" value={settings.customThemeProperties.colorIntensity} onChange={e => handleSliderChange('colorIntensity', parseFloat(e.target.value))} className="w-full" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="ui-contrast-level" className="text-sm font-semibold text-[var(--color-text-secondary)]">UI Contrast</label>
                                <span className="text-xs text-[var(--color-text-subtle)]">Lightens/darkens backgrounds & borders</span>
                            </div>
                            <input type="range" id="ui-contrast-level" min="0.8" max="1.2" step="0.05" value={settings.customThemeProperties.uiContrastLevel} onChange={e => handleSliderChange('uiContrastLevel', parseFloat(e.target.value))} className="w-full" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="text-contrast-level" className="text-sm font-semibold text-[var(--color-text-secondary)]">Text Contrast</label>
                                <span className="text-xs text-[var(--color-text-subtle)]">Lightens/darkens text</span>
                            </div>
                            <input type="range" id="text-contrast-level" min="0.8" max="1.5" step="0.05" value={settings.customThemeProperties.textContrastLevel} onChange={e => handleSliderChange('textContrastLevel', parseFloat(e.target.value))} className="w-full" />
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)]/80 text-right">
                    <button onClick={onClose} className="px-5 py-2 font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-border)] rounded-lg border border-[var(--color-border-hover)] shadow-sm">
                        Done
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ThemeSettingsModal;