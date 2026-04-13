/**
 * Shown when the user's role has explicit module permissions but read is false.
 * Used by ProtectedRoute so the list/view is not displayed.
 */
export function ModuleAccessDenied() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <p className="text-base font-semibold text-gray-900">Access restricted</p>
      <p className="mt-2 text-sm text-gray-600">
        Your role does not have permission to view this section.
      </p>
    </div>
  );
}
