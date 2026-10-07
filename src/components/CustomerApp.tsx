"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PILOT, trustLabel } from "@/lib/data";
import { bayesianRating } from "@/lib/rating";
import { dryingListLabel } from "@/lib/drying";
import { formatKm, kmBetween } from "@/lib/geo";
import {
  ADDON_KINDS,
  ADDON_VARIANTS,
  LAUNDRY_SIZES,
  SIZE_LABELS,
  type LaundrySize,
  type OrderAddonLine,
} from "@/lib/laundryModel";
import { tl, resolveExpress } from "@/lib/pricing";
import { INSUFFICIENT_BALANCE_MESSAGE } from "@/lib/walletMethods";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import { isoDateInIstanbul } from "@/lib/capacity/istanbul";
import { providerLoadDisplay, sortKeyFreeSpace } from "@/lib/capacity/display";
import {
  postOrder,
  postPickupSummaryApprove,
  postPriceChange,
  postReview,
  patchOrder,
  fetchWallet,
  useCatalog,
  useOrders,
} from "@/lib/api";
import {
  catalogOfferCount,
  checkoutBackLabel,
  checkoutMeta,
  continueCta,
  emptyCatalogCopy,
  helloBlurb,
  listEmptyPriceLabel,
  listPrice,
  listPricedTag,
  notePlaceholder,
  placeBlockReason,
  placeOrderInput,
  quoteForProvider,
} from "@/lib/categories/customer";
import { clampPublicCategoryIds } from "@/lib/categories/registry";
import { readLocationIfGranted, subscribeLocation } from "@/lib/permissions";
import { canCancel, trackSteps } from "@/lib/status";
import { PhotoStrip, RatingBreakdownView, ReviewComposer, ReviewList } from "@/components/Photos";
import { Avatar } from "@/components/Avatar";
import type {
  LngLat,
  MapMode,
  AppointmentWindow,
  Order,
  PackageId,
  Provider,
} from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[var(--paper)]">
      <div className="k-skel absolute inset-0 opacity-40" />
    </div>
  ),
});

type NearbySort = "near" | "far" | "priceHigh" | "priceLow" | "rating" | "reviews" | "space";

const NEARBY_SORTS: { id: NearbySort; label: string }[] = [
  { id: "near", label: "Yakından uzağa" },
  { id: "far", label: "Uzaktan yakına" },
  { id: "priceHigh", label: "Fiyat çoktan aza" },
  { id: "priceLow", label: "Fiyat azdan çoğa" },
  { id: "rating", label: "En çok puanlanan" },
  { id: "reviews", label: "En çok yorum" },
  { id: "space", label: "Bugün yer var" },
];

function sortNearby(rows: { p: Provider; km: number }[], sort: NearbySort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "far") return b.km - a.km || b.p.rating - a.p.rating;
    if (sort === "priceHigh" || sort === "priceLow") {
      const pa = listPrice(a.p);
      const pb = listPrice(b.p);
      if (pa == null && pb == null) return a.km - b.km;
      if (pa == null) return 1;
      if (pb == null) return -1;
      const dir = sort === "priceHigh" ? -1 : 1;
      return (pa - pb) * dir || a.km - b.km;
    }
    if (sort === "rating") {
      return (
        bayesianRating(b.p.rating, b.p.reviews) - bayesianRating(a.p.rating, a.p.reviews) ||
        b.p.reviews - a.p.reviews ||
        a.km - b.km
      );
    }
    if (sort === "reviews") return b.p.reviews - a.p.reviews || b.p.rating - a.p.rating || a.km - b.km;
    if (sort === "space") return sortKeyFreeSpace(b.p) - sortKeyFreeSpace(a.p) || a.km - b.km;
    return a.km - b.km || b.p.rating - a.p.rating;
  });
  return copy;
}

type Sheet = "list" | "provider" | "checkout" | "track";

type Props = {
  pane?: "map" | "orders";
  mapActive?: boolean;
  meAvatar?: string | null;
  categoryIds?: string[];
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
  categoryIds,
  homeLat,
  homeLng,
  onOpenOrders,
  onPlacedOrder,
  onBackToMap,
  onEditDiscovery,
  onOpenMessages,
}: Props) {
  const { providers, ready, reload: reloadCatalog } = useCatalog(
    clampPublicCategoryIds(categoryIds),
  );
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
  const origin = user ?? home ?? PILOT.center;
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
        setUser((prev) => prev ?? home ?? PILOT.center);
        return;
      }
      const dist = kmBetween(loc, PILOT.center);
      setFar(dist > PILOT.radiusKm);
      setUser(dist > PILOT.radiusKm ? (home ?? PILOT.center) : loc);
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
      orders.find((o) => o.status === "hazir") ??
      orders.find((o) => o.status !== "teslim_edildi" && o.status !== "iptal") ??
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
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{PILOT.label}</p>
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
              <List
                ranked={ranked}
                ready={ready}
                onPick={openProvider}
                onSortChange={() => setListTall(true)}
                onEditDiscovery={onEditDiscovery}
                onTrack={
                  orders[0]
                    ? () => {
                        const prefer =
                          orders.find((o) => o.status === "hazir") ??
                          orders.find((o) => o.status !== "teslim_edildi" && o.status !== "iptal") ??
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
              <ProviderPane
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
              <Checkout
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
                        {STEP_LABEL[o.status]}
                        {!o.review && o.status === "teslim_edildi" ? " · yorum" : ""}
                      </button>
                    ))}
                  </div>
                )}
                <Track
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

function List({
  ranked,
  ready,
  onPick,
  onTrack,
  onSortChange,
  onEditDiscovery,
}: {
  ranked: { p: Provider; km: number }[];
  ready: boolean;
  onPick: (id: string) => void;
  onTrack?: () => void;
  onSortChange?: () => void;
  onEditDiscovery?: () => void;
}) {
  const [sort, setSort] = useState<NearbySort>("near");
  const sorted = useMemo(() => sortNearby(ranked, sort), [ranked, sort]);

  function pickSort(id: NearbySort) {
    setSort(id);
    onSortChange?.();
  }

  return (
    <div className="p-4 pt-2">
      {onEditDiscovery && (
        <button type="button" onClick={onEditDiscovery} className="k-press text-xs text-[var(--muted)]">
          ← Hizmet al / ver
        </button>
      )}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className={`font-[family-name:var(--font-display)] text-xl ${onEditDiscovery ? "mt-1" : ""}`}>
          Yakındakiler
        </h2>
        {onTrack && (
          <button type="button" onClick={onTrack} className="k-press text-xs text-[var(--teal)]">
            Siparişimi gör
          </button>
        )}
      </div>
      <div
        className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        role="group"
        aria-label="Sıralama"
      >
        {NEARBY_SORTS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={sort === opt.id}
            onClick={() => pickSort(opt.id)}
            className={`k-chip shrink-0 rounded-full px-2.5 py-1.5 text-xs ring-1 ${
              sort === opt.id
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {!ready ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="k-skel h-[4.25rem] rounded-2xl" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {sorted.map(({ p, km }, i) => {
            const loadMeta = providerLoadDisplay(p);
            const tone = loadMeta.tone;
            const load = loadMeta.loadLabel;
            const tag =
              tone === "full"
                ? "text-[var(--load-full)]"
                : tone === "low"
                  ? "text-[var(--load-low)]"
                  : "";
            const price = listPrice(p);
            return (
              <li key={p.id} className="k-rise" style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="k-card flex w-full items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-3 text-left ring-1 ring-[var(--line)]"
                >
                  <Avatar name={p.name} url={p.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {p.neighborhood} · {formatKm(km)} · {trustLabel(p.trust)}
                      {dryingListLabel(p) ? ` · ${dryingListLabel(p)}` : ""}
                      {load ? (
                        <span className={tag}>
                          {" · "}
                          {load}
                        </span>
                      ) : null}
                    </span>
                    {loadMeta.deliveryLine ? (
                      <span className="mt-1 block text-[11px] text-[var(--muted)]">{loadMeta.deliveryLine}</span>
                    ) : null}
                    <span className="mt-2 flex h-1 w-28 gap-px overflow-hidden rounded-full bg-[var(--line)]">
                      {loadMeta.weekBars.map((pct, j) => (
                        <span
                          key={j}
                          className={`h-full flex-1 ${pct >= 100 ? "bg-[var(--load-full)]" : pct >= 67 ? "bg-[var(--load-low)]" : "bg-[var(--teal)]"}`}
                          style={{ opacity: pct >= 100 ? 1 : 0.35 + (pct / 100) * 0.65 }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block tabular-nums">
                      ⭐ {p.rating.toFixed(1)}
                      <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                        · {p.reviews} değerlendirme
                      </span>
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {price == null ? listEmptyPriceLabel() : listPricedTag(price)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProviderPane({
  p,
  km,
  pkg,
  onPkg,
  onBack,
  onNext,
}: {
  p: Provider;
  km: number;
  pkg: PackageId;
  onPkg: (id: PackageId) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const loadMeta = providerLoadDisplay(p);
  const tone = loadMeta.tone;
  const canNext = catalogOfferCount(p) > 0;
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 p-4 pt-2 pb-3">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← Liste
      </button>
      <div className="mt-2 flex items-start gap-3">
        <Avatar name={p.name} url={p.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{p.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            {p.neighborhood} · {formatKm(km)} · ⭐ {p.rating} · {p.reviews} değerlendirme ·{" "}
            <span
              className={
                tone === "full"
                  ? "text-[var(--load-full)]"
                  : tone === "low"
                    ? "text-[var(--load-low)]"
                    : ""
              }
            >
              {loadMeta.deliveryLine ?? (loadMeta.loadLabel ?? "Müsait")}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{p.bio}</p>
      <RatingBreakdownView rating={p.ratingBreakdown} />
      {(p.workPhotos.length > 0 || p.recentReviews.length > 0) && (
        <>
          <h3 className="mt-4 text-sm font-medium">Yorumlar</h3>
          {p.workPhotos.length > 0 && <PhotoStrip photos={p.workPhotos} />}
          <ReviewList reviews={p.recentReviews} />
        </>
      )}
      <div className="mt-4 grid gap-2">
        {p.packages.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => onPkg(pack.id)}
                className={`k-chip rounded-2xl px-3 py-3 text-left ring-1 ${
                  pkg === pack.id
                    ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                    : "bg-[var(--paper)] ring-[var(--line)]"
                }`}
              >
                <span className="flex justify-between font-medium">
                  {pack.title}
                  <span className="tabular-nums">{tl(pack.pricePerPiece)}/orta</span>
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
              </button>
            ))}
        {emptyCatalogCopy() ? <p className="text-sm text-[var(--muted)]">{emptyCatalogCopy()}</p> : null}
      </div>
      </div>
      <div className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--card)] px-4 pb-4 pt-3">
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="k-press k-cta w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)] disabled:opacity-40"
        >
          {continueCta()}
        </button>
      </div>
    </div>
  );
}

function addonQty(addons: OrderAddonLine[], addon: OrderAddonLine["addon"], variant: OrderAddonLine["variant"]) {
  return addons.find((a) => a.addon === addon && a.variant === variant)?.qty ?? 0;
}

function setAddonQty(
  addons: OrderAddonLine[],
  addon: OrderAddonLine["addon"],
  variant: OrderAddonLine["variant"],
  qty: number,
): OrderAddonLine[] {
  const next = addons.filter((a) => !(a.addon === addon && a.variant === variant));
  if (qty > 0) next.push({ addon, variant, qty });
  return next;
}

function Checkout({
  p,
  size,
  onSize,
  addons,
  onAddons,
  express,
  scheduleStep,
  onScheduleStep,
  pickup,
  onPickup,
  delivery,
  onDelivery,
  minDeliveryDate,
  note,
  onNote,
  quote,
  walletBalance,
  payGate,
  err,
  placing,
  onBack,
  onPlace,
}: {
  p: Provider;
  size: LaundrySize;
  onSize: (s: LaundrySize) => void;
  addons: OrderAddonLine[];
  onAddons: (a: OrderAddonLine[]) => void;
  express: boolean;
  scheduleStep: "pickup" | "delivery";
  onScheduleStep: (s: "pickup" | "delivery") => void;
  pickup: AppointmentWindow | null;
  onPickup: (w: AppointmentWindow) => void;
  delivery: AppointmentWindow | null;
  onDelivery: (w: AppointmentWindow) => void;
  minDeliveryDate?: string;
  note: string;
  onNote: (s: string) => void;
  quote: {
    total: number;
    before: number;
    commission: number;
    providerNet: number;
    machineUnits?: number;
  };
  walletBalance: number | null;
  payGate: 0 | 1 | null;
  err: string;
  placing: boolean;
  onBack: () => void;
  onPlace: () => void;
}) {
  const { canPlace } = checkoutMeta(p);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 p-4 pt-2 pb-3">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        {checkoutBackLabel()}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Boy</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Makine yükünü seç. Renk ayrımı standart; ek ücret yok.
      </p>
      <div className="mt-3 grid gap-2">
        {LAUNDRY_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSize(s)}
            className={`k-chip rounded-2xl px-4 py-3 text-left ring-1 ${
              size === s ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            <span className="font-medium">{SIZE_LABELS[s].title}</span>
            <span className="mt-0.5 block text-xs opacity-90">{SIZE_LABELS[s].hint}</span>
          </button>
        ))}
      </div>
      <h3 className="mt-5 text-sm font-medium">Ekler</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">Yorgan / battaniye · her ek 2 makine birimi</p>
      <div className="mt-2 space-y-2">
        {ADDON_KINDS.map((kind) => (
          <div key={kind} className="rounded-2xl ring-1 ring-[var(--line)] p-3">
            <p className="text-sm font-medium capitalize">{kind}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ADDON_VARIANTS.map((variant) => {
                const qty = addonQty(addons, kind, variant);
                return (
                  <div key={variant} className="flex items-center gap-2 rounded-full bg-[var(--paper)] px-2 py-1 ring-1 ring-[var(--line)]">
                    <span className="text-xs capitalize">{variant}</span>
                    <button
                      type="button"
                      aria-label="Azalt"
                      className="k-press px-2"
                      onClick={() => onAddons(setAddonQty(addons, kind, variant, Math.max(0, qty - 1)))}
                    >
                      −
                    </button>
                    <span className="tabular-nums text-sm w-4 text-center">{qty}</span>
                    <button
                      type="button"
                      aria-label="Artır"
                      className="k-press px-2"
                      onClick={() => onAddons(setAddonQty(addons, kind, variant, qty + 1))}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {placeBlockReason(p, quote.machineUnits) ? (
        <p className="mt-2 text-xs text-[var(--clay)]">{placeBlockReason(p, quote.machineUnits)}</p>
      ) : null}
      {express ? (
        <p className="mt-4 text-xs text-[var(--muted)]">Bugün alım: aynı gün express (+%25) uygulanır.</p>
      ) : null}
      <p className="mt-2 text-sm text-[var(--muted)]">Kapıda bırak · hazır olunca yine kapında al.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onScheduleStep("pickup")}
          className={`k-chip rounded-full px-3 py-1 text-xs ring-1 ${scheduleStep === "pickup" ? "bg-[var(--ink)] text-[var(--paper)]" : "ring-[var(--line)]"}`}
        >
          1 · Alım
        </button>
        <button
          type="button"
          disabled={!pickup}
          onClick={() => onScheduleStep("delivery")}
          className={`k-chip rounded-full px-3 py-1 text-xs ring-1 ${scheduleStep === "delivery" ? "bg-[var(--ink)] text-[var(--paper)]" : "ring-[var(--line)]"} disabled:opacity-40`}
        >
          2 · Teslim
        </button>
      </div>
      {scheduleStep === "pickup" ? (
        <AppointmentCalendar
          providerId={p.id}
          title="Alım penceresi (2 saat)"
          value={pickup}
          onPick={onPickup}
        />
      ) : (
        <AppointmentCalendar
          providerId={p.id}
          title="Teslim penceresi"
          minDate={minDeliveryDate}
          value={delivery}
          onPick={onDelivery}
        />
      )}
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder={notePlaceholder()}
        className="mt-4 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none transition-[box-shadow] duration-200 focus:ring-[var(--teal)]"
        rows={2}
      />
      {canPlace && payGate === 0 ? (
        <p className="k-rise mt-2 text-sm text-[var(--clay)]">{INSUFFICIENT_BALANCE_MESSAGE}</p>
      ) : null}
      {err && payGate !== 0 ? <p className="k-rise mt-2 text-sm text-[var(--clay)]">{err}</p> : null}
      </div>
      <div className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--card)] px-4 pb-4 pt-3">
        <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">
          {canPlace ? tl(quote.total) : "İnceleme sonrası"}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {!canPlace
            ? "Bu hizmette sipariş yok; fiyat cihazı görünce netleşir. "
            : `${quote.machineUnits ?? ""} makine birimi. `}
          {canPlace && walletBalance != null
            ? `Bakiye ${tl(walletBalance)}. Ödeme ${payGate === 1 ? "1 · alınır" : "0 · alınmaz"}. `
            : ""}
          {canPlace ? "Tutar bakiyeden düşer; teslim kodunda tahsil kesinleşir." : ""}
        </p>
        <button
          type="button"
          disabled={placing || !canPlace}
          onClick={onPlace}
          className="k-press k-cta mt-3 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)] disabled:opacity-40"
        >
          {placing ? "Gönderiliyor…" : canPlace ? "Siparişi bırak" : "Sipariş yok · inceleme"}
        </button>
      </div>
    </div>
  );
}

const STEP_LABEL: Record<Order["status"], string> = {
  onay_bekliyor: "Onay bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır, teslim al",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

function Track({
  order,
  provider,
  backLabel,
  onBack,
  onReload,
  onOpenMessages,
}: {
  order: Order;
  provider: Provider | undefined;
  backLabel: string;
  onBack: () => void;
  onReload: () => void;
  onOpenMessages?: (orderId: string) => void;
}) {
  const steps = trackSteps(order.packageId);
  const idx = steps.indexOf(order.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← {backLabel}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
        {order.publicCode ?? `Sipariş ${order.id}`}
      </h2>
      <p className="text-sm text-[var(--muted)]">
        {provider?.name} · {SIZE_LABELS[order.size]?.title ?? order.size} · {tl(order.total)}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Evde yokken kapıya veya komşuya bırakma yok; teslim yalnız yüz yüze ve kodla.
      </p>
      {order.priceChange === "pending" && order.status !== "iptal" && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--clay)]">
          <p className="text-sm font-medium">Kapıda farklı boy veya ek</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Güncel tutar {tl(order.total)}. Onaylamazsan sipariş iptal olur.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="k-press k-cta flex-1 rounded-full bg-[var(--teal)] py-2 text-sm text-white"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPriceChange(order.id, "approve");
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Onay alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Onayla
            </button>
            <button
              type="button"
              disabled={busy}
              className="k-press flex-1 rounded-full py-2 text-sm ring-1 ring-[var(--line)]"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPriceChange(order.id, "reject");
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Red alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Reddet
            </button>
          </div>
        </div>
      )}
      {order.status === "iptal" && (
        <p className="mt-3 text-sm text-[var(--clay)]">
          Sipariş iptal edildi. Bakiyedeki tutanak çözüldü, para çekilmedi.
          {order.cancelReason === "size_rejected" ? " (Boy/ek uyuşmadı.)" : ""}
        </p>
      )}
      {order.pickupConfirmedAt &&
        !order.pickupSummaryApprovedAt &&
        order.priceChange !== "pending" &&
        order.status !== "iptal" && (
          <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--teal)]">
            <p className="text-sm font-medium">Kapıdaki özet doğru mu?</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Boy, ekler ve foto onayından sonra alım kodu açılır; hizmet veren kodu girerek çamaşırı alır.
            </p>
            <button
              type="button"
              disabled={busy}
              className="k-press k-cta mt-3 w-full rounded-full bg-[var(--teal)] py-2 text-sm text-white"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPickupSummaryApprove(order.id);
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Onay alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Özeti onayla
            </button>
          </div>
        )}
      {order.pickupHandoffCode && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--line)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--muted)] uppercase">Alım kodu</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.pickupHandoffCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">Yalnız hizmet verene söyle; uygulamada kalır.</p>
        </div>
      )}
      {order.status === "hazir" && order.returnHandoffCode && !order.adminHold && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--teal)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">Teslim kodu</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.returnHandoffCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Teslimde kodu söyle; komşuya veya kapıya bırakma yok. Kod girilince {tl(order.total)} tahsil edilir.
          </p>
        </div>
      )}
      {order.adminHold && order.disputeWindowEnd && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--clay)]">
          <p className="text-sm font-medium">Kodsuz teslim bildirimi</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Hizmet veren kod olmadan teslim bildirdi.{" "}
            {new Date(order.disputeWindowEnd).toLocaleString("tr-TR")} tarihine kadar itiraz edebilirsin.
          </p>
        </div>
      )}
      {order.paymentStatus === "authorized" && order.status !== "iptal" && order.status !== "hazir" && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Bakiyede {tl(order.total)} tutanak. Teslim kodundan sonra kesinleşir.
        </p>
      )}
      {order.paymentStatus === "captured" && (
        <p className="mt-3 text-sm text-[var(--teal)]">
          Ödeme alındı · {tl(order.total)}
          {order.paidAt
            ? ` · ${new Date(order.paidAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`
            : ""}
        </p>
      )}
      {order.photos.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">İş fotoğrafları</h3>
          <PhotoStrip photos={order.photos} />
        </>
      )}
      <ol className="mt-5">
        {steps.map((s, i) => {
          const done = i < idx;
          const current = i === idx && order.status !== "iptal";
          return (
            <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  className={`absolute top-3 left-[5px] h-[calc(100%-4px)] w-px ${
                    done ? "bg-[var(--teal)]" : "bg-[var(--line)]"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  current
                    ? "k-pulse-dot bg-[var(--teal)]"
                    : done
                      ? "bg-[var(--teal)]"
                      : "bg-[var(--line)]"
                }`}
              />
              <span
                className={`text-sm ${
                  current || done ? "text-[var(--ink)]" : "text-[var(--muted)]"
                } ${current ? "font-medium" : ""}`}
              >
                {STEP_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {order.status === "hazir"
          ? "Hizmet veren kodu girince iş biter ve para geçer."
          : order.status === "teslim_edildi"
            ? "Teslim bitti. İstersen yorum ve fotoğraf bırak."
            : order.status === "onay_bekliyor"
              ? "Komşu kabul etmeden iptal edebilirsin. Tutanak çözülür, para çekilmez."
              : "Durumu Hizmet sekmesinden ilerlet. Canlı sunucudan güncellenir."}
      </p>
      {onOpenMessages && (
        <button
          type="button"
          onClick={() => onOpenMessages(order.id)}
          className="k-press mt-4 w-full rounded-2xl bg-[var(--card)] py-3 text-sm ring-1 ring-[var(--line)]"
        >
          Mesajlar’da aç
        </button>
      )}
      {canCancel(order.status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void (async () => {
              if (!window.confirm("Sipariş iptal edilsin mi? Ön otorizasyon çözülür, para çekilmez.")) {
                return;
              }
              setBusy(true);
              setErr("");
              try {
                await patchOrder(order.id, "reject");
                onReload();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "İptal alınamadı.");
              } finally {
                setBusy(false);
              }
            })();
          }}
          className="k-press mt-4 w-full rounded-full py-2.5 text-sm text-[var(--clay)] ring-1 ring-[var(--line)]"
        >
          {busy ? "…" : "Siparişi iptal et"}
        </button>
      )}
      {order.status === "teslim_edildi" && order.review && (
        <div className="mt-4">
          <h3 className="text-sm font-medium">Yorumun</h3>
          <ReviewList reviews={[order.review]} />
        </div>
      )}
      {order.status === "teslim_edildi" && !order.review && (
        <ReviewComposer
          busy={busy}
          err={err}
          onSubmit={(input) => {
            void (async () => {
              setBusy(true);
              setErr("");
              try {
                await postReview(order.id, input);
                onReload();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Yorum alınamadı.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </div>
  );
}
