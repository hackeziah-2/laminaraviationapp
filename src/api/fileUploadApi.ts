import apiClient from "./index";

export interface ModuleFileUploadResult {
  filePath: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
}

/** Known module folders for POST /api/v1/{module_folder}/upload */
export const FILE_UPLOAD_MODULES = {
  whiteAtl: "white_atl",
  dfp: "dfp",
  logbooks: "logbooks",
  adMonitoring: "ad_monitoring",
  documentOnBoard: "document_on_board",
  aircraftStatutoryCertificates: "aircraft_statutory_certificates",
} as const;

export type FileUploadModuleFolder =
  (typeof FILE_UPLOAD_MODULES)[keyof typeof FILE_UPLOAD_MODULES];

/**
 * Strip storage prefixes; return value suitable for download URL (filename or relative path).
 */
export function normalizeStoredFilePath(path: string): string {
  let p = path.trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      p = new URL(p).pathname;
    } catch {
      // keep original
    }
  }
  p = p.replace(/^\/+/, "");
  p = p.replace(/^api\/v1\//, "");
  p = p.replace(/^app\/uploads\/?/i, "");
  p = p.replace(/^uploads\//, "");
  if (p.includes("?")) p = p.split("?")[0];
  return p;
}

/** Value to persist on entity records (prefer server filename). */
export function storedPathForApi(upload: ModuleFileUploadResult): string {
  const filename = (upload.filename ?? "").trim();
  if (filename) return filename;
  return normalizeStoredFilePath(upload.filePath);
}

function normalizeUploadResponse(data: Record<string, unknown>): ModuleFileUploadResult {
  return {
    filePath: String(data.file_path ?? data.filePath ?? ""),
    filename: String(data.filename ?? ""),
    sizeBytes: Number(data.size_bytes ?? data.sizeBytes ?? 0),
    contentType: String(data.content_type ?? data.contentType ?? ""),
  };
}

/**
 * POST /api/v1/{module_folder}/upload — multipart field `file`, optional ?name=
 */
export async function uploadModuleFile(
  moduleFolder: FileUploadModuleFolder | string,
  file: File,
  name?: string
): Promise<ModuleFileUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  const suffix = (name ?? file.name)?.trim();
  if (suffix) params.set("name", suffix);
  const qs = params.toString();
  const url = `${moduleFolder}/upload${qs ? `?${qs}` : ""}`;
  const response = await apiClient.post(url, formData, {
    headers: { Accept: "application/json" },
  });
  const raw = (response.data?.data ?? response.data) as Record<string, unknown>;
  return normalizeUploadResponse(raw && typeof raw === "object" ? raw : {});
}

/**
 * GET /api/v1/{module_folder}/download/{filename} (or full uploads/... path).
 * Falls back to ?name= when path-style download returns 404.
 */
export async function downloadModuleFile(
  moduleFolder: FileUploadModuleFolder | string,
  filePathOrFilename: string
): Promise<Blob> {
  const normalized = normalizeStoredFilePath(filePathOrFilename);
  if (!normalized) throw new Error("File path is not available.");

  const encoded = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const fetchBlob = async (endpoint: string, config?: { params?: { name: string } }) => {
    const response = await apiClient.get(endpoint, {
      ...config,
      responseType: "blob",
      headers: { Accept: "application/octet-stream" },
    });
    if (response.status >= 400) {
      let message = `Download failed (${response.status})`;
      try {
        const text = await (response.data as Blob).text();
        const json = JSON.parse(text) as { message?: string; detail?: string };
        message = json.message ?? json.detail ?? message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }
    return response.data as Blob;
  };

  try {
    return await fetchBlob(`${moduleFolder}/download/${encoded}`);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 404) throw err;
    const basename = normalized.split("/").pop() ?? normalized;
    return await fetchBlob(`${moduleFolder}/download`, { params: { name: basename } });
  }
}

/** Upload when a new file is selected; otherwise keep existing path unchanged. */
export async function resolveUploadedFilePath(
  moduleFolder: FileUploadModuleFolder | string,
  file: File | null | undefined,
  existingPath?: string | null
): Promise<string | null | undefined> {
  if (file instanceof File) {
    const uploaded = await uploadModuleFile(moduleFolder, file, file.name);
    return storedPathForApi(uploaded);
  }
  return existingPath;
}
