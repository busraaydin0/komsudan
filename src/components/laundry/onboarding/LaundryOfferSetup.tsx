"use client";

import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";
import { LAUNDRY_PRODUCT_NAME } from "@/lib/laundry/pilot";
import { DRYING_OPTIONS } from "@/lib/drying";
import { tl } from "@/lib/pricing";
import type { DryingType, PackageId } from "@/lib/types";

export function LaundryOfferSetup({
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
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        {LAUNDRY_PRODUCT_NAME} — müşteri haritada boy fiyatlarını ve kurutmayı görür.
      </p>

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
        {LAUNDRY_PACKAGES.map((pack) => {
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
                  {on ? `${tl(prices[pack.id])}/orta` : "kapalı"}
                </span>
              </button>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
              {on && (
                <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                  ₺/orta boy · 3–5 makine = orta × adet
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
        <p className="mt-3 text-sm text-[var(--teal)]">{LAUNDRY_PRODUCT_NAME} eklendi. Devam’a bas.</p>
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
