"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PILOT, trustLabel } from "@/lib/data";
import { formatKm, kmBetween } from "@/lib/geo";
import { estimateFor, tl } from "@/lib/pricing";
import { postOrder, postReview, useCatalog, useOrders } from "@/lib/api";
import { trackSteps } from "@/lib/status";
import { PhotoStrip, ReviewComposer, ReviewList } from "@/components/Photos";
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

type Sheet = "list" | "provider" | "checkout" | "track";

type Props = {
  pane?: "map" | "orders";
  mapActive?: boolean;
  loyaltyRate?: number;
  loyaltyLabel?: string;
  onOpenOrders?: () => void;
  onPlacedOrder?: () => void;
  onBackToMap?: () => void;
};

export function CustomerApp({
  pane = "map",
  mapActive = true,
  loyaltyRate = 0,
  loyaltyLabel = "Komşu",
  onOpenOrders,
  onPlacedOrder,
  onBackToMap,
}: Props) {
  const { providers, dropPoints, ready, reload: reloadCatalog } = useCatalog();
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
  const [express, setExpress] = useState(false);
  const [drop, setDrop] = useState<DropMethod>("nokta");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [dryerOnly, setDryerOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [placing, setPlacing] = useState(false);

  const origin = user ?? PILOT.center;
  const ranked = useMemo(() => {
    return providers
      .filter((p) => (dryerOnly ? p.hasDryer : true))
      .map((p) => ({ p, km: kmBetween(origin, p.loc) }))
      .sort((a, b) => a.km - b.km);
  }, [origin, dryerOnly, providers]);
  const available = ranked.filter(({ p }) => p.remaining > 0).length;

  const selected = selectedId ? providers.find((p) => p.id === selectedId) : undefined;
  const active = orders.find((o) => o.id === activeId) ?? orders[0];
  const quote = selected
    ? estimateFor(selected, pieces, pkg, express && selected.express, loyaltyRate)
    : { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 };

  useEffect(() => {
    if (!navigator.geolocation) {
      setUser(PILOT.center);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        const dist = kmBetween(loc, PILOT.center);
        setFar(dist > PILOT.radiusKm);
        setUser(dist > PILOT.radiusKm ? PILOT.center : loc);
      },
      () => setUser(PILOT.center),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

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
      setPkg(selected.packages.some((x) => x.id === pkg) ? pkg : selected.packages[0].id);
      setSlot(selected.slots[0] ?? "");
      setDrop(selected.drops.includes("kapi") ? "kapi" : "nokta");
      setExpress(false);
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

  async function place() {
    if (!selected || placing) return;
    setErr("");
    setPlacing(true);
    try {
      const order = await postOrder({
        providerId: selected.id,
        packageId: pkg,
        pieces,
        express: express && selected.express,
        drop,
        dropPointId: drop === "nokta" ? dropId : null,
        slot,
        note,
      });
      await Promise.all([reloadOrders(), reloadCatalog()]);
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
        <div className="k-rise pointer-events-auto flex items-center gap-2" style={{ animationDelay: "60ms" }}>
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
                Eve kimse girmez. Çamaşırı kapıda veya nötr noktada bırak.
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
        className={`absolute inset-x-0 z-10 mx-auto max-w-lg px-3 transition-[max-height,top] duration-500 ease-[var(--ease-out)] ${
          pane === "orders"
            ? "top-[calc(env(safe-area-inset-top)+4.25rem)] bottom-[var(--tabbar)]"
            : `bottom-[var(--tabbar)] ${sheet === "list" ? "max-h-[38vh]" : "max-h-[calc(100dvh-var(--tabbar)-5.5rem)]"}`
        }`}
      >
        <div className="h-full overflow-y-auto rounded-t-3xl bg-[var(--card)] shadow-[var(--shadow-sheet)] ring-1 ring-[var(--line)]">
          <div className="sticky top-0 z-10 flex justify-center bg-[var(--card)] pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-[var(--line)]" />
          </div>
          <div key={sheet} className="k-sheet">
            {sheet === "list" && pane === "map" && (
              <List
                ranked={ranked}
                ready={ready}
                onPick={openProvider}
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
                pieces={pieces}
                onPieces={setPieces}
                express={express}
                onExpress={setExpress}
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
}: {
  ranked: { p: Provider; km: number }[];
  ready: boolean;
  onPick: (id: string) => void;
  onTrack?: () => void;
}) {
  return (
    <div className="p-4 pt-2">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Yakındakiler</h2>
        {onTrack && (
          <button type="button" onClick={onTrack} className="k-press text-xs text-[var(--teal)]">
            Siparişimi gör
          </button>
        )}
      </div>
      {!ready ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="k-skel h-[4.25rem] rounded-2xl" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {ranked.map(({ p, km }, i) => {
            const fill = p.capacity > 0 ? Math.max(6, Math.round((p.remaining / p.capacity) * 100)) : 0;
            return (
              <li key={p.id} className="k-rise" style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="k-card flex w-full items-start justify-between rounded-2xl bg-[var(--paper)] px-3 py-3 text-left ring-1 ring-[var(--line)]"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {p.neighborhood} · {formatKm(km)} · {trustLabel(p.trust)}
                      {p.hasDryer ? " · kurutucu" : ""}
                    </span>
                    <span className="mt-2 block h-1 w-28 overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className="block h-full rounded-full bg-[var(--teal)] transition-[width] duration-500"
                        style={{ width: `${fill}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block tabular-nums">{p.rating.toFixed(1)}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {tl(
                        p.packages.find((x) => x.id === "tam")?.pricePerPiece ??
                          p.packages.at(-1)!.pricePerPiece,
                      )}
                      /parça
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
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← Liste
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">{p.name}</h2>
      <p className="text-sm text-[var(--muted)]">
        {p.neighborhood} · {formatKm(km)} · {p.rating} ({p.reviews} yorum) · bugün {p.remaining} parça yer
      </p>
      <p className="mt-3 text-sm leading-relaxed">{p.bio}</p>
      {p.workPhotos.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">İşler</h3>
          <PhotoStrip photos={p.workPhotos} />
        </>
      )}
      {p.recentReviews.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">Yorumlar</h3>
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
      </div>
      <button
        type="button"
        onClick={onNext}
        className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)]"
      >
        Devam · parça ve teslimat
      </button>
    </div>
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
  err: string;
  placing: boolean;
  onBack: () => void;
  onPlace: () => void;
}) {
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← Paket
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Kaç parça?</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Gömlek, pantolon, tişört birer parça. Nevresim / yorgan iki sayılır.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PIECES.map((n) => (
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
            {n} parça
          </button>
        ))}
      </div>
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
      <div className="mt-2 flex gap-2">
        {p.drops.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDrop(d)}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              drop === d ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {d === "kapi" ? "Kapı" : "Nötr nokta"}
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
      <div className="mt-2 flex flex-wrap gap-2">
        {p.slots.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSlot(s)}
            className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 ${
              slot === s
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Nevresim, leke, hassas kumaş, kapı kodu…"
        className="mt-4 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none transition-[box-shadow] duration-200 focus:ring-[var(--teal)]"
        rows={2}
      />
      <p className="mt-4 font-[family-name:var(--font-display)] text-2xl tabular-nums">{tl(quote.total)}</p>
      <p className="text-xs text-[var(--muted)]">
        {quote.loyaltyRate > 0
          ? `${loyaltyLabel} · %${Math.round(quote.loyaltyRate * 100)} indirim, önce ${tl(quote.before)}. `
          : `Min. ${tl(100)}. `}
        Siparişte karttan ön otorizasyon; teslim kodu doğrulanınca tahsilat.
      </p>
      {err && <p className="k-rise mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <button
        type="button"
        disabled={placing}
        onClick={onPlace}
        className="k-press k-cta mt-3 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)]"
      >
        {placing ? "Gönderiliyor…" : "Siparişi bırak"}
      </button>
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
}: {
  order: Order;
  provider: Provider | undefined;
  backLabel: string;
  onBack: () => void;
  onReload: () => void;
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
          Sipariş iptal edildi. Ön otorizasyon çözüldü, para çekilmedi.
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
          Kartta {tl(order.total)} tutanak (ön otorizasyon). Teslim kodundan sonra geçer.
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
            : "Durumu Hizmet sekmesinden ilerlet. Canlı sunucudan güncellenir."}
      </p>
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
