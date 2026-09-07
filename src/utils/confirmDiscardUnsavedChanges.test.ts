/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fire = vi.fn();

vi.mock("./swalDefaults", () => ({
  default: { fire: (...args: unknown[]) => fire(...args) },
}));

import {
  confirmDiscardUnsavedChanges,
  navigateAfterDiscardCheck,
} from "./confirmDiscardUnsavedChanges";

describe("confirmDiscardUnsavedChanges", () => {
  beforeEach(() => {
    fire.mockReset();
  });

  it("uses discard and stay labels", async () => {
    fire.mockResolvedValue({ isConfirmed: true });
    await confirmDiscardUnsavedChanges();
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmButtonText: "Discard Changes and Continue",
        cancelButtonText: "Stay on Current Entry",
      })
    );
  });

  it("skips navigation when the form is dirty and the user stays", async () => {
    fire.mockResolvedValue({ isConfirmed: false });
    const navigate = vi.fn();
    await navigateAfterDiscardCheck(() => true, navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates without prompting when the form is clean", async () => {
    const navigate = vi.fn();
    await navigateAfterDiscardCheck(() => false, navigate);
    expect(fire).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("navigates after discard is confirmed", async () => {
    fire.mockResolvedValue({ isConfirmed: true });
    const navigate = vi.fn();
    await navigateAfterDiscardCheck(() => true, navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
