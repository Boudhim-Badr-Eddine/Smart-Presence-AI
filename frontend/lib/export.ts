/**
 * Lightweight export helpers for CSV and Excel-compatible downloads.
 * Excel accepts UTF-8 CSV and tabular HTML with the correct MIME type, so we avoid heavy deps.
 */

function buildCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          // Escape quotes by doubling them and wrap cell in quotes
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: (string | number | boolean | null | undefined)[][], filename: string) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportExcelLike(rows: (string | number | boolean | null | undefined)[][], filename: string) {
  // Excel will open this CSV with the xls extension without extra libs; keeps bundle small.
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}
