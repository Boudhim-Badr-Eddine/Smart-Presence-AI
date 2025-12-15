"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MessagesClient = dynamic(() => import("./MessagesClient"), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  ),
  ssr: false,
});

export default function MessagesPage() {
  return (
    <RoleGuard allow={["student", "trainer"]}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: "Messagerie" }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Messagerie</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Communiquez avec les formateurs et étudiants
          </p>
        </div>

        <MessagesClient />
      </div>
    </RoleGuard>
  );
}
