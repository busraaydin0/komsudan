import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/rules";
import { insertOrderRow } from "@/lib/db/orders";
import { latestNotificationOfType } from "@/lib/db/notifications";
import { requestOtp, verifyOtp, loadUser } from "./authService";
import {
  deleteOrderMessage,
  listMessageInbox,
  listOrderMessages,
  MSG_BLOCKED_COPY,
  MSG_PER_MINUTE,
  readOrderMessages,
  reportOrderMessage,
  sendOrderMessage,
} from "./messageService";

async function customer(phone: string) {
  const sent = requestOtp(phone);
  return (await verifyOtp(phone, sent.demoCode!)).user;
}

function seedOrder(id: string, userId: string, providerId = "elif") {
  const now = new Date().toISOString();
  insertOrderRow({
    id,
    provider_id: providerId,
    package_id: "yikama",
    pieces: 6,
    express: 0,
    drop_method: "kapi",
    drop_point_id: null,
    slot: "Bugün 18:00–19:00",
    note: "",
    total: 180,
    commission: 18,
    status: "teslim_alindi",
    created_at: now,
    updated_at: now,
    user_id: userId,
    price_per_kg_snapshot: 30,
    estimated_weight: 6,
    estimated_price: 180,
    delivery_mode: "door",
    scheduled_window_start: now,
    lifecycle: "accepted",
  });
}

describe("sipariş mesajı", () => {
  it("taraf gönderir, yabancı 404, idempotent client id, bildirim gider", async () => {
    const user = await customer("5550000401");
    const stranger = await customer("5550000402");
    seedOrder("ord-msg-1", user.id);
    const provider = loadUser("elif")!;

    const sent = sendOrderMessage(user, "ord-msg-1", {
      body: "Yarın 14:00 uygun mudur?",
      clientMessageId: "client-msg-1-aaaa",
    });
    expect(sent.message.body).toBe("Yarın 14:00 uygun mudur?");
    expect(sent.warning).toBe(false);

    const again = sendOrderMessage(user, "ord-msg-1", {
      body: "Yarın 14:00 uygun mudur?",
      clientMessageId: "client-msg-1-aaaa",
    });
    expect(again.message.id).toBe(sent.message.id);

    expect(() => listOrderMessages(stranger, "ord-msg-1")).toThrow(ApiError);
    expect(() => sendOrderMessage(stranger, "ord-msg-1", { body: "Merhaba komşu." })).toThrow(ApiError);

    const notice = latestNotificationOfType(provider.id, "order_message");
    expect(notice?.order_id).toBe("ord-msg-1");
    expect(notice?.body).not.toContain("14:00");

    const listed = listOrderMessages(provider, "ord-msg-1");
    expect(listed.unreadCount).toBe(1);
    readOrderMessages(provider, "ord-msg-1");
    expect(listOrderMessages(provider, "ord-msg-1").unreadCount).toBe(0);
  });

  it("küfür ve telefon block, 3 adet gömlek allow, WhatsApp warn", async () => {
    const user = await customer("5550000403");
    seedOrder("ord-msg-2", user.id);
    expect(() => sendOrderMessage(user, "ord-msg-2", { body: "siktir et bunu" })).toThrow(ApiError);
    try {
      sendOrderMessage(user, "ord-msg-2", { body: "0532 111 22 33 ara" });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("MESSAGE_BLOCKED");
      expect((e as ApiError).message).toBe(MSG_BLOCKED_COPY);
    }
    const ok = sendOrderMessage(user, "ord-msg-2", { body: "3 adet gömlek bırakacağım" });
    expect(ok.message.body).toContain("gömlek");
    const warn = sendOrderMessage(user, "ord-msg-2", { body: "WhatsApp'tan yaz" });
    expect(warn.warning).toBe(true);
    expect(listOrderMessages(user, "ord-msg-2").messages.some((m) => m.body.includes("siktir"))).toBe(false);
  });

  it("aynı mesajı raporlar, ikinci rapor 409, silince yer tutar", async () => {
    const user = await customer("5550000404");
    const provider = loadUser("elif")!;
    seedOrder("ord-msg-3", user.id);
    const sent = sendOrderMessage(provider, "ord-msg-3", { body: "Kapıda 10 dakika beklerim." });
    reportOrderMessage(user, "ord-msg-3", sent.message.id, "Uygunsuz ton.");
    expect(() => reportOrderMessage(user, "ord-msg-3", sent.message.id, "Yine bildiriyorum.")).toThrow(
      ApiError,
    );
    const gone = deleteOrderMessage(provider, "ord-msg-3", sent.message.id);
    expect(gone.message.deleted).toBe(true);
    expect(gone.message.body).toBe("Bu mesaj kaldırıldı");
    expect(() => deleteOrderMessage(user, "ord-msg-3", sent.message.id)).toThrow(ApiError);
  });

  it("dakika limitini keser", async () => {
    const user = await customer("5550000405");
    seedOrder("ord-msg-4", user.id);
    for (let i = 0; i < MSG_PER_MINUTE; i++) {
      sendOrderMessage(user, "ord-msg-4", { body: `Saat dilimi ${i} uygun mu acaba?` });
    }
    expect(() => sendOrderMessage(user, "ord-msg-4", { body: "Bir mesaj daha." })).toThrow(ApiError);
    try {
      sendOrderMessage(user, "ord-msg-4", { body: "Bir mesaj daha." });
    } catch (e) {
      expect((e as ApiError).code).toBe("MESSAGE_RATE_LIMITED");
    }
  });

  it("gelen kutusu yalnız sipariş taraflarını listeler", async () => {
    const user = await customer("5550000406");
    seedOrder("ord-msg-inbox", user.id);
    sendOrderMessage(user, "ord-msg-inbox", { body: "Kapıda 18 gibi olur muyum?" });
    const inbox = listMessageInbox(user);
    expect(inbox.threads.some((t) => t.orderId === "ord-msg-inbox")).toBe(true);
    expect(inbox.threads.find((t) => t.orderId === "ord-msg-inbox")?.preview).toContain("Kapıda");
  });
});
