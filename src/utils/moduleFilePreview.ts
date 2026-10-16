import { normalizeStoredFilePath } from "../api/fileUploadApi";

/** MIME from the stored filename when the server sends octet-stream. */
export function mimeFromFilename(path: string): string | null {
  const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return null;
}

/**
 * Filename passed to `{module}/download/{file}`.
 * Drops a repeated module folder or a copied download URL so White ATL and DFP
 * each request their own file.
 */
export function resolveModuleDownloadPath(
  moduleFolder: string,
  storedPath: string
): string {
  let path = normalizeStoredFilePath(storedPath);
  const marker = "/download/";
  const markerIndex = path.toLowerCase().lastIndexOf(marker);
  if (markerIndex >= 0) {
    path = path.slice(markerIndex + marker.length);
  }
  const folder = moduleFolder.replace(/^\/+|\/+$/g, "");
  const prefix = `${folder}/`;
  if (folder && path.toLowerCase().startsWith(prefix.toLowerCase())) {
    path = path.slice(prefix.length);
  }
  return path;
}

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function readBlobBytes(blob: Blob, length: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsArrayBuffer(blob.slice(0, length));
  });
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(blob);
  });
}

/** Identify a previewable file from its header when the name has no extension. */
export async function sniffPreviewMime(blob: Blob): Promise<string | null> {
  const bytes = await readBlobBytes(blob, 16);
  if (bytes.length === 0) return null;
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (bytesStartWith(bytes, [0xff, 0xd8])) return "image/jpeg";
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (bytesStartWith(bytes, [0x47, 0x49, 0x46])) return "image/gif";
  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const head = new TextDecoder().decode(bytes).trimStart();
  if (head.startsWith("{") || head.startsWith("[") || head.startsWith("<")) {
    return "application/json";
  }
  return null;
}

export type PreparedFilePreview = {
  blob: Blob;
  mimeType: string | null;
};

/**
 * Blob whose type matches the file, so an image or PDF renders in the modal
 * instead of an octet-stream download.
 */
export async function preparePreviewBlob(
  blob: Blob,
  filename: string
): Promise<PreparedFilePreview> {
  const sniffed = await sniffPreviewMime(blob);
  if (sniffed === "application/json") {
    const text = await readBlobText(blob);
    let message = "Failed to open file.";
    try {
      const json = JSON.parse(text) as { message?: string; detail?: string };
      message = json.message || json.detail || message;
    } catch {
      if (text.trim()) message = "Failed to open file.";
    }
    throw new Error(message);
  }

  const serverType = (blob.type || "").split(";")[0].trim().toLowerCase();
  const usableServerType =
    serverType && serverType !== "application/octet-stream" ? serverType : "";
  const mimeType =
    (sniffed && sniffed.startsWith("image/")) || sniffed === "application/pdf"
      ? sniffed
      : mimeFromFilename(filename) || usableServerType || null;

  if (!mimeType || blob.type === mimeType) {
    return { blob, mimeType };
  }
  return { blob: new Blob([blob], { type: mimeType }), mimeType };
}
