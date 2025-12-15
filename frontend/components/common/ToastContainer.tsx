"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  const colors = {
    success: "bg-emerald-600/90 text-white",
    error: "bg-red-600/90 text-white",
    info: "bg-blue-600/90 text-white",
    warning: "bg-amber-600/90 text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100 }}
      className={`${colors[type]} rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 min-w-[300px]`}
    >
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="text-white/80 hover:text-white">
        ✕
      </button>
    </motion.div>
  );
};

let toastId = 0;

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const toastState: { items: ToastItem[]; listeners: Array<(items: ToastItem[]) => void> } = {
  items: [],
  listeners: [],
};

export const toast = {
  success: (message: string) => addToast(message, "success"),
  error: (message: string) => addToast(message, "error"),
  info: (message: string) => addToast(message, "info"),
  warning: (message: string) => addToast(message, "warning"),
};

function addToast(message: string, type: ToastType) {
  const id = `toast-${toastId++}`;
  toastState.items = [...toastState.items, { id, message, type }];
  toastState.listeners.forEach((fn) => fn(toastState.items));
  setTimeout(() => removeToast(id), 4000);
}

function removeToast(id: string) {
  toastState.items = toastState.items.filter((t) => t.id !== id);
  toastState.listeners.forEach((fn) => fn(toastState.items));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  if (typeof window !== "undefined" && !toastState.listeners.includes(setToasts)) {
    toastState.listeners.push(setToasts);
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
