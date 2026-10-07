"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PILOT, trustLabel } from "@/lib/data";
import { bayesianRating } from "@/lib/rating";
import { dryingListLabel } from "@/lib/drying";
import { formatKm, kmBetween } from "@/lib/geo";
import { tl, clampPieces, PIECES_MAX, PIECES_MIN, resolveExpress } from "@/lib/pricing";
import { INSUFFICIENT_BALANCE_MESSAGE } from "@/lib/walletMethods";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import {
  DEFAULT_DURATION_MINUTES,
  defaultPilotSlot,
  formatPilotSlot,
  minutesToHmm,
  parsePilotSlot,
} from "@/lib/timeWindow";
import { seatLabel, seatTone } from "@/lib/seat";
import { postOrder, postReview, patchOrder, fetchWallet, useCatalog, useOrders } from "@/lib/api";
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
import { clampPublicCategoryIds, seatPhraseFor } from "@/lib/categories/registry";
import { readLocationIfGranted, subscribeLocation } from "@/lib/permissions";
import { canCancel, trackSteps } from "@/lib/status";
import { PhotoStrip, RatingBreakdownView, ReviewComposer, ReviewList } from "@/components/Photos";
import { Avatar } from "@/components/Avatar";
import type {
  DropMethod,
  DropPoint,
  LngLat,
  MapMode,
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

const PIECES = [8, 12, 16, 24, 32];

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
    if (sort === "space") return b.p.remaining - a.p.remaining || a.km - b.km;
    return a.km - b.km || b.p.rating - a.p.rating;
  });
  return copy;
}

type Sheet = "list" | "provider" | "checkout" | "track";

type Props = {
  pane?: "map" | "orders";
  mapActive?: boolean;
  loyaltyLabel?: string;
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
  loyaltyLabel = "Komşu",
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
  const { providers, dropPoints, ready, reload: reloadCatalog } = useCatalog(
    clampPublicCategoryIds(categoryIds),
  );
  const { orders, reload: reloadOrders } = useOrders();
  const [mode, setMode] = useState<MapMode>("3d");
  const [user, setUser] = useState<LngLat | null>(null);
  const [far, setFar] = useState(false);
  const [hello, setHello] = useState(true);
  const [sheet, setSheet] = useState<Sheet>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageId>("tam");
  const [pieces, setPieces] = useState(16);
  const [drop, setDrop] = useState<DropMethod>("nokta");
  const [slot, setSlot] = useState("");
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
  const available = ranked.filter(({ p }) => p.remaining > 0).length;

  const selected = selectedId ? providers.find((p) => p.id === selectedId) : undefined;
  const active = orders.find((o) => o.id === activeId) ?? orders[0];
  const express = resolveExpress(Boolean(selected?.express), slot);
  const quote = quoteForProvider(selected, {
    pieces,
    pkg,
    express,
    slot,
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
      setSlot(defaultPilotSlot());
      setDrop(selected.drops.includes("kapi") ? "kapi" : "nokta");
      if (!selected.drops.includes("nokta")) setDropId(null);
      else if (!dropId) setDropId(dropPoints[0]?.id ?? null);
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
      const blocked = placeBlockReason(selected);
      if (blocked) {
        setErr(blocked);
        setPlacing(false);
        return;
      }
      const order = await postOrder(
        placeOrderInput(selected, {
          drop,
          dropPointId: dropId,
          slot,
          note,
          pkg,
          pieces,
          express,
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
        dropId={drop === "nokta" ? dropId : null}
        user={user}
        meAvatar={meAvatar}
        providers={providers}
        dropPoints={dropPoints}
        visible={mapActive}
        onSelect={openProvider}
        onSelectDrop={(id) => {
          setDropId(id);
          setDrop("nokta");
        }}
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
          <span className="k-glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs ring-1 ring-[var(--line)]">
            <span className="inline-grid h-3.5 w-3.5 place-items-center rounded-[3px] bg-[var(--clay)] text-[var(--paper)]" aria-hidden>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z" stroke="currentColor" strokeWidth="2.2" />
                <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </span>
            Gel al noktası
          </span>
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
                onNext={() => {
                  setPieces(clampPieces(pieces, selected.remaining));
                  setSheet("checkout");
                }}
              />
            )}
            {sheet === "checkout" && selected && (
              <Checkout
                p={selected}
                pieces={pieces}
                onPieces={(n) => setPieces(clampPieces(n, selected.remaining))}
                express={express}
                onExpress={(want) => {
                  const parsed = parsePilotSlot(slot);
                  const start = parsed?.startMin ?? 18 * 60;
                  setSlot(formatPilotSlot(want ? "bugun" : "yarin", start));
                }}
                drop={drop}
                onDrop={setDrop}
                dropId={dropId}
                dropPoints={dropPoints}
                onDropId={setDropId}
                slot={slot}
                onSlot={setSlot}
                note={note}
                onNote={setNote}
                quote={quote}
                loyaltyLabel={loyaltyLabel}
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
            const tone = seatTone(p.remaining, p.capacity);
            const load = seatLabel(tone);
            const fill =
              tone === "full"
                ? 100
                : p.capacity > 0
                  ? Math.max(8, Math.round((p.remaining / p.capacity) * 100))
                  : 0;
            const bar =
              tone === "full"
                ? "bg-[var(--load-full)]"
                : tone === "low"
                  ? "bg-[var(--load-low)]"
                  : "bg-[var(--teal)]";
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
                    <span className="mt-2 block h-1 w-28 overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className={`block h-full rounded-full transition-[width,background-color] duration-500 ${bar}`}
                        style={{ width: `${fill}%` }}
                      />
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
  const tone = seatTone(p.remaining, p.capacity);
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
              {p.remaining <= 0 ? "bugün dolu" : `bugün ${p.remaining} ${seatPhraseFor(p.categoryId)}`}
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
                  <span className="tabular-nums">{tl(pack.pricePerPiece)}/parça</span>
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

function SlotWheel({ slot, onSlot }: { slot: string; onSlot: (s: string) => void }) {
  const parsed = parsePilotSlot(slot);
  const day = parsed?.day ?? "bugun";
  const startMin = parsed?.startMin ?? 10 * 60;
  const endLabel = minutesToHmm(startMin + DEFAULT_DURATION_MINUTES);
  return (
    <>
      <div className="mt-2 flex gap-2">
        {(["bugun", "yarin"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSlot(formatPilotSlot(d, startMin))}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              day === d ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]" : "ring-[var(--line)]"
            }`}
          >
            {d === "bugun" ? "Bugün" : "Yarın"}
          </button>
        ))}
      </div>
      <TimeScrollPicker
        startMin={startMin}
        durationMinutes={DEFAULT_DURATION_MINUTES}
        onChange={(m) => onSlot(formatPilotSlot(day, m))}
      />
      <p className="mt-1 text-center text-xs text-[var(--muted)]">
        {minutesToHmm(startMin)}–{endLabel} · {DEFAULT_DURATION_MINUTES} dk
      </p>
    </>
  );
}

function Checkout({
  p,
  pieces,
  onPieces,
  express,
  onExpress,
  drop,
  onDrop,
  dropId,
  dropPoints,
  onDropId,
  slot,
  onSlot,
  note,
  onNote,
  quote,
  loyaltyLabel,
  walletBalance,
  payGate,
  err,
  placing,
  onBack,
  onPlace,
}: {
  p: Provider;
  pieces: number;
  onPieces: (n: number) => void;
  express: boolean;
  onExpress: (v: boolean) => void;
  drop: DropMethod;
  onDrop: (v: DropMethod) => void;
  dropId: string | null;
  dropPoints: DropPoint[];
  onDropId: (id: string) => void;
  slot: string;
  onSlot: (s: string) => void;
  note: string;
  onNote: (s: string) => void;
  quote: { total: number; before: number; loyaltyRate: number; commission: number; providerNet: number };
  loyaltyLabel: string;
  walletBalance: number | null;
  payGate: 0 | 1 | null;
  err: string;
  placing: boolean;
  onBack: () => void;
  onPlace: () => void;
}) {
  const { drops, canPlace } = checkoutMeta(p);
  const cap = Math.min(PIECES_MAX, p.remaining > 0 ? p.remaining : PIECES_MAX);
  const [draft, setDraft] = useState(String(pieces));

  useEffect(() => {
    setDraft(String(pieces));
  }, [pieces]);

  function typeCount(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setDraft(digits);
    if (!digits) return;
    onPieces(clampPieces(Number(digits), p.remaining));
  }

  function commitCount() {
    onPieces(clampPieces(Number(draft) || PIECES_MIN, p.remaining));
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 p-4 pt-2 pb-3">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        {checkoutBackLabel()}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Kaç parça?</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Gömlek, pantolon, tişört birer parça. Nevresim / yorgan iki sayılır. Sen yaz, 1–{cap}.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Bir parça azalt"
          disabled={pieces <= PIECES_MIN}
          onClick={() => onPieces(pieces - 1)}
          className="k-press grid h-11 w-11 place-items-center rounded-full text-lg ring-1 ring-[var(--line)] disabled:opacity-40"
        >
          −
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Parça sayısı"
          value={draft}
          onChange={(e) => typeCount(e.target.value)}
          onBlur={commitCount}
          className="h-11 w-20 rounded-2xl bg-[var(--paper)] text-center font-[family-name:var(--font-display)] text-2xl tabular-nums ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
        />
        <button
          type="button"
          aria-label="Bir parça ekle"
          disabled={pieces >= cap}
          onClick={() => onPieces(pieces + 1)}
          className="k-press grid h-11 w-11 place-items-center rounded-full text-lg ring-1 ring-[var(--line)] disabled:opacity-40"
        >
          +
        </button>
        <span className="text-sm text-[var(--muted)]">parça</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PIECES.filter((n) => n <= cap).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPieces(n)}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              pieces === n
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {p.remaining > 0 && p.remaining < PIECES_MAX && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Bugün en fazla {p.remaining} parça yer var.
        </p>
      )}
      {p.express && (
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={express}
            onChange={(e) => onExpress(e.target.checked)}
          />
          Aynı gün (+%25)
        </label>
      )}
      <h3 className="mt-5 text-sm font-medium">Teslimat</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {drops.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDrop(d)}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              drop === d ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {d === "kapi" ? "Kapı" : "Gel al noktası"}
          </button>
        ))}
      </div>
      {drop === "nokta" && (
        <div className="mt-2 grid gap-1.5">
          {dropPoints.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDropId(d.id)}
              className={`k-chip rounded-xl px-3 py-2 text-left text-sm ring-1 ${
                dropId === d.id ? "bg-[var(--sand)] ring-[var(--clay)]" : "ring-[var(--line)]"
              }`}
            >
              {d.name}
              <span className="block text-xs text-[var(--muted)]">{d.hint}</span>
            </button>
          ))}
        </div>
      )}
      <h3 className="mt-5 text-sm font-medium">Saat</h3>
      <SlotWheel slot={slot} onSlot={onSlot} />
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
            : quote.loyaltyRate > 0
            ? `${loyaltyLabel} · %${Math.round(quote.loyaltyRate * 100)} indirim, önce ${tl(quote.before)}. `
            : `Min. ${tl(100)}. `}
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
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Sipariş {order.id}</h2>
      <p className="text-sm text-[var(--muted)]">
        {provider?.name} · {order.pieces} parça · {tl(order.total)}
      </p>
      {order.status === "iptal" && (
        <p className="mt-3 text-sm text-[var(--clay)]">
          Sipariş iptal edildi. Bakiyedeki tutanak çözüldü, para çekilmedi.
        </p>
      )}
      {order.status === "hazir" && order.pickupCode && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--teal)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
            Teslim kodu
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.pickupCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Uygulamada ve SMS simülasyonunda. Teslim alırken komşuna söyle; kod girilince{" "}
            {tl(order.total)} tahsil edilir.
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
