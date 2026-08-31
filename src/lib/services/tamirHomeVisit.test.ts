import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { createOrderSchema } from "@/lib/validation/order.schema";
import { repairCreateSchema } from "@/lib/validation/provider.schema";
import { requestOtp, verifyOtp } from "@/lib/services/authService";
import { createOrder } from "@/lib/services/orderService";
import { getRepair, toPublicRepair } from "@/lib/db/repairs";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  const session = await verifyOtp(phone, sent.demoCode!);
  return session.user;
}

describe("Tamir dropoff regresyon ve musluk kilidi", () => {
  it("repairCreateSchema musluk kabul eder, client fulfillment_type/total yok sayılır", () => {
    const parsed = repairCreateSchema.parse({
      name: "Musluk tamiri",
      kind: "musluk",
      price: 200,
      fulfillmentType: "dropoff",
      total: 1,
      status: "completed",
    });
    expect(parsed.kind).toBe("musluk");
    expect("fulfillmentType" in parsed).toBe(false);
    expect("total" in parsed).toBe(false);
    expect("status" in parsed).toBe(false);
  });

  it("createOrderSchema client total/status yutmaz", () => {
    const parsed = createOrderSchema.parse({
      providerId: "hasan",
      drop: "kapi",
      slot: "10:00",
      total: 9,
      status: "completed",
    });
    expect("total" in parsed).toBe(false);
    expect("status" in parsed).toBe(false);
  });

  it("dropoff Tamir siparişi açılır, fulfillment_type dropoff", async () => {
    const user = await customer("5550000881");
    const repair = getRepair("hasan:laptop");
    expect(repair).toBeTruthy();
    expect(toPublicRepair(repair!).fulfillmentType).toBe("dropoff");

    const order = createOrder(
      {
        providerId: "hasan",
        productId: "hasan:laptop",
        guestCount: 1,
        drop: "kapi",
        dropPointId: null,
        slot: "Bugün 10:15–11:15",
        note: "",
      },
      user.id,
    );
    expect(order.packageId).toBe("tamir");
    expect(order.fulfillmentType).toBe("dropoff");
    expect(order.slot).toBe("Bugün 10:15–11:15");
    expect(order.total).toBeGreaterThan(0);
    expect(order.status).toBe("onay_bekliyor");
  });

  it("15 dakikanın katı olmayan saat reddedilir", async () => {
    const user = await customer("5550000884");
    expect(() =>
      createOrder(
        {
          providerId: "hasan",
          productId: "hasan:laptop",
          guestCount: 1,
          drop: "kapi",
          dropPointId: null,
          slot: "Bugün 14:07–15:07",
          note: "",
        },
        user.id,
      ),
    ).toThrow(ApiError);
  });

  it("musluk home_visit siparişi ready false iken açılmaz", async () => {
    const user = await customer("5550000882");
    const repair = getRepair("metin:musluk");
    expect(toPublicRepair(repair!).fulfillmentType).toBe("home_visit");
    try {
      createOrder(
        {
          providerId: "metin",
          productId: "metin:musluk",
          guestCount: 1,
          drop: "kapi",
          dropPointId: null,
          appointmentDate: "2026-09-02",
          appointmentWindowStart: "10:00",
          appointmentWindowEnd: "12:00",
          visitDistrict: "Çankaya",
          visitNeighborhood: "GOP",
          visitAddress: "Test sokak 1",
          addressShareConsent: true,
          note: "",
        },
        user.id,
      );
      throw new Error("açılmamalıydı");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("CATEGORY_NOT_READY");
    }
  });
});
