type AtlStoredFilePreviewProps = {
  blobUrl: string;
  mimeType: string | null;
  title: string;
};

/**
 * White ATL / DFP preview. The browser PDF toolbar (download, print, open)
 * stays hidden, and a shield blocks that bar if a viewer still draws it.
 */
export function AtlStoredFilePreview({
  blobUrl,
  mimeType,
  title,
}: AtlStoredFilePreviewProps) {
  if (mimeType?.startsWith("image/")) {
    return (
      <img
        src={blobUrl}
        alt={title}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      />
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <div className="atl-file-view-pdf">
        <iframe
          src={`${blobUrl}#toolbar=0&navpanes=0`}
          title={title}
          className="atl-file-view-frame"
        />
        <div className="atl-file-view-pdf-shield" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="atl-file-view-status text-gray-600 text-sm">
      <p>Preview not available for this file type.</p>
    </div>
  );
}
