'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Clock, MapPin, User, Download, Plus } from 'lucide-react';
import { getApiBase } from '@/lib/config';

const apiBase = getApiBase();

type Event = {
  id: number;
  title: string;
  date: string;
  time?: string;
  location?: string;
  type: 'class' | 'exam' | 'reminder';
  description?: string;
};

export default function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: events = [] } = useQuery({
    queryKey: ['student-calendar', currentMonth.getMonth(), currentMonth.getFullYear()],
    queryFn: async () => {
      const res = await axios
        .get(`${apiBase}/api/student/calendar`, {
          params: { month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() },
        })
        .catch(() => ({
          data: [
            {
              id: 1,
              title: 'Développement Web',
              date: '2025-01-15',
              time: '09:00',
              location: 'A101',
              type: 'class',
              description: 'Cours avec M. Ahmed',
            },
            {
              id: 2,
              title: 'Examen Database',
              date: '2025-01-20',
              time: '14:00',
              location: 'B203',
              type: 'exam',
            },
          ],
        }));
      return res.data as Event[];
    },
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(
      day,
    ).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleExportGoogle = (event: Event) => {
    const startDate = `${event.date.replace(/-/g, '')}T${(event.time || '09:00').replace(':', '')}00Z`;
    const endDate = `${event.date.replace(/-/g, '')}T${(event.time || '10:00').replace(':', '')}00Z`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title,
    )}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(
      event.location || '',
    )}`;
    window.open(url, '_blank');
  };

  const handleExportOutlook = (event: Event) => {
    const startDate = `${event.date.replace(/-/g, '')}T${(event.time || '09:00').replace(':', '')}00`;
    const endDate = `${event.date.replace(/-/g, '')}T${(event.time || '10:00').replace(':', '')}00`;
    const url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=${encodeURIComponent(
      event.title,
    )}&startdt=${startDate}&enddt=${endDate}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(
      event.location || '',
    )}`;
    window.open(url, '_blank');
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
      case 'exam':
        return 'bg-red-600/20 text-red-300 border-red-600/30';
      case 'reminder':
        return 'bg-amber-600/20 text-amber-300 border-amber-600/30';
      default:
        return 'bg-zinc-600/20 text-zinc-300 border-zinc-600/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-gray-50 light:text-gray-900 light:hover:bg-gray-100"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-gray-50 light:text-gray-900 light:hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={i}
                className={`min-h-[100px] rounded-lg border p-2 ${
                  day
                    ? 'border-white/10 bg-white/2 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50'
                    : 'border-transparent'
                }`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium text-white dark:text-white light:text-gray-900 mb-1">
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs rounded px-1 py-0.5 border truncate cursor-pointer ${getEventTypeColor(
                            event.type,
                          )}`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Événements à venir
        </h2>
        {events.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600 text-center py-8">
            Aucun événement ce mois-ci
          </p>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between rounded-lg border border-white/10 bg-white/2 p-4 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}
                    >
                      {event.type === 'class'
                        ? 'Cours'
                        : event.type === 'exam'
                          ? 'Examen'
                          : 'Rappel'}
                    </span>
                    <h3 className="font-medium text-white dark:text-white light:text-gray-900 truncate">
                      {event.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {event.date}
                    </span>
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportGoogle(event)}
                    className="p-2 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition"
                    title="Ajouter à Google Calendar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleExportOutlook(event)}
                    className="p-2 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition"
                    title="Ajouter à Outlook"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
