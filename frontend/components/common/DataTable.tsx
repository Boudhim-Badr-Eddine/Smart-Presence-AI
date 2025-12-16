'use client';

import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T;
  sortable?: boolean;
  render?: (value: any, item: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowsPerPage?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function DataTable<T extends { id: number }>({
  data,
  columns,
  rowsPerPage = 10,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(
    null,
  );

  // Sort data
  let sortedData = [...data];
  if (sortConfig) {
    sortedData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Paginate
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIdx = currentPage * rowsPerPage;
  const paginatedData = sortedData.slice(startIdx, startIdx + rowsPerPage);

  const toggleSort = (accessor: keyof T) => {
    setSortConfig((prev) =>
      prev?.key === accessor && prev.direction === 'asc'
        ? { key: accessor, direction: 'desc' }
        : { key: accessor, direction: 'asc' },
    );
    setCurrentPage(0);
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.accessor)}
                  className={`px-4 py-3 text-left font-semibold text-gray-700 ${col.width || ''} ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => col.sortable && toggleSort(col.accessor)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable &&
                      sortConfig?.key === col.accessor &&
                      (sortConfig.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b border-gray-200 hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={String(col.accessor)} className="px-4 py-3 text-gray-700">
                    {col.render
                      ? col.render((item as any)[col.accessor], item)
                      : (item as any)[col.accessor]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {startIdx + 1} to {Math.min(startIdx + rowsPerPage, sortedData.length)} of{' '}
            {sortedData.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(0, currentPage - 2) + i;
              if (pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
