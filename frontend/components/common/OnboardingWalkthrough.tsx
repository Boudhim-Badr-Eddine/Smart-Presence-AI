"use client";
import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = {
  title: string;
  content: string;
  target?: string;
};

const steps: Step[] = [
  {
    title: "Bienvenue sur SmartPresence",
    content: "Ce guide rapide vous aidera à découvrir les fonctionnalités principales.",
  },
  {
    title: "Notifications",
    content: "Consultez vos alertes et gérez vos préférences depuis le centre de notifications.",
    target: "notifications",
  },
  {
    title: "Calendrier",
    content: "Visualisez vos cours, examens et rappels dans un calendrier unifié.",
    target: "calendar",
  },
  {
    title: "Profil",
    content: "Personnalisez votre expérience : direction, thème, langue et palette.",
    target: "profile",
  },
];

export default function OnboardingWalkthrough() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("spa_onboarding_seen");
    if (!seen) {
      setActive(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem("spa_onboarding_seen", "true");
    setActive(false);
  };

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative mx-4 max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{step.content}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full ${
                      i === currentStep ? "bg-blue-500" : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {currentStep < steps.length - 1 ? "Suivant" : "Terminer"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
