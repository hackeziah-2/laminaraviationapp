import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePagedRecordNavigation } from "./usePagedRecordNavigation";

describe("usePagedRecordNavigation", () => {
  it("selects the previous and next records on the current page", async () => {
    const records = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const onSelect = vi.fn();
    const fetchPage = vi.fn();
    const applyPage = vi.fn();

    const { result, rerender } = renderHook(
      (currentId: number) =>
        usePagedRecordNavigation({
          isOpen: true,
          records,
          currentId,
          currentPage: 1,
          totalPages: 1,
          fetchPage,
          applyPage,
          onSelect,
        }),
      { initialProps: 2 }
    );

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(true);

    await act(async () => {
      await result.current.goNext();
    });
    expect(onSelect).toHaveBeenCalledWith({ id: 3 });
    expect(fetchPage).not.toHaveBeenCalled();

    rerender(1);
    expect(result.current.hasPrevious).toBe(false);

    await act(async () => {
      await result.current.goPrevious();
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("fetches the adjacent page when moving past the current page", async () => {
    const onSelect = vi.fn();
    const applyPage = vi.fn();
    const fetchPage = vi.fn(async (page: number) => ({
      items: page === 2 ? [{ id: 4 }, { id: 5 }] : [{ id: 1 }, { id: 2 }],
      pages: 2,
      total: 4,
    }));

    const { result } = renderHook(() =>
      usePagedRecordNavigation({
        isOpen: true,
        records: [{ id: 1 }, { id: 2 }],
        currentId: 2,
        currentPage: 1,
        totalPages: 2,
        fetchPage,
        applyPage,
        onSelect,
      })
    );

    await act(async () => {
      await result.current.goNext();
    });

    expect(fetchPage).toHaveBeenCalledWith(2);
    expect(applyPage).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ items: [{ id: 4 }, { id: 5 }] })
    );
    expect(onSelect).toHaveBeenCalledWith({ id: 4 });
  });

  it("ignores duplicate requests while a navigation is in flight", async () => {
    let resolveSelect: (() => void) | undefined;
    const onSelect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSelect = resolve;
        })
    );

    const { result } = renderHook(() =>
      usePagedRecordNavigation({
        isOpen: true,
        records: [{ id: 1 }, { id: 2 }, { id: 3 }],
        currentId: 1,
        currentPage: 1,
        totalPages: 1,
        fetchPage: vi.fn(),
        applyPage: vi.fn(),
        onSelect,
      })
    );

    act(() => {
      void result.current.goNext();
      void result.current.goNext();
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSelect?.();
    });
  });

  it("clears the navigating lock when onSelect fails under holdBusyUntilIdle", async () => {
    const onSelect = vi.fn(async () => {
      throw new Error("Failed to load");
    });

    const { result } = renderHook(() =>
      usePagedRecordNavigation({
        isOpen: true,
        records: [{ id: 1 }, { id: 2 }],
        currentId: 1,
        currentPage: 1,
        totalPages: 1,
        fetchPage: vi.fn(),
        applyPage: vi.fn(),
        onSelect,
        holdBusyUntilIdle: true,
      })
    );

    await act(async () => {
      await result.current.goNext();
    });

    expect(result.current.navigating).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
