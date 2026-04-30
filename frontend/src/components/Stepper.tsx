import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm transition-all ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isActive
                    ? 'bg-accent-primary text-white'
                    : 'bg-white border border-border-subtle text-text-secondary'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
              </div>
              <span
                className={`mt-2 text-xs font-sans ${
                  isActive ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mx-2 mb-6 transition-all ${
                  stepNumber < currentStep ? 'bg-success' : 'bg-border-subtle'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
