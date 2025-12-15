'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';

interface DataTableWithBulkProps {
  columns: ColumnDef<any, any>[];
  data: any[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) =>void;
  onBulkDelete?: (selectedIds: number[]) => void;
  onBulkExport?: (selectedIds: number[]) => void;
  getRowId?: (row: any) => number;
}

export default function DataTableWithBulk({
  columns,
  data,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onBulkDelete,
  onBulkExport,
  getRowId = (row: any) => row.id,
}: DataTableWithBulkProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const parentRef = useRef<HTMLDivElement | null>(null);

  const selectColumn: ColumnDef<any, any> = {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={selectedIds.size === data.length && data.length > 0}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedIds(new Set(data.map(getRowId)));
          } else {
            setSelectedIds(new Set());
          }
        }}
        className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-600 focus:ring-2 focus:ring-amber-600"
        aria-label="Sélectionner tout"
      />
    ),
    cell: ({ row }) => {
      const id = getRowId(row.original);
      return (
        <input
          type="checkbox"
          checked={selectedIds.has(id)}
          onChange={(e) => {
            const newSelected = new Set(selectedIds);
            if (e.target.checked) {
              newSelected.add(id);
            } else {
              newSelected.delete(id);
            }
            setSelectedIds(newSelected);
          }}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-600 focus:ring-2 focus:ring-amber-600"
          aria-label={`Sélectionner ligne ${id}`}
        />
      );
    },
  };

  const allColumns = [selectColumn, ...columns];

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const rows = table.getRowModel().rows;
  const enableVirtual = rows.length > 20; // enable virtualization for larger datasets

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = () => {
    if (onBulkExport && selectedIds.size > 0) {
      onBulkExport(Array.from(selectedIds));
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-600/30 bg-amber-600/10 px-4 py-3">
          <span className="text-sm font-medium text-white">
            {selectedIds.size} élément{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            {onBulkExport && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/30"
                aria-label="Exporter la sélection"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
            )}
            {onBulkDelete && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-600/30"
                aria-label="Supprimer la sélection"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <table className="w-full">
          <thead className="border-b border-white/10 dark:border-white/10 light:border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>
        <div
          ref={parentRef}
          className="max-h-[70vh] overflow-y-auto"
          role="rowgroup"
        >
          {isLoading ? (
            <div className="px-4 py-8 text-center text-zinc-400">Chargement...</div>
          ) : data.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-400">Aucune donnée</div>
          ) : enableVirtual ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <table
                    key={row.id}
                    className="absolute w-full table-fixed"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <tbody>
                      <tr className="border-b border-white/5 transition hover:bg-white/5 dark:border-white/5 dark:hover:bg-white/5 light:border-gray-100 light:hover:bg-gray-50">
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3 text-sm text-white dark:text-white light:text-gray-900"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 transition hover:bg-white/5 dark:border-white/5 dark:hover:bg-white/5 light:border-gray-100 light:hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-sm text-white dark:text-white light:text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">
            Page {currentPage} sur {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:text-gray-900 light:hover:bg-gray-50"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:text-gray-900 light:hover:bg-gray-50"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
