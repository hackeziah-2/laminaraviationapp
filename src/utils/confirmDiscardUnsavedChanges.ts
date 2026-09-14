import Swal from "./swalDefaults";

/** Ask before leaving an edit form that has unsaved changes. */
export async function confirmDiscardUnsavedChanges(): Promise<boolean> {
  const result = await Swal.fire({
    icon: "warning",
    title: "Unsaved changes",
    text: "You have unsaved changes on this entry.",
    showCancelButton: true,
    confirmButtonText: "Discard Changes and Continue",
    cancelButtonText: "Stay on Current Entry",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed === true;
}

export async function navigateAfterDiscardCheck(
  isDirty: () => boolean,
  navigate: () => void | Promise<void>
): Promise<void> {
  if (isDirty()) {
    const proceed = await confirmDiscardUnsavedChanges();
    if (!proceed) return;
  }
  await navigate();
}
