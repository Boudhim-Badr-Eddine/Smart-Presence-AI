'use client';

import { useState } from 'react';
import { Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DashboardFilters {
  className?: string;
  startDate?: string;
  endDate?: string;
  studentId?: string;
  status?: 'all' | 'present' | 'absent' | 'late' | 'excused';
}

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  availableClasses?: string[];
  showStudentFilter?: boolean;
  showStatusFilter?: boolean;
}

export function DashboardFiltersPanel({
  filters,
  onFiltersChange,
  availableClasses = [],
  showStudentFilter = false,
  showStatusFilter = true,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some((value) => value && value !== 'all');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
              {Object.values(filters).filter((v) => v && v !== 'all').length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Class Filter */}
          {availableClasses.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="class-filter" className="text-xs text-zinc-400">
                Classe
              </Label>
              <Select
                value={filters.className || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, className: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger id="class-filter" className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {availableClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Filter */}
          {showStatusFilter && (
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-xs text-zinc-400">
                Statut
              </Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    status: value === 'all' ? undefined : (value as any),
                  })
                }
              >
                <SelectTrigger id="status-filter" className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="present">Présent</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">En retard</SelectItem>
                  <SelectItem value="excused">Excusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-xs text-zinc-400">
              Date de début
            </Label>
            <div className="relative">
              <Input
                id="start-date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, startDate: e.target.value || undefined })
                }
                className="bg-zinc-800 border-zinc-700"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-xs text-zinc-400">
              Date de fin
            </Label>
            <div className="relative">
              <Input
                id="end-date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, endDate: e.target.value || undefined })
                }
                className="bg-zinc-800 border-zinc-700"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          {/* Student ID Filter */}
          {showStudentFilter && (
            <div className="space-y-2">
              <Label htmlFor="student-filter" className="text-xs text-zinc-400">
                ID Étudiant
              </Label>
              <Input
                id="student-filter"
                type="text"
                placeholder="Rechercher par ID..."
                value={filters.studentId || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, studentId: e.target.value || undefined })
                }
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
