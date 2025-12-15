"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Download, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";

type ScheduleSession = {
  id: number;
  subject: string;
  trainer: string;
  time_start: string;
  time_end: string;
  classroom: string;
  day: string;
  day_of_week: number;
};

type Props = {
  sessions: ScheduleSession[];
};

export default function ScheduleClient({ sessions }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

  const filteredSessions = selectedDay 
    ? sessions.filter(s => s.day_of_week === selectedDay) 
    : sessions;

  const handleExportICS = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartPresence//Schedule//EN",
      "CALSCALE:GREGORIAN",
      ...(sessions.map(s => [
        "BEGIN:VEVENT",
        `DTSTART:20250120T${s.time_start.replace(':', '')}00`,
        `DTEND:20250120T${s.time_end.replace(':', '')}00`,
        `SUMMARY:${s.subject}`,
        `LOCATION:${s.classroom}`,
        `DESCRIPTION:Formateur: ${s.trainer}`,
        "END:VEVENT",
      ]).flat() || []),
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "emploi-temps.ics";
    link.click();
  };

  const handleExportGoogle = () => {
    const event = sessions[0];
    if (!event) return;
    const startDate = `20250120T${event.time_start.replace(':', '')}00Z`;
    const endDate = `20250120T${event.time_end.replace(':', '')}00Z`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.subject)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(`Formateur: ${event.trainer}`)}&location=${encodeURIComponent(event.classroom)}`;
    window.open(url, '_blank');
  };

  const handleExportOutlook = () => {
    const event = sessions[0];
    if (!event) return;
    const startDate = `20250120T${event.time_start.replace(':', '')}00`;
    const endDate = `20250120T${event.time_end.replace(':', '')}00`;
    const url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=${encodeURIComponent(event.subject)}&startdt=${startDate}&enddt=${endDate}&body=${encodeURIComponent(`Formateur: ${event.trainer}`)}&location=${encodeURIComponent(event.classroom)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleExportICS}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Download className="h-4 w-4" />
          Exporter (.ics)
        </button>
        <button
          onClick={handleExportGoogle}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
        >
          <Calendar className="h-4 w-4" />
          Google Calendar
        </button>
        <button
          onClick={handleExportOutlook}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
        >
          <Calendar className="h-4 w-4" />
          Outlook
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDay(null)}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            selectedDay === null
              ? 'bg-blue-600 text-white'
              : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          Tous les jours
        </button>
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx + 1)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              selectedDay === idx + 1
                ? 'bg-blue-600 text-white'
                : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSessions?.map((session, idx) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-lg border border-white/10 bg-white/5 p-5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:border-blue-500/30 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">{session.subject}</h3>
              <span className="rounded-full bg-blue-600/20 px-2 py-1 text-xs text-blue-300">{session.day}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-300 light:text-gray-600">
                <Clock className="h-4 w-4 text-amber-300" />
                {session.time_start} - {session.time_end}
              </div>
              <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-300 light:text-gray-600">
                <MapPin className="h-4 w-4 text-emerald-300" />
                Salle {session.classroom}
              </div>
              <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-300 light:text-gray-600">
                <User className="h-4 w-4 text-blue-300" />
                {session.trainer}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {(!filteredSessions || filteredSessions.length === 0) && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-amber-300 mb-2" />
          <p className="text-white dark:text-white light:text-gray-900">Aucune session pour ce jour</p>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Résumé de la semaine</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-blue-600/10 p-4 border border-blue-600/20">
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Total de sessions</p>
            <p className="text-2xl font-bold text-blue-300">{sessions.length}</p>
          </div>
          <div className="rounded-lg bg-emerald-600/10 p-4 border border-emerald-600/20">
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Heures de formation</p>
            <p className="text-2xl font-bold text-emerald-300">
              {sessions.reduce((acc, s) => {
                const start = parseInt(s.time_start.split(':')[0]);
                const end = parseInt(s.time_end.split(':')[0]);
                return acc + (end - start);
              }, 0)}h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

