import { describe, expect, it } from "vitest";
import {
  canHomeVisitTransition,
  homeVisitNext,
  homeVisitTransitionsFor,
  type HomeVisitAction,
  type HomeVisitActor,
  type HomeVisitStatus,
} from "./homeVisit";

describe("Tip B home-visit state machine", () => {
  it("provider ve customer whitelist'i farklıdır", () => {
    const provider = homeVisitTransitionsFor("provider").map((t) => `${t.from}>${t.to}`);
    const customer = homeVisitTransitionsFor("customer").map((t) => `${t.from}>${t.to}`);
    expect(provider).not.toEqual(customer);
    expect(provider).toContain("pending>confirmed");
    expect(customer).not.toContain("pending>confirmed");
    expect(customer).toContain("in_progress>completed");
    expect(provider).not.toContain("in_progress>completed");
  });

  it("pending: provider confirm/reject, sistem timeout; customer yok", () => {
    expect(homeVisitNext("pending", "confirm", "provider")).toBe("confirmed");
    expect(homeVisitNext("pending", "reject", "provider")).toBe("rejected");
    expect(homeVisitNext("pending", "timeout", "system")).toBe("cancelled");
    expect(homeVisitNext("pending", "cancel", "customer")).toBeNull();
    expect(homeVisitNext("pending", "confirm", "customer")).toBeNull();
  });

  it("confirmed: provider yola çıkar veya iptal; customer iptal; completed yok", () => {
    expect(homeVisitNext("confirmed", "start_travel", "provider")).toBe("on_the_way");
    expect(homeVisitNext("confirmed", "cancel", "provider")).toBe("cancelled");
    expect(homeVisitNext("confirmed", "cancel", "customer")).toBe("cancelled");
    expect(homeVisitNext("confirmed", "complete", "customer")).toBeNull();
    expect(homeVisitNext("confirmed", "start_travel", "customer")).toBeNull();
  });

  it("on_the_way: provider işe başlar veya iptal; canlı konum yok (sadece durum)", () => {
    expect(homeVisitNext("on_the_way", "start_work", "provider")).toBe("in_progress");
    expect(homeVisitNext("on_the_way", "cancel", "provider")).toBe("cancelled");
    expect(homeVisitNext("on_the_way", "cancel", "customer")).toBe("cancelled");
    expect(homeVisitNext("on_the_way", "complete", "customer")).toBeNull();
  });

  it("in_progress → completed yalnız customer; provider atlayamaz", () => {
    expect(homeVisitNext("in_progress", "complete", "customer")).toBe("completed");
    expect(homeVisitNext("in_progress", "complete", "provider")).toBeNull();
    expect(canHomeVisitTransition("in_progress", "completed", "provider")).toBe(false);
  });

  it("in_progress → cancelled yalnız admin (destek); otomatik değil", () => {
    expect(homeVisitNext("in_progress", "force_cancel", "admin")).toBe("cancelled");
    expect(homeVisitNext("in_progress", "cancel", "customer")).toBeNull();
    expect(homeVisitNext("in_progress", "cancel", "provider")).toBeNull();
    expect(homeVisitNext("in_progress", "timeout", "system")).toBeNull();
  });

  it("terminal durumlardan çıkış yok", () => {
    const terminals: HomeVisitStatus[] = ["completed", "rejected", "cancelled"];
    const actions: HomeVisitAction[] = [
      "confirm",
      "reject",
      "cancel",
      "start_travel",
      "start_work",
      "complete",
      "timeout",
      "force_cancel",
    ];
    const actors: HomeVisitActor[] = ["customer", "provider", "admin", "system"];
    for (const from of terminals) {
      for (const action of actions) {
        for (const actor of actors) {
          expect(homeVisitNext(from, action, actor)).toBeNull();
        }
      }
    }
  });

  it("aksiyon aktör eşleşmezse hedef durum üretilmez", () => {
    expect(homeVisitNext("pending", "timeout", "provider")).toBeNull();
    expect(homeVisitNext("pending", "confirm", "system")).toBeNull();
    expect(homeVisitNext("in_progress", "force_cancel", "provider")).toBeNull();
  });
});
