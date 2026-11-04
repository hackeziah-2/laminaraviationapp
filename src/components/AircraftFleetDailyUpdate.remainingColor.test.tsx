/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AircraftFleetDailyUpdate } from "./AircraftFleetDailyUpdate";
import { getFleetDailyUpdatePaged } from "../api/fleetDailyUpdateApi";
import type { FleetDailyUpdateItem } from "../api/fleetDailyUpdateApi";

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
    ident: "RP-C090",
    status: "Operational",
    nextInspDue: "50-Hour Inspection",
    remainingNextInsp: 0.9,
    remainingEngine: 300,
    remainingPropeller: 400,
  },
  {
    id: 2,
    aircraftId: 2,
    ident: "RP-C081",
    status: "Operational",
    nextInspDue: "50",
    remainingNextInsp: 8.1,
    remainingEngine: 301,
    remainingPropeller: 401,
  },
  {
    id: 3,
    aircraftId: 3,
    ident: "RP-C040",
    status: "AOG",
    nextInspDue: "50 HRS",
    remainingNextInsp: 4,
    remainingEngine: 302,
    remainingPropeller: 402,
  },
  {
    id: 4,
    aircraftId: 4,
    ident: "RP-C206",
    status: "Ongoing Maintenance",
    nextInspDue: 50 as unknown as string,
    remainingNextInsp: 20.6,
    remainingEngine: 303,
    remainingPropeller: 403,
  },
  {
    id: 5,
    aircraftId: 5,
    ident: "RP-C000",
    status: "Operational",
    nextInspDue: "0",
    remainingNextInsp: 15,
    remainingEngine: 304,
    remainingPropeller: 404,
  },
  {
    id: 6,
    aircraftId: 6,
    ident: "RP-CNEW",
    status: "Operational",
    nextInspDue: "LDND IS NOT YET SET-UP",
    remainingNextInsp: 12,
    remainingEngine: 305,
    remainingPropeller: 406,
  },
];

function bodyCell(text: string): HTMLElement {
  const match = screen
    .getAllByText(text)
    .map((element) => element.closest("td"))
    .find((cell): cell is HTMLElement => cell != null);
  if (!match) throw new Error(`No body cell for ${text}`);
  return match;
}

describe("Aircraft Fleet Daily Update remaining inspection color", () => {
  beforeEach(() => {
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

  it("colors only the remaining-time cell and labels red as due within 1 hour", async () => {
    render(
      <MemoryRouter>
        <AircraftFleetDailyUpdate />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("link", { name: "RP-C090" })
    ).toBeInTheDocument();

    const due = bodyCell("0.9");
    expect(due).toHaveStyle({ backgroundColor: "#FF0000", color: "#ffffff" });
    expect(due.className).not.toContain("bg-red-500");
    expect(bodyCell("300").style.backgroundColor).toBe("");
    expect(bodyCell("400").style.backgroundColor).toBe("");
    expect(bodyCell("Operational").className).toContain("bg-green-500");
    expect(bodyCell("Operational").style.backgroundColor).toBe("");
    expect(bodyCell("RP-C090").style.backgroundColor).not.toBe("#FF0000");

    const yellow = bodyCell("8.1");
    expect(yellow).toHaveStyle({
      backgroundColor: "#FFFF00",
      color: "#111827",
    });
    expect(bodyCell("301").style.backgroundColor).toBe("");
    expect(bodyCell("401").style.backgroundColor).toBe("");

    const orange = bodyCell("4");
    expect(orange).toHaveStyle({
      backgroundColor: "#FF9900",
      color: "#111827",
    });
    expect(bodyCell("AOG").className).toContain("bg-red-500");
    expect(bodyCell("AOG").style.backgroundColor).toBe("");
    expect(bodyCell("302").style.backgroundColor).toBe("");
    expect(bodyCell("402").style.backgroundColor).toBe("");

    const open = bodyCell("20.6");
    expect(open.className).toContain("text-gray-900");
    expect(open.style.backgroundColor).toBe("");
    expect(bodyCell("Ongoing Maintenance").className).toContain("bg-yellow-400");
    expect(bodyCell("Ongoing Maintenance").style.backgroundColor).toBe("");
    expect(bodyCell("303").style.backgroundColor).toBe("");
    expect(bodyCell("403").style.backgroundColor).toBe("");

    expect(bodyCell("15").style.backgroundColor).toBe("");
    expect(bodyCell("12").style.backgroundColor).toBe("");

    expect(
      screen.getByRole("group", { name: "Remaining time color legend" })
    ).toHaveTextContent("Due (≤1 hr remaining)");
    expect(screen.getByText("Up to 10% remaining")).toHaveStyle({
      backgroundColor: "#FF9900",
    });
    expect(screen.getByText("> 10% to ≤ 20% remaining")).toHaveStyle({
      backgroundColor: "#FFFF00",
    });
    expect(screen.getByText("Due (≤1 hr remaining)")).toHaveStyle({
      backgroundColor: "#FF0000",
    });
  });
});
