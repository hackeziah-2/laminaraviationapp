import { useState, useEffect } from "react";
import { getAircraftTechnicalLogById, AircraftTechnicalLog } from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";

interface EditTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: number;
  aircraftId?: number;
  onSuccess?: () => void;
}

/**
 * Edit ATL modal – fetches full entry via READ (getAircraftTechnicalLogById)
 * and submits via UPDATE (updateAircraftTechnicalLog).
 * Uses AddTechnicalLogbookEntryModal with editEntry for the form.
 */
export function EditTechnicalLogbookEntryModal({
  isOpen,
  onClose,
  entryId,
  aircraftId,
  onSuccess,
}: EditTechnicalLogbookEntryModalProps) {
  const [fullEntry, setFullEntry] = useState<AircraftTechnicalLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entryId && entryId > 0) {
      const fetchEntry = async () => {
        setLoading(true);
        setError(null);
        setFullEntry(null);
        try {
          const entry = await getAircraftTechnicalLogById(entryId);
          setFullEntry(entry);
        } catch (err: any) {
          setError(err?.response?.data?.detail || err?.message || "Failed to load entry");
        } finally {
          setLoading(false);
        }
      };
      fetchEntry();
    } else {
      setFullEntry(null);
      setError(null);
    }
  }, [isOpen, entryId]);

  if (!isOpen) return null;

  // Loading or error: show our modal
  if (loading || error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
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

  // Entry loaded: delegate to Add modal (edit mode) – no wrapper to avoid nested modals
  if (fullEntry) {
    return (
      <AddTechnicalLogbookEntryModal
        isOpen={true}
        onClose={onClose}
        editEntry={fullEntry}
        aircraftId={aircraftId}
        onSuccess={onSuccess}
      />
    );
  }

  return null;
}
