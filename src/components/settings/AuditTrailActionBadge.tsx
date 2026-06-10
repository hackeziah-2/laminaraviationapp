import { getActionBadgeClass, getActionDotClass } from "./auditTrailUtils";

export function AuditTrailActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getActionBadgeClass(action)}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${getActionDotClass(action)}`}
      />
      {action}
    </span>
  );
}
