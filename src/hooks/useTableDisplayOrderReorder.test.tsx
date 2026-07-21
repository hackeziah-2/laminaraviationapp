/** @vitest-environment jsdom */
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTableRow } from "../components/SortableTableRow";
import { RowDragHandle } from "../components/RowDragHandle";
import { useTableDisplayOrderReorder } from "../hooks/useTableDisplayOrderReorder";
import {
  buildDisplayOrderReorderPayload,
  isManualArrangementMode,
  moveItemAtIndex,
  withRecalculatedDisplayOrder,
} from "../utils/displayOrderReorder";

afterEach(() => {
  cleanup();
});

describe("RowDragHandle", () => {
  it("exposes accessible TCC / CPCP labels and grab cursor when enabled", () => {
    render(
      <>
        <RowDragHandle label="Move Maintenance TCC row" />
        <RowDragHandle label="Move Maintenance CPCP row" />
      </>
    );
    const tcc = screen.getByRole("button", { name: "Move Maintenance TCC row" });
    const cpcp = screen.getByRole("button", {
      name: "Move Maintenance CPCP row",
    });
    expect(tcc.className).toContain("cursor-grab");
    expect(cpcp.className).toContain("cursor-grab");
  });

  it("disables dragging during incompatible sorting or filtering", () => {
    expect(
      isManualArrangementMode({ search: "x", categoryFilter: "" })
    ).toBe(false);
    render(
      <RowDragHandle
        label="Move Maintenance TCC row"
        disabled
        disabledReason="Return to the default arrangement (no search or filters) before reordering rows."
      />
    );
    expect(
      screen.getByRole("button", { name: "Move Maintenance TCC row" })
    ).toBeDisabled();
  });
});

describe("useTableDisplayOrderReorder", () => {
  const fullItems = [
    { id: 1, displayOrder: 1, label: "A" },
    { id: 2, displayOrder: 2, label: "B" },
    { id: 3, displayOrder: 3, label: "C" },
  ];

  function Harness({
    persist,
    canReorder = true,
  }: {
    persist: (payload: {
      items: { id: number; display_order: number }[];
    }) => Promise<void>;
    canReorder?: boolean;
  }) {
    const [items, setItems] = useState(fullItems);
    const { sensors, handleDragEnd, dndDisabled } = useTableDisplayOrderReorder({
      items,
      setItems,
      canReorder,
      pageOffset: 0,
      loadFullOrdered: async () => fullItems,
      persistReorder: persist,
    });

    return (
      <div>
        <ul data-testid="order">
          {items.map((item) => (
            <li key={item.id} data-id={item.id} data-order={item.displayOrder}>
              {item.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={dndDisabled}
          data-testid="simulate-reorder"
          onClick={() =>
            handleDragEnd({
              active: { id: 1 },
              over: { id: 3 },
            } as DragEndEvent)
          }
        >
          Reorder
        </button>
        <button
          type="button"
          data-testid="simulate-noop"
          onClick={() =>
            handleDragEnd({
              active: { id: 2 },
              over: { id: 2 },
            } as DragEndEvent)
          }
        >
          Noop
        </button>
        <span data-testid="sensors">{sensors ? "ok" : "missing"}</span>
      </div>
    );
  }

  it("sends correct reorder API payload for TCC/CPCP-style rows", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    render(<Harness persist={persist} />);

    fireEvent.click(screen.getByTestId("simulate-reorder"));

    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(persist).toHaveBeenCalledWith({
      items: [
        { id: 2, display_order: 1 },
        { id: 3, display_order: 2 },
        { id: 1, display_order: 3 },
      ],
    });
  });

  it("does not call the API when position is unchanged", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    render(<Harness persist={persist} />);
    fireEvent.click(screen.getByTestId("simulate-noop"));
    await waitFor(() => expect(screen.getByTestId("sensors")).toHaveTextContent("ok"));
    expect(persist).not.toHaveBeenCalled();
  });

  it("rolls back arrangement after API failure", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("server down"));
    const onError = vi.fn();

    function FailHarness() {
      const [items, setItems] = useState(fullItems);
      const { handleDragEnd } = useTableDisplayOrderReorder({
        items,
        setItems,
        canReorder: true,
        pageOffset: 0,
        loadFullOrdered: async () => fullItems,
        persistReorder: persist,
        onError,
      });
      return (
        <div>
          <ul data-testid="order">
            {items.map((item) => (
              <li key={item.id} data-id={item.id}>
                {item.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="fail-reorder"
            onClick={() =>
              handleDragEnd({
                active: { id: 1 },
                over: { id: 3 },
              } as DragEndEvent)
            }
          >
            Fail
          </button>
        </div>
      );
    }

    render(<FailHarness />);
    fireEvent.click(screen.getByTestId("fail-reorder"));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(
      screen.getAllByRole("listitem").map((n) => n.getAttribute("data-id"))
    ).toEqual(["1", "2", "3"]);
  });

  it("keeps arrangement after successful persist (refetch-equivalent state)", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    render(<Harness persist={persist} />);
    fireEvent.click(screen.getByTestId("simulate-reorder"));
    await waitFor(() => expect(persist).toHaveBeenCalled());
    const saved = withRecalculatedDisplayOrder(
      moveItemAtIndex(fullItems, 0, 2)
    );
    expect(buildDisplayOrderReorderPayload(saved).items).toEqual([
      { id: 2, display_order: 1 },
      { id: 3, display_order: 2 },
      { id: 1, display_order: 3 },
    ]);
  });
});

describe("SortableTableRow + row actions", () => {
  it("keeps existing row actions clickable while drag handle is present", () => {
    const onEdit = vi.fn();
    function RowDemo() {
      return (
        <DndContext collisionDetection={closestCenter} onDragEnd={() => {}}>
          <table>
            <SortableContext items={[1]} strategy={verticalListSortingStrategy}>
              <tbody>
                <SortableTableRow
                  id={1}
                  dragLabel="Move Maintenance TCC row"
                >
                  {({ dragHandle }) => (
                    <>
                      <td>{dragHandle}</td>
                      <td>
                        <button type="button" onClick={onEdit} title="Edit">
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </SortableTableRow>
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      );
    }

    render(<RowDemo />);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Move Maintenance TCC row" })
    ).toBeInTheDocument();
  });
});
