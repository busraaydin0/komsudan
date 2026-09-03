"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteOrderMessage,
  fetchOrderMessages,
  patchOrderMessagesRead,
  postOrderMessage,
  reportOrderMessage,
} from "@/lib/api";
import type { OrderMessage } from "@/lib/types";

export function OrderThread({
  orderId,
  selfId,
  compact,
  fill,
}: {
  orderId: string;
  selfId: string;
  compact?: boolean;
  fill?: boolean;
}) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await fetchOrderMessages(orderId);
      setMessages(data.messages ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* oturum yoksa sessiz */
    }
  }, [orderId]);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (unread === 0) return;
    void patchOrderMessagesRead(orderId)
      .then((data) => {
        setMessages(data.messages ?? []);
        setUnread(0);
      })
      .catch(() => undefined);
  }, [orderId, unread]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr("");
    setWarn("");
    try {
      const result = await postOrderMessage(orderId, text, crypto.randomUUID());
      setBody("");
      if (result.warning) {
        setWarn("Mesaj iletildi. Lütfen Komşudan üzerinden konuşmaya devam et.");
      }
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Mesaj gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={fill ? "" : compact ? "mt-3" : "mt-5"}>
      {!fill && (
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Mesaj</h3>
        {unread > 0 && (
          <span className="rounded-full bg-[var(--clay)] px-1.5 py-0.5 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      )}
      <ul className={`mt-2 space-y-1.5 overflow-y-auto ${fill ? "max-h-[min(28rem,52dvh)]" : "max-h-48"}`}>
        {messages.map((m) => {
          const mine = m.senderId === selfId;
          return (
            <li
              key={m.id}
              className={`rounded-2xl px-3 py-2 text-sm ring-1 ring-[var(--line)] ${
                mine ? "ml-8 bg-[var(--paper)]" : "mr-8 bg-[var(--card)]"
              }`}
            >
              <p className={m.deleted ? "text-[var(--muted)] italic" : ""}>{m.body}</p>
              {mine && !m.deleted && (
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] text-[var(--muted)]"
                    onClick={() => {
                      void deleteOrderMessage(orderId, m.id).then(() => reload());
                    }}
                  >
                    Kaldır
                  </button>
                </div>
              )}
              {!mine && !m.deleted && (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-[var(--muted)]"
                  onClick={() => {
                    const reason = window.prompt("Kısa gerekçe");
                    if (!reason || reason.trim().length < 4) return;
                    void reportOrderMessage(orderId, m.id, reason.trim()).catch((e) => {
                      setErr(e instanceof Error ? e.message : "Bildirilemedi.");
                    });
                  }}
                >
                  Bildir
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {warn && <p className="mt-2 text-xs text-[var(--muted)]">{warn}</p>}
      {err && <p className="mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          placeholder="Sipariş hakkında yaz…"
          className="min-w-0 flex-1 rounded-full bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="k-press k-cta shrink-0 rounded-full bg-[var(--teal)] px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          {busy ? "…" : "Gönder"}
        </button>
      </form>
    </div>
  );
}

export function MessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 rounded-full bg-[var(--clay)] px-1.5 py-0.5 text-[10px] font-medium text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
