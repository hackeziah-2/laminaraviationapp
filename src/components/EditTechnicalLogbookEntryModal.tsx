import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { getMe } from "../api/authApi";
import {
  getAircraftTechnicalLogById,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";
import { ModalRecordNav } from "./ui/ModalRecordNav";
import {
  ATL_EDIT_FORBIDDEN_MESSAGE,
  canEditAtlFields,
  canOpenAtlEditModal,
  isTechnicalPublicationRestrictedEdit,
} from "../utility/atlEditRbac";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";

interface EditTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: number;
  aircraftId?: number;
  onSuccess?: () => void;
  permissionModuleCode: string;
  /** Logged-in role name (e.g. from auth); used with work_status to enforce ATL edit RBAC */
  viewerRole?: string;
  /** Operation: Technical Publication may only change White ATL / DFP uploads in this modal. */
  editRestrictedToWhiteAtlDfpOnly?: boolean;
  onPrevious?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  hasPrevious?: boolean;
  hasNext?: boolean;
  navigationBusy?: boolean;
  onLoadStateChange?: (isLoading: boolean) => void;
}

function EditEntryOverlay({
  children,
  showNav,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  navDisabled,
}: {
  children: ReactNode;
  showNav: boolean;
  onPrevious?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  hasPrevious: boolean;
  hasNext: boolean;
  navDisabled: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        showNav ? "py-4 pl-14 pr-14 sm:pl-16 sm:pr-16" : "p-4"
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
  permissionModuleCode,
  viewerRole,
  editRestrictedToWhiteAtlDfpOnly = false,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  navigationBusy = false,
  onLoadStateChange,
}: EditTechnicalLogbookEntryModalProps) {
  const { user: permUser } = useUserPermissions();
  const [meRole, setMeRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      setMeRole(undefined);
      return;
    }
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setMeRole(me.role?.trim() || undefined);
      })
      .catch(() => {
        if (!cancelled) setMeRole(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** Login session role (/me) first, then hook, then parent — for edit gate + Work Status RBAC. */
  const effectiveViewerRole = useMemo(
    () => meRole || permUser?.role?.trim() || viewerRole?.trim() || undefined,
    [meRole, permUser?.role, viewerRole]
  );

  const [fullEntry, setFullEntry] = useState<AircraftTechnicalLog | null>(null);
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
    if (!isOpen || !entryId || entryId <= 0) {
      setFullEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const entry = await getAircraftTechnicalLogById(entryId);
        if (!cancelled) setFullEntry(entry);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            formatApiErrorMessage(err, "Failed to load entry details.")
          );
          setFullEntry((prev) => (prev?.id === entryId ? prev : null));
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
  }, [isOpen, entryId]);

  if (!isOpen) return null;

  const displayedEntry = fullEntry?.id === entryId ? fullEntry : null;

  if (error && !displayedEntry) {
    return (
      <EditEntryOverlay
        showNav={showNav}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navDisabled={navDisabled}
      >
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <p className="px-6 text-center text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </EditEntryOverlay>
    );
  }

  if (!displayedEntry) {
    return (
      <EditEntryOverlay
        showNav={showNav}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navDisabled={navDisabled}
      >
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Spinner />
            <p className="text-sm text-gray-600">Loading entry…</p>
          </div>
        </div>
      </EditEntryOverlay>
    );
  }

  if (!canOpenAtlEditModal(effectiveViewerRole)) {
    return (
      <EditEntryOverlay
        showNav={showNav}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navDisabled={navDisabled}
      >
        <div className="relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-xl bg-white p-6 shadow-xl">
          <p className="text-sm text-gray-800">{ATL_EDIT_FORBIDDEN_MESSAGE}</p>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-lg bg-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </EditEntryOverlay>
    );
  }

  const applyTechPubAttachmentOnlyRestriction =
    isTechnicalPublicationRestrictedEdit(
      effectiveViewerRole,
      displayedEntry.workStatus
    ) || editRestrictedToWhiteAtlDfpOnly;

  const readOnlyEntry = !canEditAtlFields(
    effectiveViewerRole,
    displayedEntry.workStatus
  );

  return (
    <AddTechnicalLogbookEntryModal
      isOpen={true}
      onClose={onClose}
      editEntry={displayedEntry}
      aircraftId={aircraftId}
      onSuccess={onSuccess}
      permissionModuleCode={permissionModuleCode}
      viewerRole={effectiveViewerRole}
      editRestrictedToWhiteAtlDfpOnly={applyTechPubAttachmentOnlyRestriction}
      forceReadOnly={readOnlyEntry}
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
