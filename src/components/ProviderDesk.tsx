"use client";

import { useMemo, useState } from "react";
import { PACKAGES } from "@/lib/data";
import { patchOrder, uploadOrderPhoto, useCatalog, useOrders, useSession } from "@/lib/api";
import { tl } from "@/lib/pricing";
import { canAddPhotos, nextStatus } from "@/lib/status";
import type { DropPoint, Order, OrderStatus, Provider } from "@/lib/types";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";
import { LaundryProfile } from "@/components/LaundryProfile";
import { FoodMenuEditor } from "@/components/FoodMenuEditor";
import { SewingServiceEditor } from "@/components/SewingServiceEditor";
import { RepairServiceEditor } from "@/components/RepairServiceEditor";
import { TechServiceEditor } from "@/components/TechServiceEditor";

const LABEL: Record<OrderStatus, string> = {
  onay_bekliyor: "Bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır",
  teslim_edildi: "Bitti",
  iptal: "İptal",
};

const BADGE: Record<OrderStatus, string> = {
  onay_bekliyor: "bg-[var(--sand)] text-[var(--clay)]",
  teslim_alindi: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  yikaniyor: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  utuleniyor: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  hazir: "bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)]",
  teslim_edildi: "bg-[var(--paper)] text-[var(--muted)]",
  iptal: "bg-[var(--paper)] text-[var(--muted)]",
};

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return label.charAt(0).toLocaleUpperCase("tr-TR") + label.slice(1);
}

export function ProviderDesk() {
  const { account } = useSession();
  const { providers, dropPoints, reload: reloadCatalog } = useCatalog();
  const { orders, ready, reload } = useOrders();
  const wallet = orders
    .filter((o) => o.paymentStatus === "captured")
    .reduce((s, o) => s + (o.total - o.commission), 0);
  const open = orders.filter((o) => o.status !== "teslim_edildi" && o.status !== "iptal");
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const months = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.status !== "teslim_edildi" && o.status !== "iptal") continue;
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
          <p className="text-xs text-[var(--muted)]">Çukurambar pilotu</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-[calc(var(--tabbar)+1.5rem)]">
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "40ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Cüzdan (tahsil)</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{tl(wallet)}</p>
          </div>
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "90ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Açık iş</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{open.length}</p>
          </div>
        </div>

        <LaundryProfile me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />

        <FoodMenuEditor me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />

        <SewingServiceEditor me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />

        <RepairServiceEditor me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />

        <TechServiceEditor me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">Gelen siparişler</h2>
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
                    <OrderCard
                      key={o.id}
                      order={o}
                      providers={providers}
                      dropPoints={dropPoints}
                      onChanged={reloadAll}
                      delay={i * 40}
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
                              <OrderCard
                                key={o.id}
                                order={o}
                                providers={providers}
                                dropPoints={dropPoints}
                                onChanged={reloadAll}
                                delay={i * 30}
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
      </main>
    </div>
  );
}

function OrderCard({
  order,
  providers,
  dropPoints,
  onChanged,
  delay,
}: {
  order: Order;
  providers: Provider[];
  dropPoints: DropPoint[];
  onChanged: () => void;
  delay: number;
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const p = providers.find((x) => x.id === order.providerId);
  const pack =
    p?.packages.find((x) => x.id === order.packageId) ??
    PACKAGES.find((x) => x.id === order.packageId);
  const drop = dropPoints.find((d) => d.id === order.dropPointId);
  const food = order.packageId === "davet";
  const sewing = order.packageId === "dikis";
  const repair = order.packageId === "tamir";
  const tech = order.packageId === "teknoloji";
  const catalog = food || sewing || repair || tech;
  const next = nextStatus(order.status, order.packageId, catalog);
  const foodLabel: Partial<Record<OrderStatus, string>> = {
    teslim_alindi: "Hazırlanıyor",
    hazir: "Hazır",
  };

  async function act(action: "accept" | "reject" | "advance" | "deliver") {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await patchOrder(order.id, action, action === "deliver" ? code : undefined);
      setCode("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className="k-rise rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)] transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(28,23,18,0.08)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[order.status]}`}>
        {catalog && foodLabel[order.status] ? foodLabel[order.status] : LABEL[order.status]}
      </p>
      <p className="mt-2 font-medium">
        {p?.name} ·{" "}
        {food
          ? `${order.guestCount ?? order.pieces} kişilik ${order.productName ?? "davet"}`
          : sewing || repair || tech
            ? `${order.guestCount ?? order.pieces} ${order.productName ?? "hizmet"}`
            : `${order.pieces} parça · ${pack?.title}`}
      </p>
      {food && order.allergyNote && (
        <p className="mt-1 text-sm text-[var(--muted)]">Alerji: {order.allergyNote}</p>
      )}
      <p className="mt-1 text-sm text-[var(--muted)]">
        {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
        {" · "}
        {order.drop === "kapi" ? "Kapı teslim" : drop?.name ?? "Nötr nokta"} · {order.slot}
      </p>
      {order.note && <p className="mt-1 text-sm">Not: {order.note}</p>}
      {order.photos.length > 0 && <PhotoStrip photos={order.photos} size="sm" />}
      <p className="mt-2 text-sm tabular-nums">
        {tl(order.total)} · eline {tl(order.total - order.commission)}
        {order.paymentStatus === "captured" ? " · tahsil edildi" : ""}
        {order.paymentStatus === "authorized" ? " · tutanakta" : ""}
      </p>
      {err && <p className="k-rise mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "onay_bekliyor" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("accept")}
              className="k-press k-cta rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white"
            >
              {busy ? "…" : "Kabul"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("reject")}
              className="k-press rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]"
            >
              Red
            </button>
          </>
        )}
        {next && order.status !== "onay_bekliyor" && order.status !== "hazir" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("advance")}
            className="k-press k-cta rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--paper)]"
          >
            {busy ? "…" : food && next === "hazir" ? "Hazır" : LABEL[next]}
          </button>
        )}
        {canAddPhotos(order.status) && (
          <PhotoAdd
            label="İş fotoğrafı"
            busy={busy}
            onPick={(file) => {
              void (async () => {
                setBusy(true);
                setErr("");
                try {
                  await uploadOrderPhoto(order.id, file);
                  await onChanged();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Fotoğraf yüklenemedi.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        )}
      </div>
      {order.status === "hazir" && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("deliver");
          }}
        >
          <p className="text-xs text-[var(--muted)]">
            Müşterinin 6 haneli teslim kodunu gir. Doğruysa ödeme cüzdana geçer.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="w-28 rounded-full bg-[var(--paper)] px-3 py-1.5 text-center font-[family-name:var(--font-display)] text-lg tabular-nums tracking-[0.2em] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              aria-label="Teslim kodu"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="k-press k-cta rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {busy ? "…" : "Doğrula · tahsil et"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
