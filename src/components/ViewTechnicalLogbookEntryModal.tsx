import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AircraftTechnicalLog,
  getAircraftTechnicalLogById,
} from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";
import { ModalRecordNav } from "./ui/ModalRecordNav";
import { ModalChromeHeader } from "./ui/ModalChromeHeader";
import { useOverlayEscape } from "../hooks/useOverlayEscape";

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
  onPrevious?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  hasPrevious?: boolean;
  hasNext?: boolean;
  navigationBusy?: boolean;
  onLoadStateChange?: (isLoading: boolean) => void;
}

function ViewEntryOverlay({
  children,
  showNav,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  navDisabled,
}: {
  children: ReactNode;
  showNav: boolean;
  onClose: () => void;
  onPrevious?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  hasPrevious: boolean;
  hasNext: boolean;
  navDisabled: boolean;
}) {
  useOverlayEscape({ enabled: true, onClose });
  return (
    <div
      className={`modal-responsive-overlay fixed inset-0 z-50 flex items-center justify-center${
        showNav ? " modal-responsive-overlay--nav" : ""
      }`}
    >
      <div
        className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
        aria-hidden="true"
      />
      {showNav && onPrevious && onNext ? (
        <ModalRecordNav
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          disabled={navDisabled}
        />
      ) : null}
      {children}
    </div>
  );
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
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  navigationBusy = false,
  onLoadStateChange,
}: ViewTechnicalLogbookEntryModalProps) {
  const [fetchedEntry, setFetchedEntry] = useState<AircraftTechnicalLog | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showNav = Boolean(onPrevious && onNext);
  const navDisabled = loading || navigationBusy;
  const onLoadStateChangeRef = useRef(onLoadStateChange);
  onLoadStateChangeRef.current = onLoadStateChange;

  useEffect(() => {
    onLoadStateChangeRef.current?.(loading);
  }, [loading]);

  useEffect(() => {
    if (!isOpen || !entry?.id) {
      setFetchedEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const entryId = entry.id;
    const fallback =
      fullEntry?.id === entryId ? fullEntry : null;
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

  const matchingFullEntry =
    fullEntry?.id === entry.id ? fullEntry : null;
  const displayedEntry =
    fetchedEntry?.id === entry.id
      ? fetchedEntry
      : matchingFullEntry?.id === entry.id
        ? matchingFullEntry
        : null;

  if (error && !displayedEntry) {
    return (
      <ViewEntryOverlay
        showNav={showNav}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navDisabled={navDisabled}
      >
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl modal-navy-shell modal-responsive-dialog shadow-xl" style={{ backgroundColor: "#022C75" }}>
          <ModalChromeHeader title="View Entry" onClose={onClose} />
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </ViewEntryOverlay>
    );
  }

  if (!displayedEntry) {
    return (
      <ViewEntryOverlay
        showNav={showNav}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navDisabled={navDisabled}
      >
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl modal-navy-shell modal-responsive-dialog shadow-xl" style={{ backgroundColor: "#022C75" }}>
          <ModalChromeHeader title="View Entry" onClose={onClose} />
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Spinner />
            <p className="text-sm text-gray-600">Loading entry…</p>
          </div>
        </div>
      </ViewEntryOverlay>
    );
  }

  return (
    <AddTechnicalLogbookEntryModal
      isOpen={true}
      onClose={onClose}
      editEntry={displayedEntry}
      aircraftId={aircraftId ?? displayedEntry.aircraft?.id}
      permissionModuleCode={permissionModuleCode}
      viewerRole={viewerRole}
      forceReadOnly={true}
      sideGutter={showNav}
      contentLoading={navDisabled}
      onPrevious={onPrevious}
      onNext={onNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      navigationBusy={navDisabled}
    />
  );
}
