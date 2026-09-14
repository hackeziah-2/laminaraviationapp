/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTablePagination, PageSizeSelect } from "./DataTablePagination";

afterEach(() => {
  cleanup();
});

describe("PageSizeSelect", () => {
  it("shows 50, 100, and 500 and never a blank value", () => {
    render(
      <PageSizeSelect value={10} options={[10, 25, 50]} onChange={vi.fn()} />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("50");
    expect(
      Array.from(select.options).map((option) => option.value)
    ).toEqual(["50", "100", "500"]);
  });

  it("renders a fixed-width select so 50, 100, and 500 are not clipped", () => {
    render(
      <PageSizeSelect value={500} options={[50, 100, 500]} onChange={vi.fn()} />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("500");
    expect(select.className).toContain("w-[6.25rem]");
    expect(select.className).toContain("min-w-[6.25rem]");
    expect(select.className).toContain("shrink-0");
    expect(Array.from(select.options).map((option) => option.text)).toEqual([
      "50",
      "100",
      "500",
    ]);
  });

  it("emits 100 and 500 when those options are chosen", () => {
    const onChange = vi.fn();
    render(
      <PageSizeSelect value={50} options={[50, 100, 500]} onChange={onChange} />
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "100" } });
    fireEvent.change(select, { target: { value: "500" } });
    expect(onChange).toHaveBeenNthCalledWith(1, 100);
    expect(onChange).toHaveBeenNthCalledWith(2, 500);
  });
});

describe("DataTablePagination", () => {
  it("snaps leftover 10/25 sizes to 50", () => {
    const onItemsPerPageChange = vi.fn();
    render(
      <DataTablePagination
        currentPage={1}
        totalPages={4}
        totalItems={200}
        itemsPerPage={25}
        onPageChange={vi.fn()}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    );
    expect(screen.getByRole("combobox")).toHaveProperty("value", "50");
    expect(onItemsPerPageChange).toHaveBeenCalledWith(50);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    const { rerender } = render(
      <DataTablePagination
        currentPage={1}
        totalPages={3}
        totalItems={150}
        itemsPerPage={50}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();

    rerender(
      <DataTablePagination
        currentPage={3}
        totalPages={3}
        totalItems={150}
        itemsPerPage={50}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("resets to page 1 when the page size changes", () => {
    const onPageChange = vi.fn();
    const onItemsPerPageChange = vi.fn();
    render(
      <DataTablePagination
        currentPage={4}
        totalPages={10}
        totalItems={500}
        itemsPerPage={50}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "100" } });
    expect(onItemsPerPageChange).toHaveBeenCalledWith(100);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("labels the control Rows per page", () => {
    render(
      <DataTablePagination
        currentPage={1}
        totalPages={2}
        totalItems={80}
        itemsPerPage={50}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />
    );
    expect(screen.getByText("Rows per page:")).toBeTruthy();
  });
});
