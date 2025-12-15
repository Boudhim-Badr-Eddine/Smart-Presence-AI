"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBase } from "@/lib/config";

const AttendanceClient = dynamic(() => import("./AttendanceClient"), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

const apiBase = getApiBase();

type AttendanceRecord = {
  id: number;
  date: string;
  subject: string;
  status: "present" | "absent" | "late" | "excused";
  justified: boolean;
};

export default function AttendancePage() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["student-attendance"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/attendance`).catch(() => ({
        data: [
          { id: 1, date: "2025-01-12", subject: "Dev Web", status: "present", justified: false },
          { id: 2, date: "2025-01-11", subject: "Database", status: "absent", justified: true },
          { id: 3, date: "2025-01-10", subject: "Dev Web", status: "present", justified: false },
          { id: 4, date: "2025-01-09", subject: "Security", status: "late", justified: false },
          { id: 5, date: "2025-01-08", subject: "Dev Web", status: "present", justified: false },
        ],
      }));
      return res.data as AttendanceRecord[];
    },
  });

  return (
    <RoleGuard allow={["student"]}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: "Mon espace étudiant", href: "/student" }, { label: "Historique de présence" }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Historique de présence</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Consultez vos enregistrements de présence
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AttendanceClient records={records} />
        )}
      </div>
    </RoleGuard>
  );
}
