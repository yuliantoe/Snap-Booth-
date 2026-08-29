import React from 'react';
import { Home, LayoutGrid, Camera, PrinterCheck, Lock } from 'lucide-react';
import { StepType, UserAccount } from '../types';

interface StepIndicatorProps {
  currentStep: StepType;
  currentUser?: UserAccount | null;
  onSelectStep: (step: StepType) => void;
  canNavigateTo: (step: StepType) => boolean;
  onOpenAuthModal?: () => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  currentUser,
  onSelectStep,
  canNavigateTo,
  onOpenAuthModal,
}) => {
  const isLoggedIn = Boolean(currentUser);

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
      label: '3. Preview & Cetak',
      icon: <PrinterCheck className="w-4 h-4" />,
    },
  ];

  const handleStepClick = (stepId: StepType) => {
    if (!isLoggedIn && stepId !== 'welcome') {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (canNavigateTo(stepId)) {
      onSelectStep(stepId);
    }
  };

  return (
    <div className="w-full bg-slate-950/80 border-b border-slate-800/80 px-3 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isAllowed = canNavigateTo(step.id);
          const isLockedByAuth = !isLoggedIn && step.id !== 'welcome';

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!isAllowed && !isLockedByAuth}
                title={
                  isLockedByAuth
                    ? 'Menu foto tidak aktif: Silakan login terlebih dahulu'
                    : isAllowed
                    ? `Beralih ke ${step.label}`
                    : 'Langkah ini belum dapat diakses'
                }
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-500 text-white font-semibold shadow-md shadow-rose-500/20'
                    : isLockedByAuth
                    ? 'bg-slate-900/60 text-slate-500 hover:text-amber-300 hover:bg-slate-800/80 border border-transparent hover:border-amber-500/30 cursor-pointer'
                    : isAllowed
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer'
                    : 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                {isLockedByAuth ? <Lock className="w-3.5 h-3.5 text-amber-400/80" /> : step.icon}
                <span className="hidden xs:inline whitespace-nowrap">{step.label}</span>
                {isLockedByAuth && (
                  <span className="hidden md:inline text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    Kunci
                  </span>
                )}
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
