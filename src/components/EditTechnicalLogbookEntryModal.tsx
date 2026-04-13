import { useState, useEffect, useMemo } from "react";
import { getMe } from "../api/authApi";
import {
  getAircraftTechnicalLogById,
  AircraftTechnicalLog,
  type AtlListViewComputedComponentTimes,
} from "../api/aircraftTechnicalLogApi";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { Spinner } from "./ui/spinner";
import { isAtlEditAllowedForRoleAndWorkStatus } from "../utility/atlEditRbac";
import { useUserPermissions } from "../hooks/useUserPermissions";

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
  /** Operation: per-row list computed component times when API omits cumulative values. */
  listViewComputedTimes?: AtlListViewComputedComponentTimes | null;
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
  listViewComputedTimes = null,
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

  // Entry loaded: enforce role + work_status before showing the edit form
  if (fullEntry) {
    if (
      !isAtlEditAllowedForRoleAndWorkStatus(
        effectiveViewerRole,
        fullEntry.workStatus
      )
    ) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 gap-4">
            <p className="text-gray-800 text-sm">
              You cannot edit this ATL entry for your role while work status is{" "}
              <span className="font-medium">
                {(fullEntry.workStatus || "unset").replace(/_/g, " ")}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors self-start"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return (
      <AddTechnicalLogbookEntryModal
        isOpen={true}
        onClose={onClose}
        editEntry={fullEntry}
        aircraftId={aircraftId}
        onSuccess={onSuccess}
        permissionModuleCode={permissionModuleCode}
        viewerRole={effectiveViewerRole}
        editRestrictedToWhiteAtlDfpOnly={editRestrictedToWhiteAtlDfpOnly}
        listViewComputedTimes={listViewComputedTimes}
      />
    );
  }

  return null;
}
