import { useEffect, useRef } from "react";
import { pushOverlayEscapeLayer } from "../overlay/overlayEscapeStack";

type UseOverlayEscapeOptions = {
  enabled: boolean;
  onClose: () => void | Promise<void>;
  isBusy?: boolean;
};

/**
 * Registers an overlay on the shared Escape stack while `enabled`.
 * The most recently enabled layer closes first (dropdown over modal).
 * Call parent-layer hooks before nested-layer hooks in the same component.
 */
export function useOverlayEscape({
  enabled,
  onClose,
  isBusy = false,
}: UseOverlayEscapeOptions): void {
  const onCloseRef = useRef(onClose);
  const isBusyRef = useRef(isBusy);
  onCloseRef.current = onClose;
  isBusyRef.current = isBusy;

  useEffect(() => {
    if (!enabled) return;
    return pushOverlayEscapeLayer({
      close: () => onCloseRef.current(),
      isBusy: () => isBusyRef.current,
    });
  }, [enabled]);
}
