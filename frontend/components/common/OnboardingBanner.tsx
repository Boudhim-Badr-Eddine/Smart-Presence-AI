"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import Link from "next/link";

interface OnboardingBannerProps {
  title?: string;
  tips?: { label: string; href?: string }[];
}

export function OnboardingBanner({
  title = "Quick start tips",
  tips = [
    { label: "Mark attendance", href: "/admin/sessions" },
    { label: "Review alerts", href: "/admin/alerts" },
    { label: "Export reports", href: "/admin/reports" },
  ],
}: OnboardingBannerProps) {
  return (
    <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-50/10 px-4 py-3 text-amber-50 shadow-lg shadow-amber-900/30 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-amber-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
            <Lightbulb className="h-4 w-4" />
            {title}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tips.map((tip) => (
              <Link
                key={tip.label}
                href={tip.href || "#"}
                className="rounded-full border border-amber-300/30 bg-amber-100/10 px-3 py-1 text-xs font-medium text-amber-50 transition hover:border-amber-200/60 hover:bg-amber-200/10"
              >
                {tip.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
