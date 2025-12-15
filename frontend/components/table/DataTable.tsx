"use client";

import { useRef } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

type DataTableProps = {
  data: any[];
  columns: ColumnDef<any, any>[];
  pageCount?: number;
  onPageChange?: (pageIndex: number) => void;
  statePageIndex?: number;
  isLoading?: boolean;
};

export default function DataTable({ data, columns, pageCount, onPageChange, statePageIndex, isLoading }: DataTableProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const table = useReactTable({
    data,
    columns,
    state: {
      pagination: {
        pageIndex: statePageIndex ?? 0,
        pageSize: 10,
      },
    },
    manualPagination: !!pageCount,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(table.getState().pagination) : updater;
      onPageChange?.(next.pageIndex);
    },
  });

  const rows = table.getRowModel().rows;
  const enableVirtual = rows.length > 20;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 text-left font-medium text-zinc-300">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-4 text-zinc-400">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-4 text-zinc-400">Aucune donnée</div>
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
                      <tr className="border-t border-white/5 hover:bg-white/5">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2 text-zinc-200">
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
            <table className="min-w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/5">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-zinc-200">
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
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-xs">
        <div className="text-zinc-400">Page {table.getState().pagination.pageIndex + 1}{pageCount ? ` / ${pageCount}` : ""}</div>
        <div className="flex gap-2">
          <button className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200 disabled:opacity-50" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Préc.
          </button>
          <button className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200 disabled:opacity-50" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Suiv.
          </button>
        </div>
      </div>
    </div>
  );
}
