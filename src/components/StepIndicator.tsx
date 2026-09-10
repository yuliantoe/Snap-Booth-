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
    <div className="w-full bg-[#f8f9fa] border-b border-stone-200 px-3 py-2 sm:py-2.5">
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
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white font-semibold shadow-sm border border-orange-500'
                    : isLockedByAuth
                    ? 'bg-stone-100 text-stone-400 hover:text-orange-600 hover:bg-orange-50 border border-stone-200 hover:border-orange-200 cursor-pointer'
                    : isAllowed
                    ? 'bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 border border-stone-200 cursor-pointer shadow-xs'
                    : 'bg-stone-100/70 text-stone-400 border border-stone-200/50 cursor-not-allowed'
                }`}
              >
                {isLockedByAuth ? <Lock className="w-3.5 h-3.5 text-orange-500" /> : step.icon}
                <span className="hidden xs:inline whitespace-nowrap">{step.label}</span>
                {isLockedByAuth && (
                  <span className="hidden md:inline text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                    LOCKED
                  </span>
                )}
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px bg-stone-200 hidden sm:block max-w-[28px]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
