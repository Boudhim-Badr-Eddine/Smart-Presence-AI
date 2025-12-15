"use client";

import RoleNavBar from "@/components/common/RoleNavBar";
import CommandPalette from "@/components/CommandPalette";
import ConnectionStatus from "@/components/ConnectionStatus";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingOverlay } from "@/components/ui/spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingOverlay text="Chargement..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <RoleNavBar />
      <CommandPalette />
      <ConnectionStatus />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
