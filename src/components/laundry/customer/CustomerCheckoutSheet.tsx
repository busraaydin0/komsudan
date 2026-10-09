"use client";

import {
  ADDON_KINDS,
  ADDON_VARIANTS,
  LAUNDRY_SIZES,
  SIZE_LABELS,
  type LaundrySize,
  type OrderAddonLine,
} from "@/lib/laundryModel";
import { addonQty, setAddonQty } from "@/lib/laundry/addonLines";
import {
  checkoutBackLabel,
  checkoutMeta,
  notePlaceholder,
  placeBlockReason,
} from "@/lib/laundry/customerUi";
import { tl } from "@/lib/pricing";
import { INSUFFICIENT_BALANCE_MESSAGE } from "@/lib/walletMethods";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import type { AppointmentWindow, Provider } from "@/lib/types";

export function CustomerCheckoutSheet({
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
  const { canPlace } = checkoutMeta();

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 p-4 pt-2 pb-3">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        {checkoutBackLabel()}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Boy</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Küçük / orta / büyük veya 3–5 makine. Renk ayrımı standart; ek ücret yok.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
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
