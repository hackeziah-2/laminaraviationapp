/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetOverlayEscapeStackForTests } from "../overlay/overlayEscapeStack";
import { useOverlayEscape } from "./useOverlayEscape";

function pressEscape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
}

describe("useOverlayEscape", () => {
  afterEach(() => {
    resetOverlayEscapeStackForTests();
  });

  it("registers while enabled and unregisters on unmount", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() =>
      useOverlayEscape({ enabled: true, onClose })
    );

    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not register until enabled", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useOverlayEscape({ enabled, onClose }),
      { initialProps: { enabled: false } }
    );

    pressEscape();
    expect(onClose).not.toHaveBeenCalled();

    rerender({ enabled: true });
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the latest onClose without re-stacking", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onClose }: { onClose: () => void }) =>
        useOverlayEscape({ enabled: true, onClose }),
      { initialProps: { onClose: first } }
    );

    rerender({ onClose: second });
    pressEscape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("blocks close while isBusy is true", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ isBusy }: { isBusy: boolean }) =>
        useOverlayEscape({ enabled: true, onClose, isBusy }),
      { initialProps: { isBusy: true } }
    );

    pressEscape();
    expect(onClose).not.toHaveBeenCalled();

    rerender({ isBusy: false });
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes a nested layer before its parent", () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    renderHook(() => {
      useOverlayEscape({ enabled: true, onClose: closeParent });
      useOverlayEscape({ enabled: true, onClose: closeChild });
    });

    pressEscape();
    expect(closeChild).toHaveBeenCalledTimes(1);
    expect(closeParent).not.toHaveBeenCalled();

    act(() => {
      closeChild.mockClear();
    });
  });
});
