export type AtlAttachmentDocumentType = "ATL" | "DFP";

/** Extension from the original file, including multi-dot names (`card.final.pdf` → `pdf`). */
export function originalFileExtension(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1);
}

/**
 * White ATL / DFP download and upload name.
 * Sequence is kept as text so leading zeros stay. Extension comes from the source file.
 * `ATL 00001 - RP-C1234.pdf`
 */
export function atlAttachmentFilename(input: {
  documentType: AtlAttachmentDocumentType;
  sequenceNo: string | number | null | undefined;
  aircraftName: string | null | undefined;
  sourceFilename: string;
}): string {
  const sequence = String(input.sequenceNo ?? "").trim();
  const aircraft = String(input.aircraftName ?? "")
    .trim()
    .replace(/[\\/]/g, "");
  const extension = originalFileExtension(input.sourceFilename);
  const stem = `${input.documentType} ${sequence} - ${aircraft}`;
  return extension ? `${stem}.${extension}` : stem;
}

/** Copy a selected file so the upload uses the ATL/DFP filename. */
export function fileWithAtlAttachmentName(
  file: File,
  documentType: AtlAttachmentDocumentType,
  sequenceNo: string | number | null | undefined,
  aircraftName: string | null | undefined
): File {
  const name = atlAttachmentFilename({
    documentType,
    sequenceNo,
    aircraftName,
    sourceFilename: file.name,
  });
  if (file.name === name) return file;
  return new File([file], name, {
    type: file.type,
    lastModified: file.lastModified,
  });
}
