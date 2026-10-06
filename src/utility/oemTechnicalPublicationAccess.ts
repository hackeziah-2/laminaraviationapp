import { isTechnicalPublicationRole } from "./atlEditRbac";

/**
 * Who may update an existing OEM Technical Publication.
 * The Technical Publication role can edit even when Regulatory Compliance is
 * view-only. Every other role needs the module Update permission.
 */
export function canEditOemTechnicalPublication(
  role: string | null | undefined,
  hasRegulatoryComplianceUpdate: boolean
): boolean {
  if (hasRegulatoryComplianceUpdate) return true;
  return isTechnicalPublicationRole(role ?? undefined);
}
