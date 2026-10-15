/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AircraftFleetDashboard } from "./AircraftFleetDashboard";
import { Dashboard } from "./Dashboard";
import { getAircrafts } from "../api/aircraftApi";
import { getAllFleetDailyUpdatesOrdered } from "../api/fleetDailyUpdateApi";
import { getAircraftTccMonitoring } from "../api/tccMonitoringApi";
import { getDashboard } from "../api/dashboardApi";

vi.mock("../api/aircraftApi", () => ({
  getAircrafts: vi.fn(),
}));

vi.mock("../api/fleetDailyUpdateApi", () => ({
  getAllFleetDailyUpdatesOrdered: vi.fn(),
}));

vi.mock("../api/tccMonitoringApi", () => ({
  getAircraftTccMonitoring: vi.fn(),
}));

vi.mock("../api/dashboardApi", () => ({
  getDashboard: vi.fn(),
}));

const aircraftRows = Array.from({ length: 21 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    registration: `RP-C${String(id).padStart(2, "0")}`,
    display_order: id,
  };
});

const dailyRows = aircraftRows.map((aircraft) => ({
  aircraftId: aircraft.id,
  registration: aircraft.registration,
  status: aircraft.id === 2 ? "AOG" : "Operational",
  tachEod: aircraft.id === 2 ? 490.2 : 8878.7,
}));

function tccPage(items: Record<string, unknown>[]) {
  return { items, total: items.length, page: 1, pages: 1 };
}

function magnetoItem(overrides: Record<string, unknown>) {
  return {
    id: 1,
    description: "",
    methodOfCompliance: "",
    partNo: "",
    serialNo: "",
    nextDueYear: "",
    limitHours: "",
    lastDoneTach: "",
    lastDoneYear: "",
    remainingTach: null,
    ...overrides,
  };
}

function renderFleet() {
  return render(
    <MemoryRouter>
      <AircraftFleetDashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(getAircrafts).mockImplementation(async (_page, _limit, search = "") => {
    const query = search.trim().toLowerCase();
    const items = query
      ? aircraftRows.filter((row) =>
          row.registration.toLowerCase().includes(query)
        )
      : aircraftRows;
    return {
      data: { items, total: items.length, page: 1, pages: 1 },
    } as never;
  });
  vi.mocked(getAllFleetDailyUpdatesOrdered).mockResolvedValue(dailyRows as never);
  vi.mocked(getAircraftTccMonitoring).mockImplementation(async (aircraftId: number) => {
    if (aircraftId === 1) {
      return tccPage([
        magnetoItem({
          id: 11,
          description: "LH MAGNETO",
          methodOfCompliance: "Replacement",
          partNo: "4371",
          serialNo: "K-K06099",
          nextDueYear: "9328.9",
          limitHours: "2000",
        }),
        magnetoItem({
          id: 12,
          description: "RH MAGNETO",
          methodOfCompliance: "Overhaul",
          partNo: "4370",
          serialNo: "9110276",
          nextDueYear: "2000",
        }),
        magnetoItem({
          id: 13,
          description: "RH MAGNETO",
          methodOfCompliance: "Replacement",
          partNo: "4370",
          serialNo: "9110276",
          nextDueYear: "9328.9",
          limitHours: "2000",
        }),
      ]) as never;
    }
    if (aircraftId === 2) {
      return tccPage([
        magnetoItem({
          id: 21,
          description: "RH MAGNETO OVERHAUL",
          methodOfCompliance: "Overhaul",
          nextDueYear: "2000",
        }),
        magnetoItem({
          id: 22,
          description: "RH Magneto",
          methodOfCompliance: "Replacement",
          partNo: "4371",
          serialNo: "6031787",
          nextDueYear: "500",
          limitHours: "500",
          remainingTach: 9.8,
        }),
      ]) as never;
    }
    return tccPage([]) as never;
  });
  vi.mocked(getDashboard).mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AircraftFleetDashboard", () => {
  it("shows LH and RH magnetos as separate rows with tach and remaining hours", async () => {
    renderFleet();

    expect(await screen.findByRole("link", { name: "RP-C01" })).toBeTruthy();
    expect(await screen.findByText("LH MAGNETO")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /A\/C Ident/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /Due for OH/i })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: /Due for Replacement/i })
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "EOD" })).toBeTruthy();
    expect(screen.getAllByText("RH MAGNETO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("450.2").length).toBeGreaterThan(0);
    expect(screen.getByText("K-K06099")).toBeTruthy();
    expect(screen.getByTitle("No overhaul due")).toBeTruthy();
    expect(screen.getByText("Showing")).toBeTruthy();
    expect(screen.getByText("1–20")).toBeTruthy();
    expect(screen.getByText("21")).toBeTruthy();
    expect(screen.queryByText("RP-C21")).toBeNull();
  });

  it("pages 20 aircraft at a time", async () => {
    renderFleet();
    await screen.findByText("LH MAGNETO");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("link", { name: "RP-C21" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "RP-C01" })).toBeNull();
    expect(screen.getByText("21–21")).toBeTruthy();
  });

  it("filters by operational status", async () => {
    renderFleet();
    await screen.findByRole("link", { name: "RP-C01" });

    fireEvent.change(screen.getByLabelText("Filter by Status"), {
      target: { value: "AOG" },
    });

    expect(await screen.findByRole("link", { name: "RP-C02" })).toBeTruthy();
    expect(await screen.findByText("9.8")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "AOG" })).toBeTruthy();
    expect(screen.getByText("9.8").className).toContain("bg-orange-400");
    expect(screen.getByText("6031787")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "RP-C01" })).toBeNull();
  });

  it("searches the aircraft list", async () => {
    renderFleet();
    await screen.findByRole("link", { name: "RP-C01" });

    fireEvent.change(screen.getByLabelText("Search aircraft"), {
      target: { value: "RP-C21" },
    });

    expect(await screen.findByRole("link", { name: "RP-C21" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "RP-C01" })).toBeNull();
    });
  });

  it("shows an empty state when no aircraft match", async () => {
    vi.mocked(getAircrafts).mockResolvedValue({
      data: { items: [], total: 0, page: 1, pages: 1 },
    } as never);

    renderFleet();

    expect(
      await screen.findByText("No aircraft found matching your search criteria")
    ).toBeTruthy();
  });

  it("shows an error state and retries", async () => {
    vi.mocked(getAircrafts).mockRejectedValueOnce(new Error("Network down"));

    renderFleet();

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("link", { name: "RP-C01" })).toBeTruthy();
  });
});

describe("Dashboard fleet button", () => {
  it("navigates to the aircraft fleet dashboard route", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/dashboard/aircraft-fleet-dashboard"
            element={<div>Fleet route</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Fleet Dashboard" }));
    expect(await screen.findByText("Fleet route")).toBeTruthy();
  });
});
