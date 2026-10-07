"use client";

import { useMemo, useState } from "react";
import {
  useCatalog,
  useOrders,
  useSession,
} from "@/lib/api";
import type { Order } from "@/lib/types";
import { LaundryProfile } from "@/components/LaundryProfile";
import { ProviderPayoutPanel } from "@/components/ProviderPayoutPanel";
import { ProviderOrderCard } from "@/components/laundry/provider/ProviderOrderCard";
import { monthKey, monthLabel } from "@/lib/laundry/orderMonthGroup";
import { ProviderCapacityPanel } from "@/components/ProviderCapacityPanel";

export function ProviderDesk({
  onEditDiscovery,
  onOpenMessages,
}: {
  onEditDiscovery?: () => void;
  onOpenMessages?: (orderId: string) => void;
}) {
  const { account } = useSession();
  const { providers, reload: reloadCatalog } = useCatalog();
  const { orders, ready, reload, err: ordersErr } = useOrders();
  const open = orders.filter(
    (o) =>
      o.status !== "completed" &&
      o.status !== "cancelled" &&
      o.status !== "rejected" &&
      o.status !== "disputed",
  );
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const months = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (
        o.status !== "completed" &&
        o.status !== "cancelled" &&
        o.status !== "rejected" &&
        o.status !== "disputed"
      ) {
        continue;
      }
      const key = monthKey(o.createdAt);
      const list = map.get(key);
      if (list) list.push(o);
      else map.set(key, [o]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [orders]);

  function reloadAll() {
    void Promise.all([reload(), reloadCatalog()]);
  }

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="k-rise mx-auto flex max-w-lg items-center justify-between px-5 pr-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div>
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Hizmet veren
          </p>
          {onEditDiscovery ? (
            <button type="button" onClick={onEditDiscovery} className="k-press mt-1 text-xs text-[var(--muted)]">
              ← Hizmet al / ver
            </button>
          ) : (
            <p className="text-xs text-[var(--muted)]">Çukurambar pilotu</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-[calc(var(--tabbar)+1.5rem)]">
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "40ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Açık iş</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{open.length}</p>
          </div>
        </div>

        <ProviderPayoutPanel />

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">Gelen siparişler</h2>
        {ordersErr ? <p className="mt-2 text-sm text-[var(--clay)]">{ordersErr}</p> : null}
        {!ready ? (
          <ul className="mt-3 space-y-3">
            {[0, 1].map((i) => (
              <li key={i} className="k-skel h-32 rounded-3xl" />
            ))}
          </ul>
        ) : orders.length === 0 ? (
          <p className="k-rise mt-3 text-sm text-[var(--muted)]">
            Henüz sipariş yok. Haritadan bir katlayan seçip sipariş bırak.
          </p>
        ) : (
          <div className="mt-3 space-y-5">
            {open.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-[var(--teal)] uppercase">Açık</p>
                <ul className="mt-2 space-y-3">
                  {open.map((o, i) => (
                    <ProviderOrderCard
                      key={o.id}
                      order={o}
                      providers={providers}
                      onChanged={reloadAll}
                      delay={i * 40}
                      onOpenMessages={onOpenMessages}
                    />
                  ))}
                </ul>
              </div>
            )}
            {months.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">Aylar</p>
                <ul className="mt-2 space-y-2">
                  {months.map(([key, list]) => {
                    const on = openMonth === key;
                    return (
                      <li key={key} className="overflow-hidden rounded-3xl ring-1 ring-[var(--line)]">
                        <button
                          type="button"
                          aria-expanded={on}
                          onClick={() => setOpenMonth(on ? null : key)}
                          className="k-press flex w-full items-baseline justify-between bg-[var(--card)] px-4 py-3 text-left"
                        >
                          <span className="font-[family-name:var(--font-display)] text-lg">
                            {monthLabel(key)}
                          </span>
                          <span className="text-xs text-[var(--muted)]">{list.length} iş</span>
                        </button>
                        {on && (
                          <ul className="space-y-3 bg-[var(--paper)] px-3 pt-1 pb-3">
                            {list.map((o, i) => (
                              <ProviderOrderCard
                                key={o.id}
                                order={o}
                                providers={providers}
                                onChanged={reloadAll}
                                delay={i * 30}
                                onOpenMessages={onOpenMessages}
                              />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <LaundryProfile me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />
        <ProviderCapacityPanel onSaved={reloadAll} />

        {!providers.some((p) => p.id === account?.id) && (
          <p className="k-rise mt-6 text-sm text-[var(--muted)]">
            Hizmet kartın burada görünmüyor. Keşifte “Hizmet vermek istiyorum”u işaretleyip çamaşır paketini kaydet; kart
            ve gelen işler bu sekmede açılır.
          </p>
        )}

      </main>
    </div>
  );
}

