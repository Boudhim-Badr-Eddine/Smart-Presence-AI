'use client';
import { motion } from 'framer-motion';
import { Moon, Sun, Contrast } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      aria-label={
        theme === 'dark'
          ? 'Passer au mode clair'
          : theme === 'light'
            ? 'Passer au mode contraste élevé'
            : 'Passer au mode sombre'
      }
      className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 light:border-gray-300 light:bg-gray-100 light:hover:bg-gray-200"
    >
      {theme === 'dark' && <Moon className="h-5 w-5" />}
      {theme === 'light' && <Sun className="h-5 w-5" />}
      {theme === 'contrast' && <Contrast className="h-5 w-5" />}
    </motion.button>
  );
}
