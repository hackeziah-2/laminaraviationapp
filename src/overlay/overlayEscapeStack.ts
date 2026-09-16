export type OverlayEscapeLayer = {
  close: () => void | Promise<void>;
  isBusy: () => boolean;
};

const layers: OverlayEscapeLayer[] = [];

let listenerAttached = false;

const RADIX_FLOATING_SELECTOR = [
  '[data-slot="popover-content"][data-state="open"]',
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="dropdown-menu-sub-content"][data-state="open"]',
  '[data-slot="select-content"][data-state="open"]',
  '[data-radix-menu-content][data-state="open"]',
].join(",");

export function isSweetAlertOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".swal2-container"));
}

export function isRadixFloatingOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(RADIX_FLOATING_SELECTOR));
}

export function getOverlayEscapeLayerCount(): number {
  return layers.length;
}

export function resetOverlayEscapeStackForTests(): void {
  layers.length = 0;
  detachOverlayEscapeListener();
}

function onDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  if (event.repeat) return;
  if (event.defaultPrevented) return;
  if (isSweetAlertOpen()) return;
  if (isRadixFloatingOpen()) return;

  const top = layers[layers.length - 1];
  if (!top) return;
  if (top.isBusy()) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void top.close();
}

function attachOverlayEscapeListener(): void {
  if (listenerAttached || typeof document === "undefined") return;
  document.addEventListener("keydown", onDocumentKeyDown);
  listenerAttached = true;
}

function detachOverlayEscapeListener(): void {
  if (!listenerAttached || typeof document === "undefined") return;
  document.removeEventListener("keydown", onDocumentKeyDown);
  listenerAttached = false;
}

export function pushOverlayEscapeLayer(layer: OverlayEscapeLayer): () => void {
  layers.push(layer);
  attachOverlayEscapeListener();
  return () => {
    const index = layers.lastIndexOf(layer);
    if (index >= 0) layers.splice(index, 1);
    if (layers.length === 0) detachOverlayEscapeListener();
  };
}
