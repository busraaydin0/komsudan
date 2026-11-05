"use client";

import { useEffect, useState } from "react";
import { LAUNDRY_PACKAGES } from "@/lib/laundry/packages";
import {
  fetchOrderMessages,
  patchOrder,
  postDeliveryOverride,
  postPickupConfirm,
  uploadOrderPhoto,
} from "@/lib/api";
import { LAUNDRY_SIZES, SIZE_LABELS, type LaundrySize } from "@/lib/laundryModel";
import { MessageBadge } from "@/components/OrderThread";
import { tl } from "@/lib/pricing";
import {
  canAddPhotos,
  providerAdvanceLabel,
  statusBadgeClass,
  statusLabel,
  type OrderStatusId,
} from "@/lib/status";
import type { Order, Provider } from "@/lib/types";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";

export function ProviderOrderCard({
  order,
  providers,
  onChanged,
  delay,
  onOpenMessages,
}: {
  order: Order;
  providers: Provider[];
  onChanged: () => void;
  delay: number;
  onOpenMessages?: (orderId: string) => void;
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [deliveryPhotoId, setDeliveryPhotoId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const p = providers.find((x) => x.id === order.providerId);
  const pack =
    p?.packages.find((x) => x.id === order.packageId) ??
    LAUNDRY_PACKAGES.find((x) => x.id === order.packageId);
  const st = order.status as OrderStatusId;
  const [pickupSize, setPickupSize] = useState<LaundrySize>(order.size);
  const [colorGroups, setColorGroups] = useState(1);
  const needsPickup = st === "accepted" && !order.pickupConfirmedAt;
  const needsPickupCode = Boolean(
    st === "accepted" &&
      order.pickupConfirmedAt &&
      order.pickupSummaryApprovedAt &&
      order.priceChange !== "pending",
  );
  const waitingSummary = Boolean(
    st === "accepted" &&
      order.pickupConfirmedAt &&
      !order.pickupSummaryApprovedAt &&
      order.priceChange !== "pending",
  );
  const advanceLabel = providerAdvanceLabel(st, order.packageId, {
    needsPickupCode,
    pickupConfirmed: Boolean(order.pickupConfirmedAt),
    priceChangePending: order.priceChange === "pending",
  });

  useEffect(() => {
    let alive = true;
    void fetchOrderMessages(order.id)
      .then((data) => {
        if (alive) setUnread(data.unreadCount ?? 0);
      })
      .catch(() => undefined);
    const t = setInterval(() => {
      void fetchOrderMessages(order.id)
        .then((data) => {
          if (alive) setUnread(data.unreadCount ?? 0);
        })
        .catch(() => undefined);
    }, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [order.id]);

  async function act(action: "accept" | "reject" | "advance" | "deliver") {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const pin =
        action === "deliver" || (action === "advance" && needsPickupCode) ? code : undefined;
      await patchOrder(order.id, action, pin);
      setCode("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className="k-rise rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)] transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(28,23,18,0.08)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(st)}`}
      >
        {statusLabel(st)}
      </p>
      <p className="mt-2 font-medium">
        {order.publicCode ? `${order.publicCode} · ` : ""}
        {p?.name} · {order.size} · {order.machineUnits} birim · {pack?.title}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
        {" · "}
        Kapı teslim · {order.slot}
      </p>
      {order.note && <p className="mt-1 text-sm">Not: {order.note}</p>}
      {order.photos.length > 0 && <PhotoStrip photos={order.photos} size="sm" />}
      <p className="mt-2 text-sm tabular-nums">
        {tl(order.total)} · eline {tl(order.total - order.commission)}
        {order.paymentStatus === "captured" ? " · tahsil edildi" : ""}
        {order.paymentStatus === "authorized" ? " · tutanakta" : ""}
      </p>
      {err && <p className="k-rise mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {st === "pending" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("accept")}
              className="k-press k-cta rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white"
            >
              {busy ? "…" : "Kabul"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("reject")}
              className="k-press rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]"
            >
              Red
            </button>
          </>
        )}
        {waitingSummary && (
          <p className="w-full text-xs text-[var(--muted)]">Müşteri kapı özetini onaylayınca alım kodu açılır.</p>
        )}
        {needsPickupCode && (
          <div className="w-full">
            <label className="text-xs text-[var(--muted)]">Müşterinin 4 haneli alım kodu</label>
            <input
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-1 w-24 rounded-full bg-[var(--paper)] px-3 py-1.5 text-center font-[family-name:var(--font-display)] text-lg tabular-nums tracking-[0.2em] ring-1 ring-[var(--line)]"
            />
          </div>
        )}
        {advanceLabel && st !== "pending" && st !== "ready" && st !== "admin_pending" && (
          <button
            type="button"
            disabled={busy || (needsPickupCode && code.length !== 4)}
            onClick={() => void act("advance")}
            className="k-press k-cta rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "…" : advanceLabel}
          </button>
        )}
        {needsPickup && (
          <div className="mt-3 w-full rounded-2xl bg-[var(--paper)] p-3 ring-1 ring-[var(--line)]">
            <p className="text-xs font-medium text-[var(--teal)]">Kapıda doğrula</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LAUNDRY_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPickupSize(s)}
                  className={`k-chip rounded-full px-2.5 py-1 text-xs ring-1 ${
                    pickupSize === s ? "bg-[var(--teal)] text-white" : "ring-[var(--line)]"
                  }`}
                >
                  {SIZE_LABELS[s].title}
                </button>
              ))}
            </div>
            <label className="mt-2 block text-xs text-[var(--muted)]">
              Renk grubu (kayıt)
              <select
                className="mt-1 w-full rounded-lg bg-[var(--card)] px-2 py-1 text-sm ring-1 ring-[var(--line)]"
                value={colorGroups}
                onChange={(e) => setColorGroups(Number(e.target.value))}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              className="k-press k-cta mt-2 w-full rounded-full bg-[var(--clay)] py-2 text-xs text-white"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setErr("");
                  try {
                    await postPickupConfirm(order.id, {
                      confirmedSize: pickupSize,
                      addons: order.addons,
                      colorGroups,
                    });
                    await onChanged();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Doğrulama kaydedilemedi.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Foto + boy kaydet
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenMessages?.(order.id)}
          className="k-press rounded-full px-3 py-1.5 text-xs ring-1 ring-[var(--line)]"
        >
          Mesajlar
          <MessageBadge count={unread} />
        </button>
        {canAddPhotos(order.status) && (
          <PhotoAdd
            label="İş fotoğrafı"
            busy={busy}
            onPick={(file) => {
              void (async () => {
                setBusy(true);
                setErr("");
                try {
                  await uploadOrderPhoto(order.id, file);
                  await onChanged();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Fotoğraf yüklenemedi.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        )}
      </div>
      {st === "ready" && !order.adminHold && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("deliver");
          }}
        >
          <p className="text-xs text-[var(--muted)]">
            Önce teslim fotoğrafı yükle. Müşterinin 4 haneli teslim kodunu gir; kapıya/komşuya bırakma yok.
          </p>
          <PhotoAdd
            label="Teslim fotoğrafı"
            busy={busy}
            onPick={(file) => {
              void (async () => {
                setBusy(true);
                setErr("");
                try {
                  const photo = await uploadOrderPhoto(order.id, file, "delivery");
                  setDeliveryPhotoId(photo.id);
                  await onChanged();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Fotoğraf yüklenemedi.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
          <div className="mt-2 flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-24 rounded-full bg-[var(--paper)] px-3 py-1.5 text-center font-[family-name:var(--font-display)] text-lg tabular-nums tracking-[0.2em] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              aria-label="Teslim kodu"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 4}
              className="k-press k-cta rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {busy ? "…" : "Doğrula · tahsil et"}
            </button>
          </div>
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <p className="text-xs text-[var(--muted)]">Müşteri kodu veremiyorsa (evde yok); kapıya bırakma yasak.</p>
            <textarea
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Kısa gerekçe"
              rows={2}
              className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 text-xs ring-1 ring-[var(--line)]"
            />
            <button
              type="button"
              disabled={busy || !deliveryPhotoId || overrideNote.trim().length < 3}
              className="k-press mt-2 w-full rounded-full py-2 text-xs ring-1 ring-[var(--clay)] disabled:opacity-50"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setErr("");
                  try {
                    await postDeliveryOverride(order.id, {
                      photoId: deliveryPhotoId!,
                      note: overrideNote.trim(),
                    });
                    setOverrideNote("");
                    await onChanged();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Talep açılamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Kodsuz teslim bildir (admin onayı)
            </button>
          </div>
        </form>
      )}
      {st === "admin_pending" && order.adminHold && (
        <p className="mt-3 text-xs text-[var(--clay)]">Kodsuz teslim inceleniyor; müşteri itiraz süresi açık.</p>
      )}
    </li>
  );
}
