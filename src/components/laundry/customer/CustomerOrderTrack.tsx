"use client";

import { useState } from "react";
import { SIZE_LABELS } from "@/lib/laundryModel";
import { tl } from "@/lib/pricing";
import {
  patchOrder,
  postPickupSummaryApprove,
  postPriceChange,
  postReview,
} from "@/lib/api";
import {
  canCancel,
  customerStatusHint,
  statusMeta,
  trackHighlightStatus,
  trackSteps,
} from "@/lib/status";
import { PhotoStrip, ReviewComposer, ReviewList } from "@/components/Photos";
import type { Order, Provider } from "@/lib/types";

export function CustomerOrderTrack({
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
  const highlight = trackHighlightStatus(order.status);
  const idx = steps.indexOf(highlight);
  const terminal = order.status === "cancelled" || order.status === "rejected" || order.status === "disputed";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← {backLabel}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
        {order.publicCode ?? `Sipariş ${order.id}`}
      </h2>
      <p className="text-sm text-[var(--muted)]">
        {provider?.name} · {SIZE_LABELS[order.size]?.title ?? order.size} · {tl(order.total)}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Evde yokken kapıya veya komşuya bırakma yok; teslim yalnız yüz yüze ve kodla.
      </p>
      {order.priceChange === "pending" && !terminal && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--clay)]">
          <p className="text-sm font-medium">Kapıda farklı boy veya ek</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Güncel tutar {tl(order.total)}. Onaylamazsan sipariş iptal olur.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="k-press k-cta flex-1 rounded-full bg-[var(--teal)] py-2 text-sm text-white"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPriceChange(order.id, "approve");
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Onay alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Onayla
            </button>
            <button
              type="button"
              disabled={busy}
              className="k-press flex-1 rounded-full py-2 text-sm ring-1 ring-[var(--line)]"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPriceChange(order.id, "reject");
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Red alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Reddet
            </button>
          </div>
        </div>
      )}
      {(order.status === "cancelled" || order.status === "rejected") && (
        <p className="mt-3 text-sm text-[var(--clay)]">
          Sipariş iptal edildi. Bakiyedeki tutanak çözüldü, para çekilmedi.
          {order.cancelReason === "size_rejected" ? " (Boy/ek uyuşmadı.)" : ""}
        </p>
      )}
      {order.pickupConfirmedAt &&
        !order.pickupSummaryApprovedAt &&
        order.priceChange !== "pending" &&
        !terminal && (
          <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--teal)]">
            <p className="text-sm font-medium">Kapıdaki özet doğru mu?</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Boy, ekler ve foto onayından sonra alım kodu açılır; hizmet veren kodu girerek çamaşırı alır.
            </p>
            <button
              type="button"
              disabled={busy}
              className="k-press k-cta mt-3 w-full rounded-full bg-[var(--teal)] py-2 text-sm text-white"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await postPickupSummaryApprove(order.id);
                    await onReload();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Onay alınamadı.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Özeti onayla
            </button>
          </div>
        )}
      {order.pickupHandoffCode && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--line)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--muted)] uppercase">Alım kodu</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.pickupHandoffCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">Yalnız hizmet verene söyle; uygulamada kalır.</p>
        </div>
      )}
      {order.status === "ready" && order.returnHandoffCode && !order.adminHold && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--teal)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">Teslim kodu</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.returnHandoffCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Teslimde kodu söyle; komşuya veya kapıya bırakma yok. Kod girilince {tl(order.total)} tahsil edilir.
          </p>
        </div>
      )}
      {order.adminHold && order.disputeWindowEnd && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] p-4 ring-1 ring-[var(--clay)]">
          <p className="text-sm font-medium">Kodsuz teslim bildirimi</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Hizmet veren kod olmadan teslim bildirdi.{" "}
            {new Date(order.disputeWindowEnd).toLocaleString("tr-TR")} tarihine kadar itiraz edebilirsin.
          </p>
        </div>
      )}
      {order.paymentStatus === "authorized" &&
        !terminal &&
        order.status !== "ready" &&
        order.status !== "admin_pending" && (
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
          const current = i === idx && !terminal;
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
                {statusMeta(s).trackLabel}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {order.status === "pending"
          ? "Komşu kabul etmeden iptal edebilirsin. Tutanak çözülür, para çekilmez."
          : customerStatusHint(order.status)}
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
      {order.status === "completed" && order.review && (
        <div className="mt-4">
          <h3 className="text-sm font-medium">Yorumun</h3>
          <ReviewList reviews={[order.review]} />
        </div>
      )}
      {order.status === "completed" && !order.review && (
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
