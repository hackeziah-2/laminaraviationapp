/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AircraftFleetDailyUpdate } from "./AircraftFleetDailyUpdate";
import { getFleetDailyUpdatePaged } from "../api/fleetDailyUpdateApi";
import type { FleetDailyUpdateItem } from "../api/fleetDailyUpdateApi";
import { AIRCRAFT_IDENT_COLOR_STORAGE_KEY } from "../utils/aircraftIdentColors";

vi.mock("../api/fleetDailyUpdateApi", async () => {
  const actual = await vi.importActual<typeof import("../api/fleetDailyUpdateApi")>(
    "../api/fleetDailyUpdateApi"
  );
  return {
    ...actual,
    getFleetDailyUpdatePaged: vi.fn(),
  };
});

vi.mock("../api/aircraftTechnicalLogApi", async () => {
  const actual = await vi.importActual<
    typeof import("../api/aircraftTechnicalLogApi")
  >("../api/aircraftTechnicalLogApi");
  return {
    ...actual,
    getLatestAircraftTechnicalLog: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("../api/authApi", async () => {
  const actual = await vi.importActual<typeof import("../api/authApi")>(
    "../api/authApi"
  );
  return {
    ...actual,
    getMe: vi.fn().mockRejectedValue(new Error("no session")),
  };
});

const rows: FleetDailyUpdateItem[] = [
  {
    id: 1,
    aircraftId: 1,
    ident: "RP-C12",
    status: "Operational",
    remainingNextInsp: 40,
  },
  {
    id: 2,
    aircraftId: 2,
    ident: "RP-C4088",
    status: "AOG",
    remainingNextInsp: 1,
    criticalValue: "remainingNextInsp",
  },
  {
    id: 3,
    aircraftId: 3,
    ident: "RP-C9999",
    status: "Ongoing Maintenance",
    remainingNextInsp: 12,
  },
];

function identCell(name: string): HTMLElement {
  const link = screen.getByRole("link", { name });
  const cell = link.closest("td");
  if (!cell) throw new Error(`No A/C IDENT cell for ${name}`);
  return cell;
}

describe("Aircraft Fleet Daily Update A/C IDENT colors", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getFleetDailyUpdatePaged).mockResolvedValue({
      items: rows,
      total: rows.length,
      page: 1,
      pages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("colors only the aircraft name cell and keeps status and alert colors", async () => {
    render(
      <MemoryRouter>
        <AircraftFleetDailyUpdate />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("link", { name: "RP-C12" })
    ).toBeInTheDocument();

    const salmon = identCell("RP-C12");
    const salmonLink = screen.getByRole("link", { name: "RP-C12" });
    expect(salmon).toHaveStyle({
      backgroundColor: "#E1A491",
      color: "#111827",
    });
    expect(salmonLink).toHaveStyle({ color: "#111827" });
    expect(salmonLink.className).toContain("font-bold");
    expect(salmon.className).toContain("font-bold");
    expect(salmon.className).toContain("border-r");
    expect(salmon.className).toContain("border-gray-300");
    expect(salmon.closest("tr")?.style.backgroundColor ?? "").toBe("");
    const salmonRowCells = Array.from(
      salmon.closest("tr")?.querySelectorAll("td") ?? []
    ).filter((cell) => cell.style.backgroundColor);
    expect(salmonRowCells).toEqual([salmon]);

    const status = screen.getAllByText("Operational").find((element) =>
      element.className.includes("bg-green-500")
    );
    expect(status).toBeTruthy();
    expect(status?.closest("td")).not.toBe(salmon);
    expect(status?.closest("td")?.style.backgroundColor ?? "").toBe("");

    const orange = identCell("RP-C4088");
    expect(orange).toHaveStyle({ backgroundColor: "#FDA262" });
    const alertCell = orange
      .closest("tr")
      ?.querySelector("td.bg-red-500");
    expect(alertCell).not.toBeNull();
    expect(alertCell).not.toBe(orange);

    const maintenance = screen
      .getAllByText("Ongoing Maintenance")
      .find((element) => element.className.includes("bg-yellow-400"));
    expect(maintenance).toBeTruthy();

    const added = identCell("RP-C9999");
    expect(added).toHaveStyle({
      backgroundColor: "#C6D98A",
      color: "#111827",
    });
    const saved = JSON.parse(
      localStorage.getItem(AIRCRAFT_IDENT_COLOR_STORAGE_KEY) ?? "{}"
    ) as Record<string, string>;
    expect(saved["RP-C9999"]).toBe("#C6D98A");
    expect(saved["RP-C12"]).toBeUndefined();
  });
});
