import { ContextTag, ThemeName, ThemeProperties, CustomThemeProperties, PresetName } from '../types';

export const tagThemeTokens: Record<string, { bg: string; text: string }> = {
    'work': { bg: 'var(--tag-work-bg)', text: 'var(--tag-work-text)' },
    'personal': { bg: 'var(--tag-personal-bg)', text: 'var(--tag-personal-text)' },
    'ideas': { bg: 'var(--tag-ideas-bg)', text: 'var(--tag-ideas-text)' },
    'tasks': { bg: 'var(--tag-tasks-bg)', text: 'var(--tag-tasks-text)' },
    'urgent': { bg: 'var(--tag-urgent-bg)', text: 'var(--tag-urgent-text)' },
    'default': { bg: 'var(--tag-default-bg)', text: 'var(--tag-default-text)' },
};

export const getAnchorColor = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('work') || lowerTitle.includes('school') || lowerTitle.includes('meeting')) {
        return 'bg-[var(--context-work)] text-white';
    }
    if (lowerTitle.includes('gym') || lowerTitle.includes('workout') || lowerTitle.includes('health') || lowerTitle.includes('fitness') || lowerTitle.includes('doctor') || lowerTitle.includes('focus') || lowerTitle.includes('deep work')) {
        return 'bg-[var(--context-focus)] text-white';
    }
    if (lowerTitle.includes('family') || lowerTitle.includes('kids') || lowerTitle.includes('social') || lowerTitle.includes('date')) {
        return 'bg-[var(--context-social)] text-white';
    }
    if (lowerTitle.includes('relax') || lowerTitle.includes('recovery') || lowerTitle.includes('chill')) {
        return 'bg-[var(--context-recovery)] text-white';
    }
    
    return 'bg-[var(--context-default)] text-white';
};

const creativeTheme: ThemeProperties = {
  '--color-bg-h': 30, '--color-bg-s': '25%', '--color-bg-l': '97.1%', // Updated for #FAF9F7
  '--color-surface-h': 0, '--color-surface-s': '0%', '--color-surface-l': '100%',
  '--color-surface-sunken-h': 30, '--color-surface-sunken-s': '18.2%', '--color-surface-sunken-l': '94.1%',
  '--color-text-primary-h': 21, '--color-text-primary-s': '28.9%', '--color-text-primary-l': '18.6%',
  '--color-text-secondary-h': 21, '--color-text-secondary-s': '15.4%', '--color-text-secondary-l': '29.2%',
  '--color-text-subtle-h': 21, '--color-text-subtle-s': '12.3%', '--color-text-subtle-l': '36%', // Adjusted from 38% for WCAG AA
  '--color-border-h': 30, '--color-border-s': '16.7%', '--color-border-l': '85%',
  '--color-border-hover-h': 30, '--color-border-hover-s': '12.5%', '--color-border-hover-l': '78%',
  '--color-primary-accent-h': 11, '--color-primary-accent-s': '55.4%', '--color-primary-accent-l': '54.3%',
  '--color-primary-accent-text-h': 0, '--color-primary-accent-text-s': '0%', '--color-primary-accent-text-l': '100%',
  '--color-secondary-accent-h': 147, '--color-secondary-accent-s': '27.6%', '--color-secondary-accent-l': '42%',
  '--color-secondary-accent-text-h': 0, '--color-secondary-accent-text-s': '0%', '--color-secondary-accent-text-l': '100%',
  '--color-success-h': 147, '--color-success-s': '27.6%', '--color-success-l': '42%',
  '--color-warning-h': 40, '--color-warning-s': '94.4%', '--color-warning-l': '57.1%',
  '--color-danger-h': 352, '--color-danger-s': '98.4%', '--color-danger-l': '41%',
};

const focusTheme: ThemeProperties = {
  '--color-bg-h': 30, '--color-bg-s': '25%', '--color-bg-l': '97.1%', // Updated for #FAF9F7
  '--color-surface-h': 210, '--color-surface-s': '40%', '--color-surface-l': '98%',
  '--color-surface-sunken-h': 210, '--color-surface-sunken-s': '40%', '--color-surface-sunken-l': '96.1%',
  '--color-text-primary-h': 222, '--color-text-primary-s': '39.4%', '--color-text-primary-l': '11.2%',
  '--color-text-secondary-h': 221, '--color-text-secondary-s': '21.6%', '--color-text-secondary-l': '26.7%',
  '--color-text-subtle-h': 220, '--color-text-subtle-s': '9.4%', '--color-text-subtle-l': '37%',
  '--color-border-h': 220, '--color-border-s': '13.9%', '--color-border-l': '88%',
  '--color-border-hover-h': 216, '--color-border-hover-s': '12.1%', '--color-border-hover-l': '80%',
  '--color-primary-accent-h': 221, '--color-primary-accent-s': '83.1%', '--color-primary-accent-l': '53.3%',
  '--color-primary-accent-text-h': 0, '--color-primary-accent-text-s': '0%', '--color-primary-accent-text-l': '100%',
  '--color-secondary-accent-h': 244, '--color-secondary-accent-s': '75.8%', '--color-secondary-accent-l': '58.4%',
  '--color-secondary-accent-text-h': 0, '--color-secondary-accent-text-s': '0%', '--color-secondary-accent-text-l': '100%',
  '--color-success-h': 147, '--color-success-s': '27.6%', '--color-success-l': '42%',
  '--color-warning-h': 40, '--color-warning-s': '94.4%', '--color-warning-l': '57.1%',
  '--color-danger-h': 352, '--color-danger-s': '98.4%', '--color-danger-l': '41%',
};

const recoveryTheme: ThemeProperties = {
  '--color-bg-h': 30, '--color-bg-s': '25%', '--color-bg-l': '97.1%', // Updated for #FAF9F7
  '--color-surface-h': 0, '--color-surface-s': '0%', '--color-surface-l': '100%',
  '--color-surface-sunken-h': 160, '--color-surface-sunken-s': '18.5%', '--color-surface-sunken-l': '93.5%',
  '--color-text-primary-h': 162, '--color-text-primary-s': '10.5%', '--color-text-primary-l': '28.6%',
  '--color-text-secondary-h': 163, '--color-text-secondary-s': '7.7%', '--color-text-secondary-l': '34%',
  '--color-text-subtle-h': 163, '--color-text-subtle-s': '6.4%', '--color-text-subtle-l': '35%', // Adjusted from 37.5% for WCAG AA
  '--color-border-h': 167, '--color-border-s': '13.2%', '--color-border-l': '84%',
  '--color-border-hover-h': 165, '--color-border-hover-s': '11.1%', '--color-border-hover-l': '77%',
  '--color-primary-accent-h': 147, '--color-primary-accent-s': '27.6%', '--color-primary-accent-l': '42%',
  '--color-primary-accent-text-h': 0, '--color-primary-accent-text-s': '0%', '--color-primary-accent-text-l': '100%',
  '--color-secondary-accent-h': 212, '--color-secondary-accent-s': '71.4%', '--color-secondary-accent-l': '59.2%',
  '--color-secondary-accent-text-h': 0, '--color-secondary-accent-text-s': '0%', '--color-secondary-accent-text-l': '100%',
  '--color-success-h': 147, '--color-success-s': '27.6%', '--color-success-l': '42%',
  '--color-warning-h': 40, '--color-warning-s': '94.4%', '--color-warning-l': '57.1%',
  '--color-danger-h': 352, '--color-danger-s': '98.4%', '--color-danger-l': '41%',
};

const eveningTheme: ThemeProperties = {
  '--color-bg-h': 0, '--color-bg-s': '0%', '--color-bg-l': '11%', // Updated for #1C1C1C
  '--color-surface-h': 0, '--color-surface-s': '0%', '--color-surface-l': '15%',
  '--color-surface-sunken-h': 0, '--color-surface-sunken-s': '0%', '--color-surface-sunken-l': '8%',
  '--color-text-primary-h': 210, '--color-text-primary-s': '40%', '--color-text-primary-l': '96.1%',
  '--color-text-secondary-h': 216, '--color-text-secondary-s': '12.1%', '--color-text-secondary-l': '83.9%',
  '--color-text-subtle-h': 215, '--color-text-subtle-s': '9.1%', '--color-text-subtle-l': '70%',
  '--color-border-h': 0, '--color-border-s': '0%', '--color-border-l': '20%',
  '--color-border-hover-h': 0, '--color-border-hover-s': '0%', '--color-border-hover-l': '25%',
  '--color-primary-accent-h': 11, '--color-primary-accent-s': '66.7%', '--color-primary-accent-l': '63.9%',
  '--color-primary-accent-text-h': 0, '--color-primary-accent-text-s': '0%', '--color-primary-accent-text-l': '100%',
  '--color-secondary-accent-h': 158, '--color-secondary-accent-s': '64.1%', '--color-secondary-accent-l': '67.3%',
  '--color-secondary-accent-text-h': 159, '--color-secondary-accent-text-s': '84.8%', '--color-secondary-accent-text-l': '17.3%',
  '--color-success-h': 147, '--color-success-s': '27.6%', '--color-success-l': '42%',
  '--color-warning-h': 40, '--color-warning-s': '94.4%', '--color-warning-l': '57.1%',
  '--color-danger-h': 352, '--color-danger-s': '98.4%', '--color-danger-l': '41%',
};

export const themes: Record<ThemeName, ThemeProperties> = {
    Creative: creativeTheme,
    Focus: focusTheme,
    Recovery: recoveryTheme,
    Evening: eveningTheme,
};

export const themePresets: Record<PresetName, CustomThemeProperties> = {
    'Default': {
        animationSpeed: 1,
        colorIntensity: 1,
        uiContrastLevel: 1,
        textContrastLevel: 1,
    },
    'High Contrast': {
        animationSpeed: 1,
        colorIntensity: 1.1,
        uiContrastLevel: 1.1,
        textContrastLevel: 1.4,
    },
    'Reduced Motion': {
        animationSpeed: 0.1,
        colorIntensity: 1,
        uiContrastLevel: 1,
        textContrastLevel: 1,
    },
    'Minimal Stimulation': {
        animationSpeed: 0,
        colorIntensity: 0.5,
        uiContrastLevel: 0.95,
        textContrastLevel: 1.05,
    }
};