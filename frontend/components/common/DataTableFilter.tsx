'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface DataTableFilterProps {
  filters: {
    [key: string]: {
      label: string;
      options: FilterOption[];
    };
  };
  onFilterChange: (filters: { [key: string]: string }) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export default function DataTableFilter({
  filters,
  onFilterChange,
  searchPlaceholder = 'Search...',
  onSearch,
}: DataTableFilterProps) {
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleFilterChange = (filterKey: string, value: string) => {
    const updated = {
      ...activeFilters,
      [filterKey]: value === 'all' ? '' : value,
    };
    setActiveFilters(updated);
    onFilterChange(updated);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
    onFilterChange({});
    onSearch?.('');
  };

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== '') || searchQuery !== '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(filters).map(([key, filterConfig]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {filterConfig.label}
            </label>
            <select
              value={activeFilters[key] || 'all'}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {filterConfig.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
