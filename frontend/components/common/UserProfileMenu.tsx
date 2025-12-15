'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

export default function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu utilisateur"
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:hover:bg-gray-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-semibold text-white">
          {getInitials()}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
            {user.email}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            {user.role}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-white/10 bg-zinc-900 shadow-xl dark:border-white/10 dark:bg-zinc-900 light:border-gray-200 light:bg-white light:shadow-lg">
          <div className="border-b border-white/10 p-4 dark:border-white/10 light:border-gray-200">
            <p className="font-medium text-white dark:text-white light:text-gray-900">
              {user.email}
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              {user.role}
            </p>
          </div>

          <div className="p-2">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/10 light:text-gray-700 light:hover:bg-gray-100"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Mode clair
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Mode sombre
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/10 light:text-gray-700 light:hover:bg-gray-100"
            >
              <Settings className="h-4 w-4" />
              Paramètres
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
