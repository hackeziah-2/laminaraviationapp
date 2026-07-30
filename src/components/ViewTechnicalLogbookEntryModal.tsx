import { useState, useEffect } from "react";
import {
  AircraftTechnicalLog,
  getAircraftTechnicalLogById,
} from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";

interface LogbookEntry {
  id: number;
  line?: number;
  seqNo?: string;
  date?: string;
  acReg?: string;
  route?: string;
  fltTime?: string;
  pilot?: string;
  status?: "Serviceable" | "Under Maintenance" | string;
}

interface ViewTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogbookEntry | null;
  /** When provided, skips an extra fetch until entry id changes. */
  fullEntry?: AircraftTechnicalLog | null;
  aircraftId?: number;
  permissionModuleCode?: string;
  viewerRole?: string;
}

/**
 * ATL View modal — same UI as Edit (AddTechnicalLogbookEntryModal), read-only.
 */
export function ViewTechnicalLogbookEntryModal({
  isOpen,
  onClose,
  entry,
  fullEntry,
  aircraftId,
  permissionModuleCode,
  viewerRole,
}: ViewTechnicalLogbookEntryModalProps) {
  const [fetchedEntry, setFetchedEntry] = useState<AircraftTechnicalLog | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entry?.id) {
      setFetchedEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Prefer a fresh READ so View matches Edit hydration (persons, files, etc.)
    let cancelled = false;
    const entryId = entry.id;
    const fallback = fullEntry;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAircraftTechnicalLogById(entryId);
        if (!cancelled) setFetchedEntry(data);
      } catch (err: unknown) {
        console.error("Error fetching ATL for view:", err);
        if (!cancelled) {
          if (fallback) {
            setFetchedEntry(fallback);
            setError(null);
          } else {
            setFetchedEntry(null);
            setError("Failed to load entry details");
          }
        }
      } finally {
        if (!cancelled) {
          setTimeout(() => setLoading(false), 360);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry) return null;

  if (loading || error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            {loading ? (
              <>
                <Spinner />
                <p className="text-gray-600 text-sm">Loading entry…</p>
              </>
            ) : (
              <>
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const entryData = fetchedEntry || fullEntry;
  if (!entryData) return null;

  return (
    <AddTechnicalLogbookEntryModal
      isOpen={true}
      onClose={onClose}
      editEntry={entryData}
      aircraftId={aircraftId ?? entryData.aircraft?.id}
      permissionModuleCode={permissionModuleCode}
      viewerRole={viewerRole}
      forceReadOnly={true}
    />
  );
}
