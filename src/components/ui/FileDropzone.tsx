import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload } from "lucide-react";

export const ATL_FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const ATL_FILE_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,application/pdf";

const ATL_FILE_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  jpg: "JPEG",
  jpeg: "JPEG",
  png: "PNG",
  gif: "GIF",
  webp: "WEBP",
};

export function formatUploadFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadFileType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (FILE_TYPE_LABELS[ext]) return FILE_TYPE_LABELS[ext];
  const mime = file.type.trim();
  return mime || "Unknown";
}

export function isSameSelectedFile(current: File | null, next: File): boolean {
  if (!current) return false;
  return (
    current.name === next.name &&
    current.size === next.size &&
    current.lastModified === next.lastModified
  );
}

export function validateAtlUploadFile(file: File): string | null {
  const ext = `.${(file.name.split(".").pop() ?? "").toLowerCase()}`;
  if (
    !ATL_FILE_UPLOAD_EXTENSIONS.includes(
      ext as (typeof ATL_FILE_UPLOAD_EXTENSIONS)[number]
    )
  ) {
    return "This file type is not supported. Use PDF, DOC, DOCX, JPG, PNG, GIF, or WEBP.";
  }
  if (file.size > ATL_FILE_UPLOAD_MAX_BYTES) {
    return "This file is too large. Maximum size is 10 MB.";
  }
  return null;
}

type FileDropzoneProps = {
  inputId: string;
  disabled?: boolean;
  file: File | null;
  existingLabel?: string;
  error?: string;
  onSelect: (file: File) => void;
  onError: (message: string) => void;
  onClearError?: () => void;
};

export function FileDropzone({
  inputId,
  disabled = false,
  file,
  existingLabel,
  error,
  onSelect,
  onError,
  onClearError,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const applyFiles = (fileList: FileList | File[] | null) => {
    if (disabled) return;
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    if (files.length > 1) {
      onError("Please upload only one file.");
      resetInput();
      return;
    }
    const next = files[0];
    if (isSameSelectedFile(file, next)) {
      onClearError?.();
      resetInput();
      return;
    }
    const validationError = validateAtlUploadFile(next);
    if (validationError) {
      onError(validationError);
      resetInput();
      return;
    }
    onClearError?.();
    onSelect(next);
    resetInput();
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (![...event.dataTransfer.types].includes("Files")) return;
    dragCountRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current = 0;
    setIsDragOver(false);
    if (disabled) return;
    applyFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFiles(event.target.files);
  };

  const hasSelection = Boolean(file);
  const idleLabel = existingLabel || "Drop a file here or click to browse";

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="hidden"
        accept={ATL_FILE_UPLOAD_ACCEPT}
        disabled={disabled}
        multiple={false}
        onChange={handleInputChange}
      />
      <label
        htmlFor={disabled ? undefined : inputId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`file-dropzone w-full px-3 py-3 rounded-md flex items-center justify-between gap-2 ${
          disabled
            ? "file-dropzone-disabled"
            : "file-dropzone-enabled cursor-pointer"
        } ${isDragOver ? "file-dropzone-dragover" : ""} ${
          error ? "file-dropzone-error" : ""
        }`}
        aria-disabled={disabled}
        aria-invalid={Boolean(error)}
      >
        <div className="min-w-0 flex-1">
          {hasSelection && file ? (
            <>
              <p className="text-sm text-gray-900 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatUploadFileType(file)} · {formatUploadFileSize(file.size)}
              </p>
              {!disabled && (
                <p className="text-xs text-gray-500 mt-1">
                  Click or drop a different file to replace
                </p>
              )}
            </>
          ) : (
            <>
              <p
                className={`text-sm truncate ${
                  existingLabel ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {idleLabel}
              </p>
              {!disabled && (
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG, GIF, WEBP (Max 10MB)
                </p>
              )}
            </>
          )}
        </div>
        <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </label>
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
