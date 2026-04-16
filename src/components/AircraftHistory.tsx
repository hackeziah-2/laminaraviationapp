import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getAircraftById,
  getAircraftHistory,
  type AircraftHistoryRow,
} from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import type { Aircraft } from "../types/Aircraft";
import { toCamel } from "../utility/utils";

const HISTORY_PAGE_SIZE = 10;

function humanizeKey(key: string): string {
  if (key === "changedByName") return "Changed By";
  if (key === "changedBy") return "Changed By";
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isDateLikeValue(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) ||
    /^\d{4}-\d{2}-\d{2}T/.test(value) ||
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(value)
  );
}

function formatDateLike(value: string): string {
  if (!isDateLikeValue(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parsed.toLocaleDateString();
  }

  return parsed.toLocaleString();
}

function formatCellValue(value: unknown): string {
  if (value == null) return "\u2014";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "\u2014";
    return formatDateLike(trimmed);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "\u2014";
    return value.map((item) => formatCellValue(item)).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["name", "registration", "label", "value", "id"];
    for (const key of preferredKeys) {
      const candidate = record[key];
      if (
        candidate != null &&
        ["string", "number", "boolean"].includes(typeof candidate)
      ) {
        return formatCellValue(candidate);
      }
    }
    try {
      return JSON.stringify(record);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

function getColumnKeys(rows: AircraftHistoryRow[]): string[] {
  const preferredOrder = [
    "createdAt",
    "updatedAt",
    "changedByName",
    "changedBy",
    "updatedBy",
    "createdBy",
    "field",
    "fieldName",
    "column",
    "attribute",
    "oldValue",
    "oldData",
    "previousValue",
    "registration",
    "model",
    "manufacturer",
    "status",
    "base",
    "ownership",
    "newValue",
    "newData",
    "currentValue",
  ];

  const keySet = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keySet.add(key));
  });

  const keys = Array.from(keySet).filter(
    (key) => !["id", "pk", "aircraftId", "aircraftFk"].includes(key)
  );

  return keys.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.localeCompare(b);
  });
}

export function AircraftHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = Number(id);

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [rows, setRows] = useState<AircraftHistoryRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(aircraftId) || aircraftId <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await getAircraftById(aircraftId);
        if (!cancelled) {
          setAircraft(toCamel(response.data));
        }
      } catch (error) {
        console.error("Failed to load aircraft details:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aircraftId]);

  useEffect(() => {
    if (!Number.isFinite(aircraftId) || aircraftId <= 0) {
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await getAircraftHistory(
          aircraftId,
          currentPage,
          HISTORY_PAGE_SIZE
        );
        if (cancelled) return;
        setRows(response.items);
        setTotalItems(response.total);
        setTotalPages(Math.max(1, response.pages));
      } catch (error: any) {
        if (cancelled) return;
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.message ?? "Failed to load aircraft history.",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aircraftId, currentPage]);

  const columnKeys = getColumnKeys(rows);
  const visibleColumnKeys = columnKeys.filter(
    (key) => !(key === "changedBy" && columnKeys.includes("changedByName"))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                Number.isFinite(aircraftId) && aircraftId > 0
                  ? `/profile/${aircraftId}`
                  : "/profile"
              )
            }
            className="rounded p-2 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl text-gray-900">Aircraft History</h2>
            <p className="text-sm text-gray-500">
              {aircraft?.registration
                ? `${aircraft.registration}${aircraft.model ? ` • ${aircraft.model}` : ""}`
                : "View the latest profile change history for this aircraft."}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {visibleColumnKeys.length > 0 ? (
                    visibleColumnKeys.map((key) => (
                      <TableHead
                        key={key}
                        className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-600"
                      >
                        {humanizeKey(key)}
                      </TableHead>
                    ))
                  ) : (
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                      History
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="px-4 py-10 text-center text-gray-500"
                      colSpan={Math.max(1, visibleColumnKeys.length)}
                    >
                      No history entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow
                      key={String(row.id ?? row.pk ?? `${currentPage}-${index}`)}
                      className="hover:bg-gray-50/80"
                    >
                      {visibleColumnKeys.map((key) => (
                        <TableCell
                          key={`${String(row.id ?? index)}-${key}`}
                          className="px-4 py-3 align-top text-gray-900"
                        >
                          <div className="max-w-xs whitespace-normal break-words">
                            {formatCellValue(row[key])}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <DataTablePagination
              currentPage={currentPage}
              totalPages={Math.max(1, totalPages)}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              totalLabel="entries"
              itemsPerPage={HISTORY_PAGE_SIZE}
              disabled={loading}
              showRangeText
              maxVisiblePages={5}
              className="border-t border-gray-200"
            />
          </>
        )}
      </div>
    </div>
  );
}
