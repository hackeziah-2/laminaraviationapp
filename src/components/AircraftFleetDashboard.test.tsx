/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AircraftFleetDashboard } from "./AircraftFleetDashboard";
import { Dashboard } from "./Dashboard";
import {
  AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE,
  getAircraftFleetDashboard,
  type AircraftFleetDashboardItem,
  type AircraftFleetDashboardQuery,
} from "../api/aircraftFleetDashboardApi";
import { getDashboard } from "../api/dashboardApi";

vi.mock("../api/aircraftFleetDashboardApi", async () => {
  const actual = await vi.importActual<
    typeof import("../api/aircraftFleetDashboardApi")
  >("../api/aircraftFleetDashboardApi");
  return {
    ...actual,
    getAircraftFleetDashboard: vi.fn(),
  };
});

vi.mock("../api/dashboardApi", () => ({
  getDashboard: vi.fn(),
}));

const fleetItems: AircraftFleetDashboardItem[] = Array.from(
  { length: 21 },
  (_, index) => {
    const id = index + 1;
    const aircraftIdent = `RP-C${String(id).padStart(2, "0")}`;
    if (id === 1) {
      return {
        aircraftIdent,
        status: "Operational",
        eodTach: "8878.7",
        components: [
          {
            magneto: "LH MAGNETO",
            dueForReplacementTach: "9328.9",
            remainingHours: "450.2",
            partNumber: "4371",
            serialNumber: "K-K06099",
          },
          {
            magneto: "RH MAGNETO",
            dueForReplacementTach: "9328.9",
            remainingHours: "450.2",
            partNumber: "4370",
            serialNumber: "9110276",
          },
        ],
      };
    }
    if (id === 2) {
      return {
        aircraftIdent,
        status: "AOG",
        eodTach: "490.2",
        components: [
          {
            magneto: "RH MAGNETO",
            dueForReplacementTach: "500.0",
            remainingHours: "9.8",
            partNumber: "4371",
            serialNumber: "6031787",
          },
        ],
      };
    }
    return {
      aircraftIdent,
      status: "Operational",
      eodTach: "8878.7",
      components: [],
    };
  }
);

function pageOf(
  items: AircraftFleetDashboardItem[],
  query: AircraftFleetDashboardQuery = {}
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    pages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
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
  vi.mocked(getAircraftFleetDashboard).mockImplementation(async (query = {}) => {
    const search = query.search?.trim().toLowerCase() ?? "";
    const status = query.status?.trim() ?? "";
    const filtered = fleetItems.filter((item) => {
      if (search && !item.aircraftIdent.toLowerCase().includes(search)) {
        return false;
      }
      if (status && status.toLowerCase() !== "all" && item.status !== status) {
        return false;
      }
      return true;
    });
    return pageOf(filtered, query);
  });
  vi.mocked(getDashboard).mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AircraftFleetDashboard", () => {
  it("loads magneto rows from the fleet dashboard report", async () => {
    renderFleet();

    expect(await screen.findByRole("link", { name: "RP-C01" })).toBeTruthy();
    expect(
      screen.getAllByRole("cell", { name: "Operational" })[0].className
    ).toContain("bg-green-500");
    expect(await screen.findByText("LH MAGNETO")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /A\/C Ident/i })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: /Due for OH/i })).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: /Due for Replacement/i })
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "EOD" })).toBeTruthy();
    expect(screen.getAllByText("RH MAGNETO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("450.2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9328.9").length).toBeGreaterThan(0);
    expect(screen.getByText("K-K06099")).toBeTruthy();
    expect(screen.queryByTitle("No overhaul due")).toBeNull();
    expect(screen.getByText("Showing")).toBeTruthy();
    expect(screen.getByText("1–20")).toBeTruthy();
    expect(screen.getByText("21")).toBeTruthy();
    expect(screen.queryByText("RP-C21")).toBeNull();
    expect(getAircraftFleetDashboard).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: "",
      status: "all",
    });
  });

  it("pages 20 aircraft at a time", async () => {
    renderFleet();
    await screen.findByText("LH MAGNETO");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("link", { name: "RP-C21" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "RP-C01" })).toBeNull();
    expect(screen.getByText("21–21")).toBeTruthy();
    expect(getAircraftFleetDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 20 })
    );
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
    expect(getAircraftFleetDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ status: "AOG", page: 1 })
    );
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
    expect(getAircraftFleetDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ search: "RP-C21", page: 1 })
    );
  });

  it("shows an empty state when no aircraft match", async () => {
    vi.mocked(getAircraftFleetDashboard).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      pages: 0,
    });

    renderFleet();

    expect(
      await screen.findByText("No aircraft found matching your search criteria")
    ).toBeTruthy();
  });

  it("shows an error state and retries", async () => {
    vi.mocked(getAircraftFleetDashboard).mockRejectedValueOnce(
      new Error("Network down")
    );

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
