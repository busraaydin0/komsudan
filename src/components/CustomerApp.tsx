"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PILOT_AREA } from "@/lib/laundry/pilot";
import { kmBetween } from "@/lib/geo";
import { type LaundrySize, type OrderAddonLine } from "@/lib/laundryModel";
import { resolveExpress } from "@/lib/pricing";
import { isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { postOrder, fetchWallet, useCatalog, useOrders } from "@/lib/api";
import {
  helloBlurb,
  placeBlockReason,
  placeOrderInput,
  quoteForProvider,
} from "@/lib/laundry/customerUi";
import { readLocationIfGranted, subscribeLocation } from "@/lib/permissions";
import { statusMeta } from "@/lib/status";
import { CustomerNearbyList } from "@/components/laundry/customer/CustomerNearbyList";
import { CustomerProviderSheet } from "@/components/laundry/customer/CustomerProviderSheet";
import { CustomerCheckoutSheet } from "@/components/laundry/customer/CustomerCheckoutSheet";
import { CustomerOrderTrack } from "@/components/laundry/customer/CustomerOrderTrack";
import type { LngLat, MapMode, AppointmentWindow, PackageId } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[var(--paper)]">
      <div className="k-skel absolute inset-0 opacity-40" />
    </div>
  ),
});

type Sheet = "list" | "provider" | "checkout" | "track";

type Props = {
  pane?: "map" | "orders";
  mapActive?: boolean;
  meAvatar?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  onOpenOrders?: () => void;
  onPlacedOrder?: () => void;
  onBackToMap?: () => void;
  onEditDiscovery?: () => void;
  onOpenMessages?: (orderId: string) => void;
};

export function CustomerApp({
  pane = "map",
  mapActive = true,
  meAvatar,
  homeLat,
  homeLng,
  onOpenOrders,
  onPlacedOrder,
  onBackToMap,
  onEditDiscovery,
  onOpenMessages,
}: Props) {
  const { providers, ready, reload: reloadCatalog } = useCatalog();
  const { orders, reload: reloadOrders } = useOrders();
  const [mode, setMode] = useState<MapMode>("3d");
  const [user, setUser] = useState<LngLat | null>(null);
  const [far, setFar] = useState(false);
  const [hello, setHello] = useState(true);
  const [sheet, setSheet] = useState<Sheet>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageId>("tam");
  const [size, setSize] = useState<LaundrySize>("orta");
  const [addons, setAddons] = useState<OrderAddonLine[]>([]);
  const [pickup, setPickup] = useState<AppointmentWindow | null>(null);
  const [delivery, setDelivery] = useState<AppointmentWindow | null>(null);
  const [scheduleStep, setScheduleStep] = useState<"pickup" | "delivery">("pickup");
  const [note, setNote] = useState("");
  const [dryerOnly, setDryerOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listTall, setListTall] = useState(false);
  const listDrag = useRef<{ y: number } | null>(null);
  const [err, setErr] = useState("");
  const [placing, setPlacing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const home =
    homeLat != null && homeLng != null ? { lat: homeLat, lng: homeLng } : null;
  const origin = user ?? home ?? PILOT_AREA.center;
  const ranked = useMemo(() => {
    return providers
      .filter((p) => (dryerOnly ? p.hasDryer : true))
      .map((p) => ({ p, km: kmBetween(origin, p.loc) }))
      .sort((a, b) => a.km - b.km);
  }, [origin, dryerOnly, providers]);
  const available = ranked.filter(({ p }) => p.capacity?.configured && p.capacity.weekTone !== "full").length;

  const selected = selectedId ? providers.find((p) => p.id === selectedId) : undefined;
  const active = orders.find((o) => o.id === activeId) ?? orders[0];
  const pickupDate = pickup?.date ?? isoDateInIstanbul(new Date());
  const express = resolveExpress(Boolean(selected?.express), pickupDate);
  const quote = quoteForProvider(selected, {
    size,
    addons,
    pkg,
    pickupDate,
  });
  const payGate: 0 | 1 | null =
    walletBalance == null ? null : walletBalance >= quote.total ? 1 : 0;

  useEffect(() => {
    void fetchWallet(quote.total)
      .then((data) => setWalletBalance(data.wallet.balance))
      .catch(() => setWalletBalance(null));
  }, [quote.total, sheet, placing]);

  useEffect(() => {
    function apply(loc: LngLat | null) {
      if (!loc) {
        setUser((prev) => prev ?? home ?? PILOT_AREA.center);
        return;
      }
      const dist = kmBetween(loc, PILOT_AREA.center);
      setFar(dist > PILOT_AREA.radiusKm);
      setUser(dist > PILOT_AREA.radiusKm ? (home ?? PILOT_AREA.center) : loc);
    }

    apply(null);
    const unsub = subscribeLocation(apply);
    void readLocationIfGranted().then(apply);
    return unsub;
  }, [homeLat, homeLng]);

  useEffect(() => {
    if (pane === "map") {
      setSheet("list");
      setSelectedId(null);
    }
  }, [pane]);

  useEffect(() => {
    if (pane !== "orders") return;
    setHello(false);
    const prefer =
      orders.find((o) => o.status === "ready" || o.status === "admin_pending") ??
      orders.find(
        (o) =>
          o.status !== "completed" &&
          o.status !== "cancelled" &&
          o.status !== "rejected" &&
          o.status !== "disputed",
      ) ??
      orders[0];
    if (prefer) {
      setActiveId(prefer.id);
      setSheet("track");
    } else {
      setSheet("list");
    }
  }, [pane, orders]);

  useEffect(() => {
    if (selected) {
      setPkg(selected.packages.some((x) => x.id === pkg) ? pkg : (selected.packages[0]?.id ?? "tam"));
      setPickup(null);
      setDelivery(null);
      setScheduleStep("pickup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function openProvider(id: string) {
    setSelectedId(id);
    setSheet("provider");
    setHello(false);
  }

  function onListScroll(e: React.UIEvent<HTMLDivElement>) {
    if (pane !== "map" || sheet !== "list") return;
    if (!listTall && e.currentTarget.scrollTop > 8) setListTall(true);
  }

  function onSheetPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (pane !== "map" || sheet !== "list") return;
    listDrag.current = { y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSheetPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!listDrag.current) return;
    const dy = listDrag.current.y - e.clientY;
    listDrag.current = null;
    if (Math.abs(dy) < 12) {
      setListTall((open) => !open);
      return;
    }
    if (dy > 28) setListTall(true);
    else if (dy < -28) setListTall(false);
  }

  async function place() {
    if (!selected || placing) return;
    setErr("");
    setPlacing(true);
    try {
      const blocked = placeBlockReason(selected, quote.machineUnits);
      if (blocked) {
        setErr(blocked);
        setPlacing(false);
        return;
      }
      if (!pickup || !delivery) {
        setErr("Alım ve teslim penceresi seç.");
        setPlacing(false);
        return;
      }
      const order = await postOrder(
        placeOrderInput(selected, {
          note,
          pkg,
          size,
          addons,
          pickup,
          delivery,
        }),
      );
      await Promise.all([reloadOrders(), reloadCatalog()]);
      void fetchWallet().then((data) => setWalletBalance(data.wallet.balance)).catch(() => null);
      setActiveId(order.id);
      setSheet("track");
      onPlacedOrder?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sipariş alınamadı.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      <MapCanvas
        mode={mode}
        selectedId={selectedId}
        user={user}
        meAvatar={meAvatar}
        providers={providers}
        visible={mapActive}
        onSelect={openProvider}
      />
      <div className="k-map-vignette pointer-events-none absolute inset-0 z-[1]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <div className="k-glass k-rise pointer-events-auto rounded-2xl px-3 py-2 ring-1 ring-[var(--line)]">
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-lg leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Komşudan
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{PILOT_AREA.label}</p>
        </div>
        <div className="k-rise pointer-events-auto mr-12 flex items-center gap-2" style={{ animationDelay: "60ms" }}>
          <div
            className="k-glass relative grid grid-cols-2 rounded-full p-1 ring-1 ring-[var(--line)]"
            role="group"
            aria-label="Harita görünümü"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--ink)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: mode === "3d" ? "translateX(calc(100% + 4px))" : "translateX(0)",
              }}
            />
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-medium uppercase transition-colors duration-200 ${
                  mode === m ? "text-[var(--paper)]" : "text-[var(--muted)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      {pane === "map" && (
      <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+5rem)] left-3 z-10">
        <div className="k-rise pointer-events-auto flex flex-wrap gap-1.5" style={{ animationDelay: "90ms" }}>
          <button
            type="button"
            onClick={() => setDryerOnly((v) => !v)}
            className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 backdrop-blur ${
              dryerOnly
                ? "bg-[var(--teal)] text-white ring-[var(--teal)]"
                : "k-glass ring-[var(--line)]"
            }`}
          >
            Kurutucu var
          </button>
        </div>
        {far && (
          <p className="k-glass k-rise pointer-events-auto mt-2 max-w-[16rem] rounded-xl px-3 py-2 text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
            Pilot bölge Çukurambar. Harita oraya alındı — sen uzaktasın.
          </p>
        )}
      </div>
      )}

      {hello && sheet === "list" && pane === "map" && (
        <>
          <button
            type="button"
            aria-label="Karşılamayı kapat"
            onClick={() => setHello(false)}
            className="k-welcome-dim absolute inset-0 z-[15] bg-[rgba(28,23,18,0.18)]"
          />
          <div className="absolute inset-x-0 top-[26%] z-20 mx-auto max-w-md px-4">
            <div className="k-welcome k-glass rounded-3xl p-5 shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)]">
              <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
                Bırak · işlensin · al
              </p>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl leading-tight">
                Çevrende{" "}
                <span className="text-[var(--teal)] tabular-nums">{ready ? available : "—"}</span>{" "}
                kişi şu anda müsait.
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {helloBlurb()}
              </p>
              <button
                type="button"
                onClick={() => setHello(false)}
                className="k-press k-cta mt-4 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.28)]"
              >
                Haritayı aç
              </button>
            </div>
          </div>
        </>
      )}

      <section
        className={`absolute inset-x-0 z-10 mx-auto max-w-lg min-h-0 overflow-hidden px-3 transition-[height,max-height,top] duration-300 ease-[var(--ease-out)] ${
          pane === "orders"
            ? "top-[calc(env(safe-area-inset-top)+4.25rem)] bottom-[var(--tabbar)]"
            : `bottom-[var(--tabbar)] ${
                sheet === "list" && !listTall
                  ? "h-[38vh] max-h-[38vh]"
                  : "h-[calc(100dvh-var(--tabbar)-5.5rem)] max-h-[calc(100dvh-var(--tabbar)-5.5rem)]"
              }`
        }`}
      >
        <div
          className="h-full min-h-0 overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--card)] shadow-[var(--shadow-sheet)] ring-1 ring-[var(--line)]"
          onScroll={onListScroll}
        >
          <div className="sticky top-0 z-10 flex justify-center bg-[var(--card)] pt-2 pb-1">
            <button
              type="button"
              aria-label={listTall ? "Listeyi küçült" : "Listeyi aç"}
              aria-expanded={listTall}
              className="flex h-7 w-full touch-none items-center justify-center"
              onPointerDown={onSheetPointerDown}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={() => {
                listDrag.current = null;
              }}
            >
              <span className="h-1 w-10 rounded-full bg-[var(--line)]" />
            </button>
          </div>
          <div key={sheet} className="k-sheet">
            {sheet === "list" && pane === "map" && (
              <CustomerNearbyList
                ranked={ranked}
                ready={ready}
                onPick={openProvider}
                onSortChange={() => setListTall(true)}
                onEditDiscovery={onEditDiscovery}
                onTrack={
                  orders[0]
                    ? () => {
                        const prefer =
                          orders.find((o) => o.status === "ready" || o.status === "admin_pending") ??
                          orders.find(
                            (o) =>
                              o.status !== "completed" &&
                              o.status !== "cancelled" &&
                              o.status !== "rejected" &&
                              o.status !== "disputed",
                          ) ??
                          orders[0];
                        setActiveId(prefer.id);
                        setSheet("track");
                        onOpenOrders?.();
                      }
                    : undefined
                }
              />
            )}
            {sheet === "provider" && selected && (
              <CustomerProviderSheet
                p={selected}
                km={kmBetween(origin, selected.loc)}
                pkg={pkg}
                onPkg={setPkg}
                onBack={() => {
                  setSheet("list");
                  setSelectedId(null);
                }}
                onNext={() => setSheet("checkout")}
              />
            )}
            {sheet === "checkout" && selected && (
              <CustomerCheckoutSheet
                p={selected}
                size={size}
                onSize={setSize}
                addons={addons}
                onAddons={setAddons}
                express={express}
                scheduleStep={scheduleStep}
                onScheduleStep={setScheduleStep}
                pickup={pickup}
                onPickup={(w) => {
                  setPickup(w);
                  setDelivery(null);
                  setScheduleStep("delivery");
                }}
                delivery={delivery}
                onDelivery={setDelivery}
                minDeliveryDate={pickup?.date}
                note={note}
                onNote={setNote}
                quote={quote}
                walletBalance={walletBalance}
                payGate={payGate}
                err={err}
                placing={placing}
                onBack={() => setSheet("provider")}
                onPlace={() => void place()}
              />
            )}
            {sheet === "track" && active && (
              <>
                {pane === "orders" && orders.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto px-4 pb-1">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setActiveId(o.id)}
                        className={`k-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                          o.id === active.id
                            ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                            : "ring-[var(--line)]"
                        }`}
                      >
                        {statusMeta(o.status).label}
                        {!o.review && o.status === "completed" ? " · yorum" : ""}
                      </button>
                    ))}
                  </div>
                )}
                <CustomerOrderTrack
                order={active}
                provider={providers.find((p) => p.id === active.providerId)}
                backLabel={pane === "orders" ? "Harita" : "Liste"}
                onBack={() => {
                  if (pane === "orders") onBackToMap?.();
                  else setSheet("list");
                }}
                onReload={() => void Promise.all([reloadOrders(), reloadCatalog()])}
                onOpenMessages={onOpenMessages}
              />
              </>
            )}
            {pane === "orders" && !active && (
              <div className="p-6 pt-2">
                <h2 className="font-[family-name:var(--font-display)] text-2xl">Siparişin</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Henüz sipariş yok. Haritadan bir komşu seç, çamaşırı bırak.
                </p>
                <button
                  type="button"
                  onClick={() => onBackToMap?.()}
                  className="k-press k-cta mt-4 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white"
                >
                  Haritaya dön
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
