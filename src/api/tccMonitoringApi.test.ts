import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from "./index";
import {
  createAircraftTccMonitoring,
  deleteAircraftTccMonitoring,
  getAircraftTccMonitoring,
  updateAircraftTccMonitoring,
} from "./tccMonitoringApi";

const pagedBody = {
  data: {
    items: [{ id: 9, display_order: 1, description: "Pump" }],
    total: 1,
    page: 1,
    pages: 1,
  },
};

describe("Maintenance TCC profile routes", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.delete).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: pagedBody });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 9, description: "Pump" },
      status: 201,
    });
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { id: 9, description: "Pump" },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });
  });

  it("loads a page with the profile id, not the TCC row id", async () => {
    await getAircraftTccMonitoring(15, 1, 50, "", "POWERPLANT");
    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(url.startsWith("profile/15/maintenance-tcc/paged?")).toBe(true);
    expect(url).toContain("category=Powerplant");
    expect(url).not.toContain("tcc-maintenance");
  });

  it("creates under the profile collection", async () => {
    await createAircraftTccMonitoring(15, {
      category: "AIRFRAME",
      partNo: "PN-1",
      description: "Hose",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "profile/15/maintenance-tcc",
      expect.objectContaining({
        aircraft_fk: 15,
        category: "Airframe",
        part_number: "PN-1",
      }),
      expect.any(Object)
    );
  });

  it("updates and deletes the row under the same profile id", async () => {
    await updateAircraftTccMonitoring(15, 9, {
      description: "Hose",
      category: "AIRFRAME",
    });
    await deleteAircraftTccMonitoring(15, 9);
    expect(apiClient.put).toHaveBeenCalledWith(
      "profile/15/maintenance-tcc/9",
      expect.any(Object),
      expect.any(Object)
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      "profile/15/maintenance-tcc/9"
    );
  });

  it("rejects a missing profile id before calling the API", async () => {
    await expect(getAircraftTccMonitoring(0)).rejects.toThrow(
      /profile ID/i
    );
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
