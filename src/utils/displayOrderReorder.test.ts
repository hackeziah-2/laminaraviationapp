import { describe, expect, it } from "vitest";
import {
  applyPageLocalReorder,
  buildAircraftDisplayOrderReorderPayload,
  buildDisplayOrderReorderPayload,
  isManualArrangementMode,
  moveItemAtIndex,
  toAircraftReorderPayload,
  withRecalculatedDisplayOrder,
} from "./displayOrderReorder";

describe("isManualArrangementMode", () => {
  it("allows reorder for default arrangement", () => {
    expect(isManualArrangementMode({ search: "", categoryFilter: "" })).toBe(
      true
    );
  });

  it("disables reorder when search or category filter is active", () => {
    expect(
      isManualArrangementMode({ search: "pump", categoryFilter: "" })
    ).toBe(false);
    expect(
      isManualArrangementMode({ search: "", categoryFilter: "POWERPLANT" })
    ).toBe(false);
  });

  it("disables reorder when a column sort is active", () => {
    expect(
      isManualArrangementMode({
        search: "",
        categoryFilter: "",
        columnSortActive: true,
      })
    ).toBe(false);
  });

  it("disables aircraft rearrange during search or status filter", () => {
    expect(
      isManualArrangementMode({
        search: "RP-12",
        categoryFilter: "",
        columnSortActive: false,
      })
    ).toBe(false);
    expect(
      isManualArrangementMode({
        search: "",
        categoryFilter: "active",
        columnSortActive: false,
      })
    ).toBe(false);
  });
});

describe("display order payload helpers", () => {
  it("builds sequential id + display_order payload from ordered ids", () => {
    expect(buildDisplayOrderReorderPayload([10, 20, 30])).toEqual({
      items: [
        { id: 10, display_order: 1 },
        { id: 20, display_order: 2 },
        { id: 30, display_order: 3 },
      ],
    });
  });

  it("builds sequential aircraft_id + display_order payload", () => {
    expect(buildAircraftDisplayOrderReorderPayload([10, 4, 7])).toEqual({
      items: [
        { aircraft_id: 10, display_order: 1 },
        { aircraft_id: 4, display_order: 2 },
        { aircraft_id: 7, display_order: 3 },
      ],
    });
  });

  it("remaps generic id payload to aircraft_id for shared fleet endpoint", () => {
    expect(
      toAircraftReorderPayload({
        items: [
          { id: 10, display_order: 1 },
          { id: 4, display_order: 2 },
        ],
      })
    ).toEqual({
      items: [
        { aircraft_id: 10, display_order: 1 },
        { aircraft_id: 4, display_order: 2 },
      ],
    });
  });

  it("recalculates displayOrder after a move", () => {
    const items = [
      { id: 1, displayOrder: 1, name: "a" },
      { id: 2, displayOrder: 2, name: "b" },
      { id: 3, displayOrder: 3, name: "c" },
    ];
    const moved = moveItemAtIndex(items, 0, 2);
    expect(moved.map((i) => i.id)).toEqual([2, 3, 1]);
    expect(withRecalculatedDisplayOrder(moved).map((i) => i.displayOrder)).toEqual([
      1, 2, 3,
    ]);
  });

  it("does not change order when indexes are unchanged", () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(moveItemAtIndex(items, 1, 1)).toBe(items);
  });

  it("applies page-local drag onto the full ordered collection", () => {
    const full = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ];
    // page 2 (offset 2): visible [3,4,5], move first visible to last
    const next = applyPageLocalReorder(full, 0, 2, 2);
    expect(next.map((i) => i.id)).toEqual([1, 2, 4, 5, 3]);
    expect(
      buildDisplayOrderReorderPayload(withRecalculatedDisplayOrder(next)).items
    ).toEqual([
      { id: 1, display_order: 1 },
      { id: 2, display_order: 2 },
      { id: 4, display_order: 3 },
      { id: 5, display_order: 4 },
      { id: 3, display_order: 5 },
    ]);
    expect(
      toAircraftReorderPayload(
        buildDisplayOrderReorderPayload(withRecalculatedDisplayOrder(next))
      ).items
    ).toEqual([
      { aircraft_id: 1, display_order: 1 },
      { aircraft_id: 2, display_order: 2 },
      { aircraft_id: 4, display_order: 3 },
      { aircraft_id: 5, display_order: 4 },
      { aircraft_id: 3, display_order: 5 },
    ]);
  });
});
