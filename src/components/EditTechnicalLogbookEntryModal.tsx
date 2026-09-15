import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { getMe } from "../api/authApi";
import {
  getAircraftTechnicalLogById,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";
import { ModalRecordNav } from "./ui/ModalRecordNav";
import { ModalChromeHeader } from "./ui/ModalChromeHeader";
import { useOverlayEscape } from "../hooks/useOverlayEscape";
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
  /** Revert the selected list row when the next entry fails to load. */
  onEntryLoadFailed?: (keepEntryId: number) => void;
}

function EditEntryOverlay({
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
        className="absolute inset-0 bg-white/15 backdrop-blur-[4px] pointer-events-none"
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
 * Previous/Next use the same paged sequence navigation as View Entry.
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
  onEntryLoadFailed,
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

  const [committedEntry, setCommittedEntry] =
    useState<AircraftTechnicalLog | null>(null);
  const committedEntryRef = useRef<AircraftTechnicalLog | null>(null);
  const loadGenerationRef = useRef(0);
  const onEntryLoadFailedRef = useRef(onEntryLoadFailed);
  onEntryLoadFailedRef.current = onEntryLoadFailed;
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
    if (!isOpen) {
      loadGenerationRef.current += 1;
      committedEntryRef.current = null;
      setCommittedEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!entryId || entryId <= 0) {
      return;
    }

    if (Number(committedEntryRef.current?.id) === Number(entryId)) {
      setLoading(false);
      return;
    }

    const requestedId = entryId;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError(null);

    let hideDelay: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const entry = await getAircraftTechnicalLogById(requestedId);
        if (generation !== loadGenerationRef.current) return;
        if (Number(entry.id) !== Number(requestedId)) return;
        committedEntryRef.current = entry;
        setCommittedEntry(entry);
        setError(null);
        hideDelay = window.setTimeout(() => {
          if (generation === loadGenerationRef.current) {
            setLoading(false);
          }
        }, 360);
      } catch (err: unknown) {
        if (generation !== loadGenerationRef.current) return;
        setError(formatApiErrorMessage(err, "Failed to load entry details."));
        setLoading(false);
        const keepId = committedEntryRef.current?.id;
        loadGenerationRef.current += 1;
        if (keepId != null && Number(keepId) !== Number(requestedId)) {
          onEntryLoadFailedRef.current?.(keepId);
        }
      }
    })();

    return () => {
      if (hideDelay) window.clearTimeout(hideDelay);
    };
  }, [isOpen, entryId]);

  if (!isOpen) return null;

  const overlayNav = {
    showNav,
    onClose,
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    navDisabled,
  };

  if (error && !committedEntry) {
    return (
      <EditEntryOverlay {...overlayNav}>
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl modal-navy-shell modal-responsive-dialog shadow-xl" style={{ backgroundColor: "#022C75" }}>
          <ModalChromeHeader title="Edit Entry" onClose={onClose} />
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

  if (!committedEntry) {
    return (
      <EditEntryOverlay {...overlayNav}>
        <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl modal-navy-shell modal-responsive-dialog shadow-xl" style={{ backgroundColor: "#022C75" }}>
          <ModalChromeHeader title="Edit Entry" onClose={onClose} />
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
      <EditEntryOverlay {...overlayNav}>
        <div
          className="relative flex w-full max-w-7xl flex-col overflow-hidden rounded-xl modal-navy-shell modal-responsive-dialog shadow-xl"
          style={{ backgroundColor: "#022C75" }}
        >
          <ModalChromeHeader title="Edit Entry" onClose={onClose} />
          <div className="flex flex-col gap-4 bg-white p-6">
            <p className="text-sm text-gray-800">{ATL_EDIT_FORBIDDEN_MESSAGE}</p>
            <button
              type="button"
              onClick={onClose}
              className="self-start rounded-lg bg-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </EditEntryOverlay>
    );
  }

  const applyTechPubAttachmentOnlyRestriction =
    isTechnicalPublicationRestrictedEdit(
      effectiveViewerRole,
      committedEntry.workStatus
    ) ||
    (Number(committedEntry.id) === Number(entryId) &&
      editRestrictedToWhiteAtlDfpOnly);

  const readOnlyEntry = !canEditAtlFields(
    effectiveViewerRole,
    committedEntry.workStatus
  );

  return (
    <AddTechnicalLogbookEntryModal
      isOpen={true}
      onClose={onClose}
      editEntry={committedEntry}
      aircraftId={aircraftId}
      onSuccess={onSuccess}
      permissionModuleCode={permissionModuleCode}
      viewerRole={effectiveViewerRole}
      editRestrictedToWhiteAtlDfpOnly={applyTechPubAttachmentOnlyRestriction}
      forceReadOnly={readOnlyEntry}
      sideGutter={showNav}
      contentLoading={navDisabled}
      entrySwitchError={!loading && error ? error : null}
      onPrevious={onPrevious}
      onNext={onNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      navigationBusy={navDisabled}
    />
  );
}
