import Swal from "sweetalert2";

export function extractApiErrorMessage(
  error: unknown,
  fallback = "Failed to save entry."
): string {
  const err = error as {
    response?: { data?: { detail?: unknown; message?: string } };
    message?: string;
  };

  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const row = item as { msg?: string; message?: string; loc?: string[] };
          if (row.msg && row.loc?.length) return `${row.loc.join(".")}: ${row.msg}`;
          if (row.msg) return row.msg;
          if (row.message) return row.message;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean);
    if (messages.length) return messages.join("\n");
  }
  if (detail && typeof detail === "object") {
    const obj = detail as { message?: string };
    if (obj.message) return obj.message;
    return JSON.stringify(detail);
  }
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return fallback;
}

/**
 * Shows a standardized create/update confirmation dialog, runs `saveFn` on confirm
 * (with loading on the confirm button), then shows a success toast.
 * Returns true when the entry was saved successfully.
 */
export async function confirmSaveEntry(
  isUpdate: boolean,
  saveFn: () => Promise<void>
): Promise<boolean> {
  const title = isUpdate ? "Confirm Update" : "Confirm New Entry";
  const text = isUpdate
    ? "Are you sure you want to update this entry?"
    : "Are you sure you want to create this new entry?";
  const confirmButtonText = isUpdate ? "Update" : "Create";
  const successText = isUpdate
    ? "Entry updated successfully."
    : "Entry created successfully.";

  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#6b7280",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      try {
        await saveFn();
        return true;
      } catch (error) {
        Swal.showValidationMessage(extractApiErrorMessage(error));
        return false;
      }
    },
  });

  if (result.isConfirmed && result.value === true) {
    await Swal.fire({
      icon: "success",
      text: successText,
      timer: 1500,
      showConfirmButton: false,
      timerProgressBar: true,
    });
    return true;
  }

  return false;
}
