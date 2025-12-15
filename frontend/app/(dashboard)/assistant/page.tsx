"use client";

import Chatbot from "@/components/Chatbot";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import RoleGuard from "@/components/auth/RoleGuard";
import { Sparkles, MessageSquare } from "lucide-react";

export default function AssistantPage() {
  return (
    <RoleGuard allow={["admin", "trainer", "student"]}>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Breadcrumbs items={[{ label: "Assistant IA" }]} />
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-black p-6">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,179,71,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.1),transparent_30%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                <Sparkles className="h-4 w-4" /> Smart Presence
              </p>
              <h1 className="text-3xl font-semibold text-white">Assistant IA temps-réel</h1>
              <p className="max-w-2xl text-sm text-white/70">
                Posez vos questions sur les présences, les sessions, ou les notifications. L&apos;assistant se base sur vos données et garde le contexte de la conversation.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-amber-100/80">
                <span className="rounded-full bg-amber-500/20 px-3 py-1">Dashboards admin / formateur / étudiant</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Suivi absences et alertes</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Prompts rapides prêts à l&apos;emploi</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-lg">
              <MessageSquare className="h-5 w-5 text-amber-300" />
              <div>
                <p className="font-semibold text-white">Chatbot disponible</p>
                <p className="text-xs text-white/70">Vous pouvez fermer cette page, la conversation reste enregistrée.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <Chatbot />
        </div>
      </div>
    </RoleGuard>
  );
}
