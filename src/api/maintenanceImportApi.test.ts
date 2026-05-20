import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { post: vi.fn() },
}));

import apiClient from "./index";
import {
  importMaintenanceExcel,
  importTccMaintenanceExcel,
} from "./maintenanceImportApi";
import { formatMaintenanceImportErrorForSwal } from "../utility/utils";

describe("importTccMaintenanceExcel", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: "ok" } });
  });

  it("POSTs to excel-data/maintenance-tcc/import with aircraft_id and file", async () => {
    const file = new File(["x"], "tcc.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await importTccMaintenanceExcel(42, file);

    expect(apiClient.post).toHaveBeenCalledWith(
      "excel-data/maintenance-tcc/import",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
      })
    );

    const formData = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(formData.get("aircraft_id")).toBe("42");
    expect(formData.get("file")).toBe(file);
  });

  it("surfaces Not valid data input for HTTP 400 import errors", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { status: 400, data: { detail: "Not valid data input" } },
    });

    await expect(importTccMaintenanceExcel(1, new File([], "t.xlsx"))).rejects.toBeTruthy();

    const swal = formatMaintenanceImportErrorForSwal({
      response: { status: 400, data: { detail: "Not valid data input" } },
    });
    expect(swal.title).toBe("Not valid data input");
  });
});

describe("importMaintenanceExcel maintenance-cpcp", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: "ok" } });
  });

  it("POSTs to excel-data/maintenance-cpcp/import with aircraft_id and dry_run", async () => {
    const file = new File(["x"], "cpcp.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await importMaintenanceExcel("maintenance-cpcp", 123, file, { dryRun: true });

    expect(apiClient.post).toHaveBeenCalledWith(
      "excel-data/maintenance-cpcp/import",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
        params: { dry_run: true },
      })
    );

    const formData = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(formData.get("aircraft_id")).toBe("123");
    expect(formData.get("file")).toBe(file);
  });
});
