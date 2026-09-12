/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOverlayEscapeLayerCount,
  pushOverlayEscapeLayer,
  resetOverlayEscapeStackForTests,
} from "./overlayEscapeStack";

function pressEscape(init?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
}

describe("overlayEscapeStack", () => {
  afterEach(() => {
    resetOverlayEscapeStackForTests();
    document.body.replaceChildren();
  });

  it("closes only the topmost layer per Escape press", () => {
    const closeModal = vi.fn();
    const closeDropdown = vi.fn();
    pushOverlayEscapeLayer({
      close: closeModal,
      isBusy: () => false,
    });
    const unregisterDropdown = pushOverlayEscapeLayer({
      close: closeDropdown,
      isBusy: () => false,
    });

    pressEscape();
    expect(closeDropdown).toHaveBeenCalledTimes(1);
    expect(closeModal).not.toHaveBeenCalled();

    unregisterDropdown();
    pressEscape();
    expect(closeDropdown).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("does not close a busy layer", () => {
    const close = vi.fn();
    pushOverlayEscapeLayer({
      close,
      isBusy: () => true,
    });

    const event = pressEscape();
    expect(close).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores key repeat so one keydown closes one layer", () => {
    const close = vi.fn();
    pushOverlayEscapeLayer({
      close,
      isBusy: () => false,
    });

    pressEscape({ repeat: true });
    expect(close).not.toHaveBeenCalled();
  });

  it("leaves parent layers alone when SweetAlert is open", () => {
    const close = vi.fn();
    pushOverlayEscapeLayer({
      close,
      isBusy: () => false,
    });
    const swal = document.createElement("div");
    swal.className = "swal2-container";
    document.body.appendChild(swal);

    pressEscape();
    expect(close).not.toHaveBeenCalled();
  });

  it("leaves parent layers alone when a Radix popover is open", () => {
    const close = vi.fn();
    pushOverlayEscapeLayer({
      close,
      isBusy: () => false,
    });
    const popover = document.createElement("div");
    popover.setAttribute("data-slot", "popover-content");
    popover.setAttribute("data-state", "open");
    document.body.appendChild(popover);

    pressEscape();
    expect(close).not.toHaveBeenCalled();
  });

  it("skips Escape when another handler already prevented it", () => {
    const close = vi.fn();
    pushOverlayEscapeLayer({
      close,
      isBusy: () => false,
    });
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    document.dispatchEvent(event);
    expect(close).not.toHaveBeenCalled();
  });

  it("removes the document listener when the last layer unregisters", () => {
    const close = vi.fn();
    const unregister = pushOverlayEscapeLayer({
      close,
      isBusy: () => false,
    });
    expect(getOverlayEscapeLayerCount()).toBe(1);
    unregister();
    expect(getOverlayEscapeLayerCount()).toBe(0);

    pressEscape();
    expect(close).not.toHaveBeenCalled();
  });
});
