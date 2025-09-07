import React from 'react';
import PlusIcon from './icons/PlusIcon';
import AppLogoIcon from './icons/AppLogoIcon';
import WandIcon from './icons/WandIcon';
import DesktopIcon from './icons/DesktopIcon';
import MobileIcon from './icons/MobileIcon';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onBrainDumpClick: () => void;
  onThemeClick: () => void;
  activeTheme: string;
  previewMode: 'desktop' | 'mobile';
  setPreviewMode: (mode: 'desktop' | 'mobile') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onBrainDumpClick, onThemeClick, activeTheme, previewMode, setPreviewMode }) => {
  const navLinks = [
    'Dashboard',
    'Momentum Map',
    'Brain Dump',
    'Task',
    'Calendar',
    'My Stats',
    'Settings',
  ];

  return (
    <header className="bg-[var(--color-surface)]/80 backdrop-blur-lg border-b border-[var(--color-border)]/80 sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        {/* Left Section: Logo and Title */}
        <div className="flex items-center space-x-3">
          <AppLogoIcon className="h-9 w-9 text-[var(--color-primary-accent)]" />
          <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Momentum
          </span>
        </div>

        {/* Center Section: Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <button
              key={link}
              onClick={() => onNavigate(link)}
              className={`transition-colors duration-300 font-semibold text-sm ${
                currentPage === link || (currentPage === 'Stats' && link === 'My Stats')
                  ? 'text-[var(--color-primary-accent)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-primary-accent)]'
              }`}
            >
              {link}
            </button>
          ))}
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center space-x-3">
           <div className="flex items-center space-x-1 p-1 bg-[var(--color-surface-sunken)] rounded-full border border-[var(--color-border)]">
              <button 
                onClick={() => setPreviewMode('desktop')} 
                className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'bg-[var(--color-primary-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}`}
                title="Desktop View"
              >
                  <DesktopIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')} 
                className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'bg-[var(--color-primary-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}`}
                title="Mobile Preview"
              >
                  <MobileIcon className="h-4 w-4" />
              </button>
          </div>
          <button
            onClick={onThemeClick}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-transparent border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-[var(--border-radius-md)] transition-all"
            title="Open theme settings"
          >
            <WandIcon className="h-4 w-4 text-[var(--color-primary-accent)]" />
            <span className="hidden sm:inline">{activeTheme}</span>
          </button>
          <button
            onClick={onBrainDumpClick}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-[var(--border-radius-md)] transition-all duration-300 shadow-sm"
            title="Quick Brain Dump (Ctrl+B)"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Brain Dump</span>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;