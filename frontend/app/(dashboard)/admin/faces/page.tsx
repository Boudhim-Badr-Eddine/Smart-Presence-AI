'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import RoleGuard from '@/components/auth/RoleGuard'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { Camera, RefreshCw, Trash2, User, Sparkles, Bot, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import ErrorBanner from '@/components/ui/ErrorBanner'
import EmptyState from '@/components/ui/EmptyState'
import { getApiBase } from '@/lib/config'
import { getWebSocketManager } from '@/lib/websocket'
import AdvancedFilters from '@/components/ui/AdvancedFilters'
import OnboardingTour from '@/components/OnboardingTour'

interface UserRow {
  id: number
  email: string
  role: string
  first_name: string
  last_name: string
}

export default function AdminFacesPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})

  const apiBase = getApiBase();
  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('spa_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(authHeaders as Record<string, string>),
      };

      const params = new URLSearchParams()
      if (filters.role) params.append('role', String(filters.role))
      if (filters.search) params.append('search', String(filters.search))

      const res = await fetch(`${apiBase}/api/admin/users?${params.toString()}`, { headers });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Impossible de charger les utilisateurs (${res.status}): ${text.slice(0, 120)}`)
      }

      const data = await res.json();
      setUsers(Array.isArray(data?.users) ? data.users : users)
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [apiBase, authHeaders, users, filters])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // WebSocket real-time updates
  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsubCreate = ws.subscribe('user_created', () => loadUsers());
    const unsubUpdate = ws.subscribe('user_updated', () => loadUsers());
    const unsubDelete = ws.subscribe('user_deleted', () => loadUsers());
    return () => { unsubCreate(); unsubUpdate(); unsubDelete(); };
  }, [loadUsers])

  return (
    <RoleGuard allow={["admin"]}>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Breadcrumbs items={[{ label: "Administration", href: "/admin" }, { label: "Enrôlement Facial" }]} />

        <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 via-zinc-950 to-black p-6">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(45,212,191,0.12),transparent_30%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-200">
                <Sparkles className="h-4 w-4" /> Biométrie
              </p>
              <h1 className="text-3xl font-semibold text-white">Enrôlement facial</h1>
              <p className="max-w-2xl text-sm text-white/70">Suivez l&apos;état des captures, ré-enrôlez et supprimez en quelques secondes.</p>
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1">Check API + token</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Actions rapides</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Réponse dynamique</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-lg">
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Synchro API
              </div>
              <p className="text-2xl font-semibold text-white">{users.length}</p>
              <p className="text-xs text-white/60">Profils avec données faciales</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[{
            label: 'Enrôlés page',
            value: users.length,
            tone: 'text-emerald-200',
            bg: 'bg-emerald-500/15'
          }, {
            label: 'Rafraîchir',
            value: 'Ctrl + R',
            tone: 'text-blue-200',
            bg: 'bg-blue-500/15'
          }, {
            label: 'Assistant IA',
            value: 'Questions directes',
            tone: 'text-amber-200',
            bg: 'bg-amber-500/15'
          }].map((card) => (
            <div key={card.label} className={`rounded-xl border border-white/10 ${card.bg} px-4 py-3 shadow-sm`}>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{card.label}</p>
              <p className={`text-lg font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {error && (
          <ErrorBanner
            type="error"
            title="Erreur de chargement"
            message={error}
            actionLabel="Réessayer"
            onAction={() => loadUsers()}
          />
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => loadUsers()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Rafraîchir
          </button>
          <AdvancedFilters
            filters={[
              { name: 'role', type: 'select', label: 'Rôle', options: [
                { id: 'admin', label: 'Admin' },
                { id: 'trainer', label: 'Formateur' },
                { id: 'student', label: 'Étudiant' },
              ] },
            ]}
            onApply={(f) => { setFilters(f); loadUsers(); }}
            onReset={() => { setFilters({}); loadUsers(); }}
            data-tour-id="faces-filters"
          />
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Camera className="h-4 w-4" /> Enrôler un utilisateur
          </Link>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5"
          >
            <Bot className="h-4 w-4" /> Poser une question
          </Link>
        </div>

        {loading ? (
          <div className="text-white/70 text-center py-12">Chargement…</div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Aucun profil facial"
            description="Lancez un enrôlement depuis la page Utilisateurs ou via la caméra."
            actionLabel="Enrôler un utilisateur"
            onAction={() => window.location.href = '/admin/users'}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white dark:text-white light:text-gray-900">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-600/20 px-2 py-1 text-xs text-blue-300">{user.role}</span>
                </div>
                
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 px-3 py-2 text-sm text-blue-300 hover:bg-blue-600/30 transition border border-blue-600/20">
                    <Camera className="h-4 w-4" />
                    Ré-enrôler
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-300 hover:bg-red-600/30 transition border border-red-600/20">
                    <Trash2 className="h-4 w-4" />
                    Supprimer les données
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {/* Onboarding tour */}
      <OnboardingTour
        tourId="faces"
        steps={[
          {
            target: "[data-tour-id='faces-filters']",
            title: "Filtres par rôle",
            content: "Affichez uniquement les profils pertinents par rôle.",
            placement: "bottom",
          },
          {
            target: "a[href='/admin/users']",
            title: "Enrôler rapidement",
            content: "Accédez à la page Utilisateurs pour capturer le visage.",
            placement: "right",
          },
          {
            target: "button:has(svg.lucide-refresh-cw)",
            title: "Actualisation",
            content: "Les mises à jour sont en temps réel; forcez ici si besoin.",
            placement: "right",
          },
        ]}
        autoStart
      />
    </RoleGuard>
  );
}
