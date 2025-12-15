/**
 * Onboarding tour system with step-by-step tooltips.
 * Guides first-time users through key features.
 */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

export type TourStep = {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  action?: {
    label: string;
    onClick: () => void;
  };
};

type OnboardingTourProps = {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  autoStart?: boolean;
};

export default function OnboardingTour({
  tourId,
  steps,
  onComplete,
  autoStart = false,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Check if tour was already completed
    const completed = localStorage.getItem(`tour_${tourId}_completed`);
    if (!completed && autoStart) {
      setIsActive(true);
    }
  }, [tourId, autoStart]);

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      const target = document.querySelector(step.target);
      
      if (target) {
        const rect = target.getBoundingClientRect();
        const placement = step.placement || "bottom";
        
        let top = 0;
        let left = 0;

        switch (placement) {
          case "top":
            top = rect.top - 20;
            left = rect.left + rect.width / 2;
            break;
          case "bottom":
            top = rect.bottom + 20;
            left = rect.left + rect.width / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2;
            left = rect.left - 20;
            break;
          case "right":
            top = rect.top + rect.height / 2;
            left = rect.right + 20;
            break;
        }

        setPosition({ top, left });
        
        // Highlight target
        target.classList.add("tour-highlight");
        return () => target.classList.remove("tour-highlight");
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`tour_${tourId}_completed`, "true");
    setIsActive(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />

      {/* Spotlight effect */}
      <AnimatePresence>
        {step && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[101]"
            style={{
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative max-w-sm rounded-xl border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl">
              {/* Progress */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-8 rounded-full ${
                        idx === currentStep
                          ? "bg-amber-500"
                          : idx < currentStep
                          ? "bg-amber-500/50"
                          : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleSkip}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Passer
                </button>
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-zinc-300">{step.content}</p>
              </div>

              {/* Action button */}
              {step.action && (
                <button
                  onClick={step.action.onClick}
                  className="mb-4 w-full rounded-lg bg-amber-600/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-600/30"
                >
                  {step.action.label}
                </button>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Précédent
                </button>
                <span className="text-xs text-zinc-400">
                  {currentStep + 1} / {steps.length}
                </span>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
                >
                  {isLastStep ? (
                    <>
                      <Check className="h-4 w-4" />
                      Terminé
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Arrow pointer */}
            <div
              className={`absolute h-0 w-0 border-8 ${
                step.placement === "top"
                  ? "left-1/2 top-full -translate-x-1/2 border-b-0 border-l-transparent border-r-transparent border-t-zinc-900"
                  : step.placement === "left"
                  ? "left-full top-1/2 -translate-y-1/2 border-l-zinc-900 border-r-0 border-b-transparent border-t-transparent"
                  : step.placement === "right"
                  ? "right-full top-1/2 -translate-y-1/2 border-r-zinc-900 border-l-0 border-b-transparent border-t-transparent"
                  : "left-1/2 bottom-full -translate-x-1/2 border-t-0 border-l-transparent border-r-transparent border-b-zinc-900"
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 102;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3);
          border-radius: 0.5rem;
        }
      `}</style>
    </>
  );
}

/**
 * Hook to trigger a tour programmatically.
 */
export function useOnboardingTour(tourId: string) {
  const [isActive, setIsActive] = useState(false);

  const startTour = () => {
    localStorage.removeItem(`tour_${tourId}_completed`);
    setIsActive(true);
  };

  const resetTour = () => {
    localStorage.removeItem(`tour_${tourId}_completed`);
  };

  return { isActive, startTour, resetTour };
}
