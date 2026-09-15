import * as XLSX from "xlsx";

/** Quote a CSV cell so commas, quotes, and newlines stay intact. */
export function escapeCsvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** UTF-8 CSV with BOM so Excel opens it correctly. */
export function buildCsvContent(rows: string[][]): string {
  return (
    "\uFEFF" +
    rows.map((cells) => cells.map(escapeCsvCell).join(",")).join("\n")
  );
}

/**
 * Trigger a file download via an `<a download>` link + object URL.
 * Does not use `chrome.runtime` or FileSaver; browser-extension messaging
 * errors (e.g. runtime.lastError) must not be treated as app failures.
 */
export function downloadBlobFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

export function downloadCsvFile(rows: string[][], filename: string): void {
  downloadBlobFile(
    new Blob([buildCsvContent(rows)], { type: "text/csv;charset=utf-8;" }),
    filename
  );
}

export function downloadXlsxFromAoa(
  aoa: string[][],
  sheetName: string,
  filename: string
): void {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlobFile(
    new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}
