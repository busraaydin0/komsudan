"use client";

import { useEffect, useMemo, useState } from "react";
import { PACKAGES } from "@/lib/data";
import {
  fetchOrderMessages,
  patchOrder,
  postDeliveryOverride,
  postPickupConfirm,
  uploadOrderPhoto,
  useCatalog,
  useOrders,
  useSession,
} from "@/lib/api";
import {
  ADDON_KINDS,
  ADDON_VARIANTS,
  LAUNDRY_SIZES,
  SIZE_LABELS,
  type LaundrySize,
  type OrderAddonLine,
} from "@/lib/laundryModel";
import { MessageBadge } from "@/components/OrderThread";
import { tl } from "@/lib/pricing";
import { canAddPhotos } from "@/lib/status";
import type { Order, OrderStatus, Provider } from "@/lib/types";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";
import { LaundryProfile } from "@/components/LaundryProfile";
import { ProviderPayoutPanel } from "@/components/ProviderPayoutPanel";
import { ProviderCapacityPanel } from "@/components/ProviderCapacityPanel";

const LABEL: Record<OrderStatus, string> = {
  onay_bekliyor: "Bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır",
  teslim_edildi: "Bitti",
  iptal: "İptal",
};

const BADGE: Record<OrderStatus, string> = {
  onay_bekliyor: "bg-[var(--sand)] text-[var(--clay)]",
  teslim_alindi: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  yikaniyor: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  utuleniyor: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  hazir: "bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)]",
  teslim_edildi: "bg-[var(--paper)] text-[var(--muted)]",
  iptal: "bg-[var(--paper)] text-[var(--muted)]",
};

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return label.charAt(0).toLocaleUpperCase("tr-TR") + label.slice(1);
}

export function ProviderDesk({
  onEditDiscovery,
  onOpenMessages,
}: {
  onEditDiscovery?: () => void;
  onOpenMessages?: (orderId: string) => void;
}) {
  const { account } = useSession();
  const { providers, reload: reloadCatalog } = useCatalog();
  const { orders, ready, reload, err: ordersErr } = useOrders();
  const open = orders.filter((o) => o.status !== "teslim_edildi" && o.status !== "iptal");
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const months = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.status !== "teslim_edildi" && o.status !== "iptal") continue;
      const key = monthKey(o.createdAt);
      const list = map.get(key);
      if (list) list.push(o);
      else map.set(key, [o]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [orders]);

  function reloadAll() {
    void Promise.all([reload(), reloadCatalog()]);
  }

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="k-rise mx-auto flex max-w-lg items-center justify-between px-5 pr-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div>
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Hizmet veren
          </p>
          {onEditDiscovery ? (
            <button type="button" onClick={onEditDiscovery} className="k-press mt-1 text-xs text-[var(--muted)]">
              ← Hizmet al / ver
            </button>
          ) : (
            <p className="text-xs text-[var(--muted)]">Çukurambar pilotu</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-[calc(var(--tabbar)+1.5rem)]">
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "40ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Açık iş</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{open.length}</p>
          </div>
        </div>

        <ProviderPayoutPanel />

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">Gelen siparişler</h2>
        {ordersErr ? <p className="mt-2 text-sm text-[var(--clay)]">{ordersErr}</p> : null}
        {!ready ? (
          <ul className="mt-3 space-y-3">
            {[0, 1].map((i) => (
              <li key={i} className="k-skel h-32 rounded-3xl" />
            ))}
          </ul>
        ) : orders.length === 0 ? (
          <p className="k-rise mt-3 text-sm text-[var(--muted)]">
            Henüz sipariş yok. Haritadan bir katlayan seçip sipariş bırak.
          </p>
        ) : (
          <div className="mt-3 space-y-5">
            {open.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-[var(--teal)] uppercase">Açık</p>
                <ul className="mt-2 space-y-3">
                  {open.map((o, i) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      providers={providers}
                      onChanged={reloadAll}
                      delay={i * 40}
                      onOpenMessages={onOpenMessages}
                    />
                  ))}
                </ul>
              </div>
            )}
            {months.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">Aylar</p>
                <ul className="mt-2 space-y-2">
                  {months.map(([key, list]) => {
                    const on = openMonth === key;
                    return (
                      <li key={key} className="overflow-hidden rounded-3xl ring-1 ring-[var(--line)]">
                        <button
                          type="button"
                          aria-expanded={on}
                          onClick={() => setOpenMonth(on ? null : key)}
                          className="k-press flex w-full items-baseline justify-between bg-[var(--card)] px-4 py-3 text-left"
                        >
                          <span className="font-[family-name:var(--font-display)] text-lg">
                            {monthLabel(key)}
                          </span>
                          <span className="text-xs text-[var(--muted)]">{list.length} iş</span>
                        </button>
                        {on && (
                          <ul className="space-y-3 bg-[var(--paper)] px-3 pt-1 pb-3">
                            {list.map((o, i) => (
                              <OrderCard
                                key={o.id}
                                order={o}
                                providers={providers}
                                onChanged={reloadAll}
                                delay={i * 30}
                                onOpenMessages={onOpenMessages}
                              />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <LaundryProfile me={providers.find((p) => p.id === account?.id)} onChanged={reloadAll} />
        <ProviderCapacityPanel onSaved={reloadAll} />

        {!providers.some((p) => p.id === account?.id) && (
          <p className="k-rise mt-6 text-sm text-[var(--muted)]">
            Hizmet kartın burada görünmüyor. Keşifte “Hizmet vermek istiyorum”u işaretleyip çamaşır paketini kaydet; kart
            ve gelen işler bu sekmede açılır.
          </p>
        )}

      </main>
    </div>
  );
}

function OrderCard({
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
    PACKAGES.find((x) => x.id === order.packageId);
  const lc = order.lifecycle ?? "pending";
  const [pickupSize, setPickupSize] = useState<LaundrySize>(order.size);
  const [pickupAddons, setPickupAddons] = useState<OrderAddonLine[]>(order.addons);
  const [colorGroups, setColorGroups] = useState(1);
  const needsPickup = lc === "accepted" && !order.pickupConfirmedAt;
  const needsPickupCode = Boolean(
    lc === "accepted" &&
      order.pickupConfirmedAt &&
      order.pickupSummaryApprovedAt &&
      order.priceChange !== "pending",
  );
  const waitingSummary = Boolean(
    lc === "accepted" &&
      order.pickupConfirmedAt &&
      !order.pickupSummaryApprovedAt &&
      order.priceChange !== "pending",
  );
  const advanceLabel =
    needsPickupCode
      ? "Alım kodu ile teslim al"
      : lc === "accepted" && order.pickupConfirmedAt && order.priceChange !== "pending"
      ? "Kapıda bırakıldı"
      : lc === "dropped_off"
        ? "Yıkamaya geç"
        : lc === "washing"
          ? order.packageId === "tam"
            ? "Ütüye geç"
            : "Hazır"
          : lc === "ironing"
            ? "Hazır"
            : null;

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
      <p className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[order.status] ?? "bg-[var(--paper)] text-[var(--muted)]"}`}>
        {LABEL[order.status] ?? order.status}
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
        {order.status === "onay_bekliyor" && (
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
        {advanceLabel && order.status !== "onay_bekliyor" && order.status !== "hazir" && (
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
                      addons: pickupAddons,
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
      {order.status === "hazir" && !order.adminHold && (
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
      {order.status === "hazir" && order.adminHold && (
        <p className="mt-3 text-xs text-[var(--clay)]">Kodsuz teslim inceleniyor; müşteri itiraz süresi açık.</p>
      )}
    </li>
  );
}
