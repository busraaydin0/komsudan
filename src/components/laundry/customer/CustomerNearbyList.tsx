"use client";

import { memo, useMemo, useState } from "react";
import { providerLoadDisplay } from "@/lib/capacity/display";
import { dryingListLabel } from "@/lib/drying";
import { formatKm } from "@/lib/geo";
import {
  listEmptyPriceLabel,
  listPrice,
  listPricedTag,
} from "@/lib/laundry/customerUi";
import { NEARBY_SORTS, sortNearby, type NearbySort } from "@/lib/laundry/nearbySort";
import { trustLabel } from "@/lib/laundry/pilot";
import { Avatar } from "@/components/Avatar";
import type { Provider } from "@/lib/types";

export const CustomerNearbyList = memo(function CustomerNearbyList({
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
});
