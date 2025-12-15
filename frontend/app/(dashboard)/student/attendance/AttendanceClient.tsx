"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";

type AttendanceRecord = {
  id: number;
  date: string;
  subject: string;
  status: "present" | "absent" | "late" | "excused";
  justified: boolean;
};

type Props = {
  records: AttendanceRecord[];
};

export default function AttendanceClient({ records }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = records.filter((r) => filter === "all" || r.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "late":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "excused":
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return "Présent";
      case "absent":
        return "Absent";
      case "late":
        return "Retard";
      case "excused":
        return "Excusé";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-600/20 text-emerald-300";
      case "absent":
        return "bg-red-600/20 text-red-300";
      case "late":
        return "bg-amber-600/20 text-amber-300";
      case "excused":
        return "bg-blue-600/20 text-blue-300";
      default:
        return "bg-zinc-600/20 text-zinc-300";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "present", "absent", "late", "excused"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? "bg-amber-600 text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 light:bg-gray-100 light:text-gray-600 light:hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Tous" : getStatusLabel(f)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <table className="w-full">
          <thead className="bg-white/5 dark:bg-white/5 light:bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">Matière</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">Justifié</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr
                key={record.id}
                className="border-t border-white/10 dark:border-white/10 light:border-gray-200 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-white dark:text-white light:text-gray-900">{record.date}</td>
                <td className="px-4 py-3 text-sm text-white dark:text-white light:text-gray-900">{record.subject}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    {getStatusLabel(record.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  {record.justified ? "Oui" : "Non"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Aucun enregistrement trouvé
          </div>
        )}
      </div>
    </div>
  );
}
