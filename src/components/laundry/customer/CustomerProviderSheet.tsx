"use client";

import { providerLoadDisplay } from "@/lib/capacity/display";
import { formatKm } from "@/lib/geo";
import {
  catalogOfferCount,
  continueCta,
  emptyCatalogCopy,
} from "@/lib/laundry/customerUi";
import { tl } from "@/lib/pricing";
import { PhotoStrip, RatingBreakdownView, ReviewList } from "@/components/Photos";
import { Avatar } from "@/components/Avatar";
import type { PackageId, Provider } from "@/lib/types";

export function CustomerProviderSheet({
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
