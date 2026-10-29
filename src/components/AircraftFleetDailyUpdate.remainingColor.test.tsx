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
    expect(due.className).toContain("bg-red-500");
    expect(due.className).toContain("text-white");
    expect(bodyCell("300").className).not.toContain("bg-red-500");
    expect(bodyCell("400").className).not.toContain("bg-red-500");
    expect(bodyCell("Operational").className).toContain("bg-green-500");
    expect(bodyCell("RP-C090").className).not.toContain("bg-red-500");

    const yellow = bodyCell("8.1");
    expect(yellow.className).toContain("bg-yellow-400");
    expect(yellow.className).toContain("text-gray-900");
    expect(bodyCell("301").className).not.toContain("bg-yellow-400");
    expect(bodyCell("401").className).not.toContain("bg-yellow-400");

    const orange = bodyCell("4");
    expect(orange.className).toContain("bg-orange-600");
    expect(orange.className).toContain("text-white");
    expect(orange.className).not.toContain("bg-red-500");
    expect(bodyCell("AOG").className).toContain("bg-red-500");
    expect(bodyCell("302").className).not.toContain("bg-orange-600");
    expect(bodyCell("402").className).not.toContain("bg-orange-600");

    const open = bodyCell("20.6");
    expect(open.className).toContain("text-gray-900");
    expect(open.className).not.toContain("bg-yellow-400");
    expect(open.className).not.toContain("bg-orange-600");
    expect(open.className).not.toContain("bg-red-500");
    expect(bodyCell("Ongoing Maintenance").className).toContain("bg-yellow-400");
    expect(bodyCell("303").className).toContain("text-gray-900");
    expect(bodyCell("303").className).not.toContain("bg-");
    expect(bodyCell("403").className).not.toContain("bg-");

    expect(bodyCell("15").className).not.toContain("bg-");
    expect(bodyCell("12").className).not.toContain("bg-");

    expect(screen.getByRole("group", { name: "Remaining time color legend" })).toHaveTextContent(
      "Due (≤1 hr remaining)"
    );
    expect(screen.getByText("> 1% to ≤ 10% remaining")).toHaveClass(
      "bg-orange-600"
    );
    expect(screen.getByText("> 10% to ≤ 20% remaining")).toHaveClass(
      "bg-yellow-400"
    );
  });
});
