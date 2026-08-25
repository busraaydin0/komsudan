"use client";

import Link from "next/link";
import { DROP_POINTS, PACKAGES, providerById } from "@/lib/data";
import { tl } from "@/lib/pricing";
import { patchOrder, useOrders } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  onay_bekliyor: "teslim_alindi",
  teslim_alindi: "yikaniyor",
  yikaniyor: "utuleniyor",
  utuleniyor: "hazir",
  hazir: "teslim_edildi",
};

const LABEL: Record<OrderStatus, string> = {
  onay_bekliyor: "Bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır",
  teslim_edildi: "Bitti",
  iptal: "İptal",
};

export function ProviderDesk() {
  const orders = useOrders();
  const wallet = orders
    .filter((o) => o.status === "teslim_edildi")
    .reduce((s, o) => s + (o.total - o.commission), 0);
  const open = orders.filter((o) => o.status !== "teslim_edildi" && o.status !== "iptal");

  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      <header className="mx-auto flex max-w-lg items-center justify-between px-5 pt-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl">Komşudan masa</p>
          <p className="text-xs text-[var(--muted)]">Hizmet veren · Çukurambar pilotu</p>
        </div>
        <Link href="/" className="text-sm text-[var(--teal)]">
          Harita
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-16">
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
            <p className="text-xs text-[var(--muted)]">Cüzdan (simülasyon)</p>
            <p className="font-[family-name:var(--font-display)] text-2xl">{tl(wallet)}</p>
          </div>
          <div className="rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
            <p className="text-xs text-[var(--muted)]">Açık iş</p>
            <p className="font-[family-name:var(--font-display)] text-2xl">{open.length}</p>
          </div>
        </div>

        <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl">Gelen siparişler</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Henüz sipariş yok. Haritadan bir katlayan seçip sipariş bırak.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const p = providerById(order.providerId);
  const pack = PACKAGES.find((x) => x.id === order.packageId);
  const drop = DROP_POINTS.find((d) => d.id === order.dropPointId);
  const next = NEXT[order.status];

  return (
    <li className="rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <p className="text-xs text-[var(--teal)]">{LABEL[order.status]}</p>
      <p className="mt-1 font-medium">
        {p?.name} · {order.pieces} parça · {pack?.title}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {order.drop === "kapi" ? "Kapı teslim" : drop?.name ?? "Nötr nokta"} · {order.slot}
      </p>
      {order.note && <p className="mt-1 text-sm">Not: {order.note}</p>}
      <p className="mt-2 text-sm">
        {tl(order.total)} · eline {tl(order.total - order.commission)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "onay_bekliyor" && (
          <>
            <button
              type="button"
              onClick={() => patchOrder(order.id, { status: "teslim_alindi" })}
              className="rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white"
            >
              Kabul
            </button>
            <button
              type="button"
              onClick={() => patchOrder(order.id, { status: "iptal" })}
              className="rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]"
            >
              Red
            </button>
          </>
        )}
        {next && order.status !== "onay_bekliyor" && (
          <button
            type="button"
            onClick={() => patchOrder(order.id, { status: next })}
            className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--paper)]"
          >
            {LABEL[next]}
          </button>
        )}
      </div>
    </li>
  );
}
