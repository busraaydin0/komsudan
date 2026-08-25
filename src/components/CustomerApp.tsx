"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DROP_POINTS, PILOT, PROVIDERS, providerById, trustLabel } from "@/lib/data";
import { formatKm, kmBetween } from "@/lib/geo";
import { estimate, tl } from "@/lib/pricing";
import { addOrder, newOrderId, useOrders } from "@/lib/store";
import type {
  DropMethod,
  LngLat,
  MapMode,
  Order,
  PackageId,
  Provider,
} from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[var(--paper)]" />,
});

const PIECES = [8, 12, 16, 24, 32];

type Sheet = "list" | "provider" | "checkout" | "track";

export function CustomerApp() {
  const orders = useOrders();
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

  const origin = user ?? PILOT.center;
  const ranked = useMemo(() => {
    return PROVIDERS.filter((p) => (dryerOnly ? p.hasDryer : true))
      .map((p) => ({ p, km: kmBetween(origin, p.loc) }))
      .sort((a, b) => a.km - b.km);
  }, [origin, dryerOnly]);
  const available = ranked.filter(({ p }) => p.remaining > 0).length;

  const selected = selectedId ? providerById(selectedId) : undefined;
  const active = orders.find((o) => o.id === activeId) ?? orders[0];
  const quote = estimate(pieces, pkg, express && Boolean(selected?.express));

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
    if (selected) {
      setPkg(selected.packages.some((x) => x.id === pkg) ? pkg : selected.packages[0].id);
      setSlot(selected.slots[0] ?? "");
      setDrop(selected.drops.includes("kapi") ? "kapi" : "nokta");
      setExpress(false);
      if (!selected.drops.includes("nokta")) setDropId(null);
      else if (!dropId) setDropId(DROP_POINTS[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function openProvider(id: string) {
    setSelectedId(id);
    setSheet("provider");
    setHello(false);
  }

  function place() {
    if (!selected) return;
    const order: Order = {
      id: newOrderId(),
      providerId: selected.id,
      packageId: pkg,
      pieces,
      express: express && selected.express,
      drop,
      dropPointId: drop === "nokta" ? dropId : null,
      slot,
      note,
      total: quote.total,
      commission: quote.commission,
      status: "onay_bekliyor",
      createdAt: new Date().toISOString(),
    };
    addOrder(order);
    setActiveId(order.id);
    setSheet("track");
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      <MapCanvas
        mode={mode}
        selectedId={selectedId}
        dropId={drop === "nokta" ? dropId : null}
        user={user}
        onSelect={openProvider}
        onSelectDrop={(id) => {
          setDropId(id);
          setDrop("nokta");
        }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 sm:p-4">
        <div className="pointer-events-auto rounded-2xl bg-[var(--card)]/92 px-3 py-2 shadow-[0_8px_30px_rgba(28,23,18,0.08)] ring-1 ring-[var(--line)] backdrop-blur">
          <p className="font-[family-name:var(--font-display)] text-lg leading-none">Komşudan</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{PILOT.label}</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex rounded-full bg-[var(--card)]/92 p-1 ring-1 ring-[var(--line)] backdrop-blur">
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase ${
                  mode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--muted)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Link
            href="/hizmet"
            className="rounded-full bg-[var(--card)]/92 px-3 py-2 text-xs ring-1 ring-[var(--line)] backdrop-blur"
          >
            Hizmet ver
          </Link>
        </div>
      </header>

      <div className="pointer-events-none absolute top-20 left-3 z-10 sm:top-22">
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDryerOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs ring-1 backdrop-blur ${
              dryerOnly
                ? "bg-[var(--teal)] text-white ring-[var(--teal)]"
                : "bg-[var(--card)]/92 ring-[var(--line)]"
            }`}
          >
            Kurutucu var
          </button>
        </div>
        {far && (
          <p className="pointer-events-auto mt-2 max-w-[16rem] rounded-xl bg-[var(--card)]/92 px-3 py-2 text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
            Pilot bölge Çukurambar. Harita oraya alındı — sen uzaktasın.
          </p>
        )}
      </div>

      {hello && sheet === "list" && (
        <div className="absolute inset-x-0 top-[28%] z-10 mx-auto max-w-md px-4">
          <div className="rounded-3xl bg-[var(--card)]/95 p-5 shadow-[0_20px_50px_rgba(28,23,18,0.12)] ring-1 ring-[var(--line)] backdrop-blur">
            <p className="text-xs tracking-wide text-[var(--teal)] uppercase">Bırak · işlensin · al</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight">
              Çevrende{" "}
              <span className="text-[var(--teal)]">{available}</span> kişi şu
              anda müsait.
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Eve kimse girmez. Çamaşırı kapıda veya nötr noktada bırak.
            </p>
            <button
              type="button"
              onClick={() => setHello(false)}
              className="mt-4 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Haritayı aç
            </button>
          </div>
        </div>
      )}

      <section
        className={`absolute inset-x-0 bottom-0 z-10 mx-auto max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
          sheet === "list" ? "max-h-[42vh]" : "max-h-[78vh]"
        }`}
      >
        <div className="overflow-y-auto rounded-t-3xl bg-[var(--card)] shadow-[0_-12px_40px_rgba(28,23,18,0.12)] ring-1 ring-[var(--line)]">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--line)]" />
          {sheet === "list" && (
            <List
              ranked={ranked}
              onPick={openProvider}
              onTrack={
                orders[0]
                  ? () => {
                      setActiveId(orders[0].id);
                      setSheet("track");
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
              onDropId={setDropId}
              slot={slot}
              onSlot={setSlot}
              note={note}
              onNote={setNote}
              quote={quote}
              onBack={() => setSheet("provider")}
              onPlace={place}
            />
          )}
          {sheet === "track" && active && (
            <Track
              order={active}
              onBack={() => setSheet("list")}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function List({
  ranked,
  onPick,
  onTrack,
}: {
  ranked: { p: Provider; km: number }[];
  onPick: (id: string) => void;
  onTrack?: () => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Yakındakiler</h2>
        {onTrack && (
          <button type="button" onClick={onTrack} className="text-xs text-[var(--teal)]">
            Siparişimi gör
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {ranked.map(({ p, km }) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              className="flex w-full items-start justify-between rounded-2xl bg-[var(--paper)] px-3 py-3 text-left ring-1 ring-[var(--line)]"
            >
              <span>
                <span className="block font-medium">{p.name}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  {p.neighborhood} · {formatKm(km)} · {trustLabel(p.trust)}
                  {p.hasDryer ? " · kurutucu" : ""}
                </span>
              </span>
              <span className="text-right text-sm">
                <span className="block">{p.rating.toFixed(1)}</span>
                <span className="text-xs text-[var(--muted)]">{tl(p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)!.pricePerPiece)}/parça</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
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
    <div className="p-4">
      <button type="button" onClick={onBack} className="text-xs text-[var(--muted)]">
        ← Liste
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">{p.name}</h2>
      <p className="text-sm text-[var(--muted)]">
        {p.neighborhood} · {formatKm(km)} · {p.rating} ({p.reviews} yorum) · bugün {p.remaining} parça yer
      </p>
      <p className="mt-3 text-sm">{p.bio}</p>
      <div className="mt-4 grid gap-2">
        {p.packages.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => onPkg(pack.id)}
            className={`rounded-2xl px-3 py-3 text-left ring-1 ${
              pkg === pack.id
                ? "bg-[#efe4d4] ring-[var(--clay)]"
                : "bg-[var(--paper)] ring-[var(--line)]"
            }`}
          >
            <span className="flex justify-between font-medium">
              {pack.title}
              <span>{tl(pack.pricePerPiece)}/parça</span>
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
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
  onDropId,
  slot,
  onSlot,
  note,
  onNote,
  quote,
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
  onDropId: (id: string) => void;
  slot: string;
  onSlot: (s: string) => void;
  note: string;
  onNote: (s: string) => void;
  quote: { total: number; commission: number; providerNet: number };
  onBack: () => void;
  onPlace: () => void;
}) {
  return (
    <div className="p-4">
      <button type="button" onClick={onBack} className="text-xs text-[var(--muted)]">
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
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
              pieces === n ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]" : "ring-[var(--line)]"
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
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
              drop === d ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {d === "kapi" ? "Kapı" : "Nötr nokta"}
          </button>
        ))}
      </div>
      {drop === "nokta" && (
        <div className="mt-2 grid gap-1.5">
          {DROP_POINTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDropId(d.id)}
              className={`rounded-xl px-3 py-2 text-left text-sm ring-1 ${
                dropId === d.id ? "bg-[#efe4d4] ring-[var(--clay)]" : "ring-[var(--line)]"
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
            className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
              slot === s ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]" : "ring-[var(--line)]"
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
        className="mt-4 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none"
        rows={2}
      />
      <p className="mt-4 font-[family-name:var(--font-display)] text-2xl">{tl(quote.total)}</p>
      <p className="text-xs text-[var(--muted)]">
        Min. {tl(100)}. Karttan ön otorizasyon; iş bitince tahsilat. Ödeme henüz simülasyon.
      </p>
      <button
        type="button"
        onClick={onPlace}
        className="mt-3 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
      >
        Siparişi bırak
      </button>
    </div>
  );
}

const STEPS: Order["status"][] = [
  "onay_bekliyor",
  "teslim_alindi",
  "yikaniyor",
  "utuleniyor",
  "hazir",
  "teslim_edildi",
];

const STEP_LABEL: Record<Order["status"], string> = {
  onay_bekliyor: "Onay bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır, teslim al",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

function Track({ order, onBack }: { order: Order; onBack: () => void }) {
  const p = providerById(order.providerId);
  const idx = STEPS.indexOf(order.status);
  return (
    <div className="p-4">
      <button type="button" onClick={onBack} className="text-xs text-[var(--muted)]">
        ← Harita
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Sipariş {order.id}</h2>
      <p className="text-sm text-[var(--muted)]">
        {p?.name} · {order.pieces} parça · {tl(order.total)}
      </p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 text-sm ${
              i <= idx ? "text-[var(--ink)]" : "text-[var(--muted)]"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                i <= idx ? "bg-[var(--teal)]" : "bg-[var(--line)]"
              }`}
            />
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Durumu hizmet veren panelinden ilerlet. Bu tarayıcıda kayıtlı.
      </p>
    </div>
  );
}
