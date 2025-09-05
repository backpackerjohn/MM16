import React from 'react';

type MigrationStatus = 'migrating' | 'success' | 'error';

interface MigrationModalProps {
  status: MigrationStatus;
  onClose: () => void;
}

const MigrationModal: React.FC<MigrationModalProps> = ({ status, onClose }) => {
    const content = {
        migrating: {
            title: 'Syncing to the Cloud...',
            message: 'Please wait while we securely transfer your local data. This is a one-time process.',
            showSpinner: true,
            button: null,
        },
        success: {
            title: 'Sync Complete!',
            message: 'Your data is now backed up and available across devices.',
            showSpinner: false,
            button: 'Get Started',
        },
        error: {
            title: 'Sync Failed',
            message: 'We couldn\'t transfer your data. Your local data is safe. We\'ll try again next time.',
            showSpinner: false,
            button: 'Continue Offline',
        },
    };

    const { title, message, showSpinner, button } = content[status];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="migration-title">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-md text-center transform transition-all">
                {showSpinner && (
                    <svg className="animate-spin mx-auto h-12 w-12 text-[var(--color-primary-accent)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                <h2 id="migration-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
                <p className="text-[var(--color-text-secondary)]">{message}</p>
                {button && (
                    <button onClick={onClose} className="mt-6 w-full px-6 py-3 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md">
                        {button}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MigrationModal;