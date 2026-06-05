import { describe, expect, it } from "vitest";
import { extractRoleUserCount } from "./rolesApi";

describe("extractRoleUserCount", () => {
  it("reads snake_case and camelCase counts", () => {
    expect(extractRoleUserCount({ user_count: 3 })).toBe(3);
    expect(extractRoleUserCount({ userCount: 5 })).toBe(5);
    expect(extractRoleUserCount({ users_count: 2 })).toBe(2);
  });

  it("returns undefined when count is absent", () => {
    expect(extractRoleUserCount({ name: "Admin" })).toBeUndefined();
    expect(extractRoleUserCount(null)).toBeUndefined();
  });

  it("counts users or accounts arrays when present", () => {
    expect(extractRoleUserCount({ users: [{ id: 1 }, { id: 2 }] })).toBe(2);
  });
});
