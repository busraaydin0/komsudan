"use client";

import { useEffect, useMemo, useState } from "react";
import { isCatalogCategoryId } from "@/lib/categories/registry";
import { NEIGHBORHOODS, PACKAGES, PILOT } from "@/lib/data";
import { DRYING_OPTIONS } from "@/lib/drying";
import { fetchCategories, patchPreferences, postMyOffer, type ServiceCategory } from "@/lib/api";
import { readLocationIfGranted, requestLocation } from "@/lib/permissions";
import { tl } from "@/lib/pricing";
import type { Account, DryingType, PackageId, PreferredIntent } from "@/lib/types";

type Step = "role" | "category" | "location";

export function OnboardingFlow({
  account,
  onDone,
}: {
  account: Account;
  onDone: (intent: PreferredIntent | null) => void;
}) {
  const [step, setStep] = useState<Step>("role");
  const [seek, setSeek] = useState(account.preferredIntent !== "offer");
  const [offer, setOffer] = useState(
    account.preferredIntent === "offer" || account.preferredIntent === "both",
  );
  const [dryingType, setDryingType] = useState<DryingType | null>(null);
  const [offered, setOffered] = useState<PackageId[]>(["yikama", "katlama", "tam"]);
  const [prices, setPrices] = useState<Record<PackageId, number>>({
    yikama: 9,
    katlama: 13,
    tam: 18,
  });
  const [laundryAdded, setLaundryAdded] = useState(false);
  const [offerCat, setOfferCat] = useState<string | null>(
    account.preferredIntent === "offer" && account.preferredCategoryIds?.[0]
      ? account.preferredCategoryIds[0]
      : null,
  );
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(
    account.preferredCategoryIds?.length ? account.preferredCategoryIds : ["camasir"],
  );
  const [neighborhood, setNeighborhood] = useState(account.homeNeighborhood ?? "");
  const [home, setHome] = useState<{ lat: number; lng: number; neighborhood: string } | null>(
    account.homeLat != null && account.homeLng != null
      ? {
          lat: account.homeLat,
          lng: account.homeLng,
          neighborhood: account.homeNeighborhood ?? "",
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const intent: PreferredIntent | null = seek && offer ? "both" : seek ? "seek" : offer ? "offer" : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return categories;
    return categories.filter((c) => {
      const hay = `${c.name} ${c.id} ${c.blurb}`.toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [categories, query]);

  function toggleSeekCat(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setErr("");
  }

  function pickOfferCat(id: string) {
    setOfferCat(id);
    setLaundryAdded(false);
    setErr("");
  }

  function mapCategoryIds() {
    if (seek) return picked;
    return offerCat ? [offerCat] : [];
  }

  function addLaundry() {
    if (!dryingType) {
      setErr("Kurutma tipini seç.");
      return false;
    }
    if (offered.length === 0) {
      setErr("En az bir paket seç.");
      return false;
    }
    setLaundryAdded(true);
    setErr("");
    return true;
  }

  async function persistOffer() {
    if (!offer || !offerCat) return;
    const lat = home?.lat ?? PILOT.center.lat;
    const lng = home?.lng ?? PILOT.center.lng;
    const place = (home?.neighborhood || neighborhood || PILOT.label).trim().slice(0, 80);
    const neighborhoodName = place || PILOT.label;
    if (offerCat === "camasir") {
      if (!laundryAdded || !dryingType) return;
      await postMyOffer({
        categoryId: "camasir",
        dryingType,
        packages: offered.map((id) => ({ id, pricePerPiece: prices[id] })),
        lat,
        lng,
        neighborhood: neighborhoodName,
      });
      return;
    }
    await postMyOffer({
      categoryId: isCatalogCategoryId(offerCat) ? offerCat : "davet",
      lat,
      lng,
      neighborhood: neighborhoodName,
    });
  }

  async function persist(extra: { completed?: boolean; skipped?: boolean; categoryIds?: string[] }) {
    await persistOffer();
    await patchPreferences({
      intent,
      categoryIds: extra.categoryIds ?? mapCategoryIds(),
      homeLat: home?.lat ?? null,
      homeLng: home?.lng ?? null,
      homeNeighborhood: home?.neighborhood || neighborhood || null,
      completed: extra.completed,
      skipped: extra.skipped,
    });
  }

  async function skip() {
    setErr("");
    setBusy(true);
    try {
      await persist({
        skipped: true,
        completed: true,
        categoryIds: step === "role" ? [] : mapCategoryIds(),
      });
      onDone(intent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function nextFromRole() {
    if (!intent) {
      setErr("En az birini seç veya şimdi değil de.");
      return;
    }
    setErr("");
    setStep("category");
  }

  async function nextFromCategory() {
    if (seek && picked.length === 0) {
      setErr("Aradığın hizmet alanını seç veya şimdi değil de.");
      return;
    }
    if (offer && !offerCat) {
      setErr("Vereceğin hizmet alanını seç.");
      return;
    }
    if (offer && offerCat === "camasir" && !laundryAdded) {
      setErr("Parça fiyatı ve kurutmayı yazıp Hizmet ekle’ye bas.");
      return;
    }
    setErr("");
    setStep("location");
  }

  async function useGeo() {
    setErr("");
    setBusy(true);
    try {
      const state = await requestLocation();
      if (state !== "granted") {
        setErr("Konum kapalı. Mahalle seçebilirsin.");
        return;
      }
      const loc = await readLocationIfGranted();
      const spot = loc ?? PILOT.center;
      const name = neighborhood || "Çukurambar";
      setNeighborhood(name);
      setHome({ lat: spot.lat, lng: spot.lng, neighborhood: name });
    } finally {
      setBusy(false);
    }
  }

  function pickNeighborhood(name: string) {
    const row = NEIGHBORHOODS.find((n) => n.name === name);
    setNeighborhood(name);
    if (row) setHome({ lat: row.loc.lat, lng: row.loc.lng, neighborhood: name });
  }

  async function finishCustomer() {
    setErr("");
    setBusy(true);
    try {
      await persist({ completed: true });
      onDone(intent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  const labels = ["Rol", "Alan", "Konum"] as const;
  const order: Step[] = ["role", "category", "location"];

  return (
    <div className="flex h-dvh flex-col bg-[var(--paper)] px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <p className="flex shrink-0 items-center gap-1.5 font-[family-name:var(--font-display)] text-3xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Komşudan
        </p>
        <p className="mt-3 shrink-0 font-[family-name:var(--font-display)] text-xl leading-snug">
          Ne arıyorsun, ne sunuyorsun — harita ona göre açılsın.
        </p>
        <ol className="mt-6 flex shrink-0 gap-2 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
          {labels.map((label, i) => (
            <li key={label} className={order.indexOf(step) >= i ? "text-[var(--teal)]" : undefined}>
              {label}
            </li>
          ))}
        </ol>

        <div className="k-rise mt-6 flex min-h-0 flex-1 flex-col rounded-3xl bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[var(--line)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {step === "role" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">Nasıl başlayalım?</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">İkisini de işaretleyebilirsin. Varsayılan sekme buna göre açılır.</p>
              <div className="mt-4 grid gap-2">
                <RoleCard
                  on={seek}
                  title="Hizmet arıyorum"
                  hint="Çamaşır, davet, dikiş, tamir, teknoloji, araba, kurye, bahçe, kargo, çıktı, kışlık, halı, ödev, dil, mezar — komşudan al"
                  onClick={() => {
                    setSeek((v) => !v);
                    setErr("");
                  }}
                />
                <RoleCard
                  on={offer}
                  title="Hizmet vermek istiyorum"
                  hint="Çamaşır, davet, dikiş, tamir, teknoloji, araba, kurye, bahçe, kargo, çıktı, kışlık, halı, ödev, dil veya mezar — alanı sonra seçersin"
                  onClick={() => {
                    setOffer((v) => !v);
                    setLaundryAdded(false);
                    setErr("");
                  }}
                />
              </div>
            </>
          )}

          {step === "category" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">
                {offer && seek
                  ? "Alanlar"
                  : offer
                    ? "Hangi alanda hizmet vereceksin?"
                    : "Hangi hizmetler?"}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {offer && seek
                  ? "Aradığın alanlar birden fazla olabilir. Vereceğin hizmet tek alan."
                  : offer
                    ? "Bir komşu bir alan."
                    : "Birden fazla seçebilirsin. Liste uzayınca ara."}
              </p>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara: çamaşır, davet, dikiş, tamir, teknoloji, araba, kurye, bahçe, kargo, çıktı, kışlık, halı, ödev, dil, mezar…"
                className="mt-4 w-full rounded-2xl bg-[var(--paper)] px-3 py-3 text-base ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              {seek && (
                <>
                  {offer && <p className="mt-4 text-sm font-medium">Hizmet arıyorum</p>}
                  <CategoryPick
                    items={filtered}
                    selected={picked}
                    onPick={toggleSeekCat}
                  />
                </>
              )}
              {offer && (
                <>
                  {seek && <p className="mt-4 text-sm font-medium">Hizmet vereceğim</p>}
                  <CategoryPick
                    items={filtered}
                    selected={offerCat ? [offerCat] : []}
                    onPick={pickOfferCat}
                  />
                  {offerCat === "camasir" && (
                    <LaundryOfferQa
                      dryingType={dryingType}
                      offered={offered}
                      prices={prices}
                      added={laundryAdded}
                      onDrying={(id) => {
                        setDryingType(id);
                        setLaundryAdded(false);
                        setErr("");
                      }}
                      onTogglePack={(id) => {
                        setOffered((prev) => {
                          if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((x) => x !== id);
                          return PACKAGES.map((p) => p.id).filter((x) => x === id || prev.includes(x));
                        });
                        setLaundryAdded(false);
                        setErr("");
                      }}
                      onPrice={(id, n) => {
                        setPrices((prev) => ({ ...prev, [id]: n }));
                        setLaundryAdded(false);
                        setErr("");
                      }}
                      onAdd={() => void addLaundry()}
                    />
                  )}
                  {offerCat === "davet" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Menünü Hizmet sekmesinden ekleyeceksin: ürün, fiyat birimi, alerjen.
                    </p>
                  )}
                  {offerCat === "dikis" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: fotoğraf, kategori, birim, teslim, malzeme.
                    </p>
                  )}
                  {offerCat === "tamir" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, fiyat tipi, parça, teslim, inceleme.
                    </p>
                  )}
                  {offerCat === "teknoloji" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: kategori, tür, fiyat tipi, teslim, yerinde.
                    </p>
                  )}
                  {offerCat === "araba" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, araç, dahil, randevu, konum.
                    </p>
                  )}
                  {offerCat === "kurye" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: ulaşım, paket, mesafe, teslim, müsaitlik.
                    </p>
                  )}
                  {offerCat === "bahce" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, alan, fiyat tipi, ekipman, mesafe.
                    </p>
                  )}
                  {offerCat === "kargo" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: şube, boyut, alma/bırakma, doğrulama.
                    </p>
                  )}
                  {offerCat === "cikti" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: renk, kâğıt, dosya, teslim alma.
                    </p>
                  )}
                  {offerCat === "kislik" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, malzeme, saklama, teslim alma.
                    </p>
                  )}
                  {offerCat === "hali" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, boyut, temizlik, teslim alma.
                    </p>
                  )}
                  {offerCat === "odev" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, seviye, ders, yer.
                    </p>
                  )}
                  {offerCat === "dil" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: dil, tür, seviye, yer.
                    </p>
                  )}
                  {offerCat === "mezar" && (
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Hizmetlerini Hizmet sekmesinden ekleyeceksin: tür, mezarlık, fiyat, fotoğraf.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {step === "location" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">Konum</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Yakındaki komşular için. İzin yoksa mahalle seç — Çukurambar pilotu.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void useGeo()}
                className="k-press mt-4 w-full rounded-full bg-[var(--teal)] py-3 text-sm font-medium text-white"
              >
                Konumumu kullan
              </button>
              <p className="mt-4 text-xs text-[var(--muted)]">veya mahalle</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {NEIGHBORHOODS.map((n) => (
                  <button
                    key={n.name}
                    type="button"
                    onClick={() => pickNeighborhood(n.name)}
                    className={`rounded-full px-3 py-1.5 text-xs ring-1 ${
                      neighborhood === n.name
                        ? "bg-[var(--teal)] text-white ring-[var(--teal)]"
                        : "bg-[var(--paper)] ring-[var(--line)]"
                    }`}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </>
          )}
          </div>

          <div className="shrink-0 border-t border-[var(--line)] pt-3">
            {err && <p className="mb-3 text-sm text-[var(--load-full)]">{err}</p>}
            {step === "role" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void nextFromRole()}
                className="k-press k-cta w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                Devam
              </button>
            )}
            {step === "category" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void nextFromCategory()}
                className="k-press k-cta w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                Devam
              </button>
            )}
            {step === "location" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void finishCustomer()}
                className="k-press k-cta w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                {busy ? "Kaydediliyor…" : "Haritaya geç"}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => void skip()} className="mt-3 w-full text-xs text-[var(--muted)]">
              Şimdi değil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryPick({
  items,
  selected,
  onPick,
}: {
  items: ServiceCategory[];
  selected: string[];
  onPick: (id: string) => void;
}) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((c) => {
        const on = selected.includes(c.id);
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                on ? "bg-[var(--sand)] ring-[var(--clay)]" : "bg-[var(--paper)] ring-[var(--line)]"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--card)] text-lg" aria-hidden>
                {c.icon === "headstone"
                  ? "🪦"
                  : c.icon === "globe"
                  ? "🌍"
                  : c.icon === "book"
                  ? "📚"
                  : c.icon === "soap"
                  ? "🧼"
                  : c.icon === "jar"
                  ? "🥫"
                  : c.icon === "printer"
                  ? "🖨️"
                  : c.icon === "package"
                  ? "📦"
                  : c.icon === "seedling"
                  ? "🌱"
                  : c.icon === "scooter"
                  ? "🛵"
                  : c.icon === "car"
                  ? "🚗"
                  : c.icon === "chip"
                    ? "💻"
                    : c.icon === "wrench"
                      ? "🔧"
                      : c.icon === "needle"
                        ? "🧵"
                        : c.icon === "feast"
                          ? "🥧"
                          : c.icon === "laundry"
                            ? "🧺"
                            : "•"}
              </span>
              <span>
                <span className="block text-sm font-medium">{c.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {c.blurb ||
                    (c.fulfillmentMode === "delivery" ? "Kapı / nokta teslim" : "Eve gelen hizmet")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {items.length === 0 && <li className="text-sm text-[var(--muted)]">Bu aramaya uyan alan yok.</li>}
    </ul>
  );
}

function LaundryOfferQa({
  dryingType,
  offered,
  prices,
  added,
  onDrying,
  onTogglePack,
  onPrice,
  onAdd,
}: {
  dryingType: DryingType | null;
  offered: PackageId[];
  prices: Record<PackageId, number>;
  added: boolean;
  onDrying: (id: DryingType) => void;
  onTogglePack: (id: PackageId) => void;
  onPrice: (id: PackageId, n: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl bg-[var(--paper)] p-3 ring-1 ring-[var(--line)]">
      <p className="text-sm font-medium">Hizmet ekle</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Çamaşır yıkama — müşteri haritada parça fiyatını ve kurutmayı görür.</p>

      <p className="mt-4 text-sm font-medium">Kurutma tipi nedir?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DRYING_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onDrying(opt.id)}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              dryingType === opt.id ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {dryingType && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          {DRYING_OPTIONS.find((o) => o.id === dryingType)?.hint}
        </p>
      )}

      <p className="mt-4 text-sm font-medium">Parça başı fiyatın ne?</p>
      <div className="mt-2 grid gap-2">
        {PACKAGES.map((pack) => {
          const on = offered.includes(pack.id);
          return (
            <div
              key={pack.id}
              className={`rounded-2xl px-3 py-3 ring-1 ${
                on ? "bg-[var(--sand)] ring-[var(--clay)]" : "bg-[var(--card)] ring-[var(--line)]"
              }`}
            >
              <button type="button" onClick={() => onTogglePack(pack.id)} className="flex w-full justify-between text-left font-medium">
                {pack.title}
                <span className="tabular-nums text-sm font-normal text-[var(--muted)]">
                  {on ? `${tl(prices[pack.id])}/parça` : "kapalı"}
                </span>
              </button>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
              {on && (
                <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                  ₺/parça
                  <input
                    inputMode="numeric"
                    value={prices[pack.id]}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, "").slice(0, 2));
                      onPrice(pack.id, n || 1);
                    }}
                    className="w-14 rounded-full bg-[var(--paper)] px-2 py-1 text-center tabular-nums ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {added ? (
        <p className="mt-3 text-sm text-[var(--teal)]">Çamaşır yıkama eklendi. Devam’a bas.</p>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="k-press mt-3 w-full rounded-full bg-[var(--teal)] py-2.5 text-sm font-medium text-white"
        >
          Hizmet ekle
        </button>
      )}
    </div>
  );
}

function RoleCard({
  on,
  title,
  hint,
  onClick,
}: {
  on: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left ring-1 ${
        on ? "bg-[var(--sand)] ring-[var(--clay)]" : "bg-[var(--paper)] ring-[var(--line)]"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
    </button>
  );
}
