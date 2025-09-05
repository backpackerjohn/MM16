import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps, stepLabels }) => {
  return (
    <div className="flex items-center w-full mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center text-center w-20">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                    : isActive
                    ? 'bg-transparent border-[var(--color-primary-accent)] text-[var(--color-primary-accent)] scale-110'
                    : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-subtle)]'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <p
                className={`mt-2 text-xs font-semibold transition-colors duration-300 ${
                  isActive || isCompleted ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-subtle)]'
                }`}
              >
                {stepLabels[index]}
              </p>
            </div>
            {step < totalSteps && (
              <div
                className={`flex-1 h-1 mx-2 transition-colors duration-500 rounded-full ${
                  isCompleted ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                }`}
              ></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
