/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isEditableKeyboardTarget } from "./isEditableKeyboardTarget";
import { ModalRecordNav } from "./ModalRecordNav";

afterEach(() => {
  cleanup();
});

describe("isEditableKeyboardTarget", () => {
  it("treats inputs, textareas, and selects as editable", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    expect(isEditableKeyboardTarget(input)).toBe(true);
    expect(isEditableKeyboardTarget(textarea)).toBe(true);
    expect(isEditableKeyboardTarget(select)).toBe(true);
  });

  it("treats date picker fields as editable", () => {
    const wrap = document.createElement("div");
    wrap.className = "date-picker-field";
    const button = document.createElement("button");
    wrap.appendChild(button);
    document.body.appendChild(wrap);
    expect(isEditableKeyboardTarget(button)).toBe(true);
    wrap.remove();
  });

  it("allows shortcuts from ordinary buttons", () => {
    const button = document.createElement("button");
    expect(isEditableKeyboardTarget(button)).toBe(false);
  });
});

describe("ModalRecordNav", () => {
  it("exposes accessible labels and disables at list ends", () => {
    render(
      <div className="relative">
        <ModalRecordNav
          onPrevious={() => undefined}
          onNext={() => undefined}
          hasPrevious={false}
          hasNext={true}
        />
      </div>
    );
    expect(
      screen.getByRole("button", { name: "Previous Sequence" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next Sequence" })
    ).not.toBeDisabled();
  });

  it("exposes Previous Sequence and Next Sequence tooltips", () => {
    render(
      <div className="relative">
        <ModalRecordNav
          onPrevious={() => undefined}
          onNext={() => undefined}
          hasPrevious={true}
          hasNext={true}
        />
      </div>
    );
    expect(
      screen.getByRole("button", { name: "Previous Sequence" })
    ).toHaveAttribute("title", "Previous Sequence");
    expect(
      screen.getByRole("button", { name: "Next Sequence" })
    ).toHaveAttribute("title", "Next Sequence");
  });

  it("invokes next/previous from arrow keys unless typing in a field", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <div className="relative">
        <input aria-label="Search" />
        <ModalRecordNav
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={true}
          hasNext={true}
        />
      </div>
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("ignores arrow keys while a confirmation dialog is open", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const swal = document.createElement("div");
    swal.className = "swal2-container";
    document.body.appendChild(swal);
    render(
      <div className="relative">
        <ModalRecordNav
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={true}
          hasNext={true}
        />
      </div>
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    swal.remove();
  });
});
