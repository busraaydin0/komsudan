"use client";

import { useState } from "react";
import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";
import { LAUNDRY_PRODUCT_NAME, PILOT_AREA, PILOT_NEIGHBORHOODS } from "@/lib/laundry/pilot";
import { patchPreferences, postMyOffer } from "@/lib/api";
import { readLocationIfGranted, requestLocation } from "@/lib/permissions";
import type { Account, DryingType, PackageId, PreferredIntent } from "@/lib/types";
import { LaundryOfferSetup } from "@/components/laundry/onboarding/LaundryOfferSetup";
import { OnboardingRoleCard } from "@/components/laundry/onboarding/OnboardingRoleCard";

type Step = "role" | "offer" | "location";

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

  const intent: PreferredIntent | null = seek && offer ? "both" : seek ? "seek" : offer ? "offer" : null;
  const steps: Step[] = offer ? ["role", "offer", "location"] : ["role", "location"];
  const labels = offer ? ["Rol", "Hizmet", "Konum"] : ["Rol", "Konum"];

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
    if (!offer) return;
    if (!laundryAdded || !dryingType) return;
    const lat = home?.lat ?? PILOT_AREA.center.lat;
    const lng = home?.lng ?? PILOT_AREA.center.lng;
    const place = (home?.neighborhood || neighborhood || PILOT_AREA.label).trim().slice(0, 80);
    await postMyOffer({
      categoryId: "camasir",
      dryingType,
      packages: offered.map((id) => ({ id, pricePerPiece: prices[id] })),
      lat,
      lng,
      neighborhood: place || PILOT_AREA.label,
    });
  }

  async function persist(extra: { completed?: boolean; skipped?: boolean }) {
    await persistOffer();
    await patchPreferences({
      intent,
      categoryIds: ["camasir"],
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
      await persist({ skipped: true, completed: true });
      onDone(intent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  function nextFromRole() {
    if (!intent) {
      setErr("En az birini seç veya şimdi değil de.");
      return;
    }
    setErr("");
    setStep(offer ? "offer" : "location");
  }

  function nextFromOffer() {
    if (!laundryAdded) {
      setErr("Parça fiyatı ve kurutmayı yazıp Hizmet ekle’ye bas.");
      return;
    }
    setErr("");
    setStep("location");
  }

  async function captureLocation() {
    setErr("");
    setBusy(true);
    try {
      const state = await requestLocation();
      if (state !== "granted") {
        setErr("Konum kapalı. Mahalle seçebilirsin.");
        return;
      }
      const loc = await readLocationIfGranted();
      const spot = loc ?? PILOT_AREA.center;
      const name = neighborhood || "Çukurambar";
      setNeighborhood(name);
      setHome({ lat: spot.lat, lng: spot.lng, neighborhood: name });
    } finally {
      setBusy(false);
    }
  }

  function pickNeighborhood(name: string) {
    const row = PILOT_NEIGHBORHOODS.find((n) => n.name === name);
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

  return (
    <div className="flex h-dvh flex-col bg-[var(--paper)] px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <p className="flex shrink-0 items-center gap-1.5 font-[family-name:var(--font-display)] text-3xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Komşudan
        </p>
        <p className="mt-3 shrink-0 font-[family-name:var(--font-display)] text-xl leading-snug">
          {LAUNDRY_PRODUCT_NAME} — harita ona göre açılsın.
        </p>
        <ol className="mt-6 flex shrink-0 gap-2 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
          {labels.map((label, i) => (
            <li key={label} className={steps.indexOf(step) >= i ? "text-[var(--teal)]" : undefined}>
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
                <OnboardingRoleCard
                  on={seek}
                  title="Hizmet arıyorum"
                  hint={`${LAUNDRY_PRODUCT_NAME} — komşudan al`}
                  onClick={() => {
                    setSeek((v) => !v);
                    setErr("");
                  }}
                />
                <OnboardingRoleCard
                  on={offer}
                  title="Hizmet vermek istiyorum"
                  hint={`${LAUNDRY_PRODUCT_NAME} — boy fiyatlarını ve kurutmayı sonra yazarsın`}
                  onClick={() => {
                    setOffer((v) => !v);
                    setLaundryAdded(false);
                    setErr("");
                  }}
                />
              </div>
            </>
          )}

          {step === "offer" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">{LAUNDRY_PRODUCT_NAME}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Parça fiyatı ve kurutmayı yaz. Müşteri haritada bunları görür.
              </p>
              <LaundryOfferSetup
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
                    return LAUNDRY_PACKAGES.map((p) => p.id).filter((x) => x === id || prev.includes(x));
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
                onClick={() => void captureLocation()}
                className="k-press mt-4 w-full rounded-full bg-[var(--teal)] py-3 text-sm font-medium text-white"
              >
                Konumumu kullan
              </button>
              <p className="mt-4 text-xs text-[var(--muted)]">veya mahalle</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PILOT_NEIGHBORHOODS.map((n) => (
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
                onClick={nextFromRole}
                className="k-press k-cta w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                Devam
              </button>
            )}
            {step === "offer" && (
              <button
                type="button"
                disabled={busy}
                onClick={nextFromOffer}
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

