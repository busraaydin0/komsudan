"use client";

import { useEffect, useState } from "react";
import { OrderThread } from "@/components/OrderThread";
import { useInbox, useSession } from "@/lib/api";

export function MessagesScreen({
  openOrderId,
  onOpenThread,
}: {
  openOrderId?: string | null;
  onOpenThread: (orderId: string | null) => void;
}) {
  const { account } = useSession();
  const { threads, ready, reload } = useInbox();
  const [picked, setPicked] = useState<string | null>(openOrderId ?? null);

  useEffect(() => {
    setPicked(openOrderId ?? null);
  }, [openOrderId]);

  function open(id: string) {
    setPicked(id);
    onOpenThread(id);
  }

  function back() {
    setPicked(null);
    onOpenThread(null);
    void reload();
  }

  const active = threads.find((t) => t.orderId === picked);

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="mx-auto max-w-lg px-5 pr-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {picked ? (
          <button type="button" onClick={back} className="k-press text-xs text-[var(--muted)]">
            ← Konuşmalar
          </button>
        ) : (
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Mesajlar
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          {picked
            ? `${active?.peerName ?? "Komşu"} · ${active?.title ?? "Sipariş"}`
            : "Siparişlerin konuşmaları burada. Kartların içinde değil."}
        </p>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-4 pb-[calc(var(--tabbar)+1.5rem)]">
        {picked && account?.id ? (
          <OrderThread orderId={picked} selfId={account.id} fill />
        ) : !ready ? (
          <ul className="space-y-3">
            <li className="k-skel h-16 rounded-3xl" />
            <li className="k-skel h-16 rounded-3xl" />
          </ul>
        ) : threads.length === 0 ? (
          <p className="k-rise text-sm text-[var(--muted)]">
            Henüz konuşma yok. Bir sipariş oluşunca karşı tarafla buradan yazışırız.
          </p>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.orderId}>
                <button
                  type="button"
                  onClick={() => open(t.orderId)}
                  className="k-press flex w-full items-start justify-between gap-3 rounded-3xl bg-[var(--card)] px-4 py-3 text-left ring-1 ring-[var(--line)]"
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {t.peerName}
                      {t.unread > 0 ? (
                        <span className="ml-2 rounded-full bg-[var(--clay)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {t.unread > 9 ? "9+" : t.unread}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{t.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm">{t.preview}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-[var(--muted)]">
                    {new Date(t.updatedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
