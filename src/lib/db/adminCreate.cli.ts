import { describe, expect, it } from "vitest";
import { createOrSetStaffAdmin } from "@/lib/services/staffAdminService";

describe("admin:create", () => {
  it("rolü yazar ve audit bırakır", () => {
    const phone = process.env.ADMIN_CREATE_PHONE;
    const role = process.env.ADMIN_CREATE_ROLE;
    if (!phone || !role) {
      throw new Error("ADMIN_CREATE_PHONE ve ADMIN_CREATE_ROLE gerekli.");
    }
    const row = createOrSetStaffAdmin(phone, role, "cli");
    expect(row.phone).toBeTruthy();
    console.log(
      JSON.stringify({
        id: row.id,
        phone: row.phone,
        role: row.role,
        superAdmin: Boolean(row.super_admin),
      }),
    );
  });
});
