import React from 'react';
import { Home, LayoutGrid, Camera, PrinterCheck } from 'lucide-react';
import { StepType } from '../types';

interface StepIndicatorProps {
  currentStep: StepType;
  onSelectStep: (step: StepType) => void;
  canNavigateTo: (step: StepType) => boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  canNavigateTo,
}) => {
  const steps: { id: StepType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'welcome',
      label: 'Menu Start',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'capture',
      label: '1. Ambil Foto',
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: 'theme_layout',
      label: '2. Tata Letak & Tema',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      id: 'export',
      label: '3. Cetak & Bagikan',
      icon: <PrinterCheck className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-full bg-slate-950/80 border-b border-slate-800/80 px-3 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isAllowed = canNavigateTo(step.id);

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => isAllowed && onSelectStep(step.id)}
                disabled={!isAllowed}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-500 text-white font-semibold shadow-md shadow-rose-500/20'
                    : isAllowed
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                {step.icon}
                <span className="hidden xs:inline whitespace-nowrap">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] bg-slate-800 hidden sm:block max-w-[30px]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
