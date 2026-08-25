"use client";

import { useState } from "react";
import { PACKAGES } from "@/lib/data";
import { patchOrder, uploadOrderPhoto, uploadPortfolioPhoto, useCatalog, useOrders } from "@/lib/api";
import { tl } from "@/lib/pricing";
import { canAddPhotos, nextStatus } from "@/lib/status";
import type { DropPoint, Order, OrderStatus, Provider } from "@/lib/types";
import { PhotoAdd, PhotoStrip } from "@/components/Photos";

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

export function ProviderDesk() {
  const { providers, dropPoints, reload: reloadCatalog } = useCatalog();
  const { orders, ready, reload } = useOrders();
  const wallet = orders
    .filter((o) => o.paymentStatus === "captured")
    .reduce((s, o) => s + (o.total - o.commission), 0);
  const open = orders.filter((o) => o.status !== "teslim_edildi" && o.status !== "iptal");

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="k-rise mx-auto flex max-w-lg items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div>
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Hizmet veren
          </p>
          <p className="text-xs text-[var(--muted)]">Çukurambar pilotu</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-[calc(var(--tabbar)+1.5rem)]">
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "40ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Cüzdan (tahsil)</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{tl(wallet)}</p>
          </div>
          <div
            className="k-rise rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]"
            style={{ animationDelay: "90ms" }}
          >
            <p className="text-xs text-[var(--muted)]">Açık iş</p>
            <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">{open.length}</p>
          </div>
        </div>

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">İş fotoğrafları</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Bugüne kadar yaptığın işlerden kareler. Müşteri kartında görünür.
        </p>
        <ul className="mt-3 space-y-3">
          {providers.map((p) => (
            <li key={p.id} className="rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                <PortfolioAdd
                  providerId={p.id}
                  onDone={() => void Promise.all([reload(), reloadCatalog()])}
                />
              </div>
              {p.workPhotos.length ? (
                <PhotoStrip photos={p.workPhotos} size="sm" />
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">Henüz fotoğraf yok.</p>
              )}
            </li>
          ))}
        </ul>

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">Gelen siparişler</h2>
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
          <ul className="mt-3 space-y-3">
            {orders.map((o, i) => (
              <OrderCard
                key={o.id}
                order={o}
                providers={providers}
                dropPoints={dropPoints}
                onChanged={() => void Promise.all([reload(), reloadCatalog()])}
                delay={i * 50}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  providers,
  dropPoints,
  onChanged,
  delay,
}: {
  order: Order;
  providers: Provider[];
  dropPoints: DropPoint[];
  onChanged: () => void;
  delay: number;
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const p = providers.find((x) => x.id === order.providerId);
  const pack =
    p?.packages.find((x) => x.id === order.packageId) ??
    PACKAGES.find((x) => x.id === order.packageId);
  const drop = dropPoints.find((d) => d.id === order.dropPointId);
  const next = nextStatus(order.status, order.packageId);

  async function act(action: "accept" | "reject" | "advance" | "deliver") {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await patchOrder(order.id, action, action === "deliver" ? code : undefined);
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
      <p className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[order.status]}`}>
        {LABEL[order.status]}
      </p>
      <p className="mt-2 font-medium">
        {p?.name} · {order.pieces} parça · {pack?.title}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {order.drop === "kapi" ? "Kapı teslim" : drop?.name ?? "Nötr nokta"} · {order.slot}
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
        {next && order.status !== "onay_bekliyor" && order.status !== "hazir" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("advance")}
            className="k-press k-cta rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--paper)]"
          >
            {busy ? "…" : LABEL[next]}
          </button>
        )}
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
      {order.status === "hazir" && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("deliver");
          }}
        >
          <p className="text-xs text-[var(--muted)]">
            Müşterinin 6 haneli teslim kodunu gir. Doğruysa ödeme cüzdana geçer.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="w-28 rounded-full bg-[var(--paper)] px-3 py-1.5 text-center font-[family-name:var(--font-display)] text-lg tabular-nums tracking-[0.2em] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              aria-label="Teslim kodu"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="k-press k-cta rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {busy ? "…" : "Doğrula · tahsil et"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function PortfolioAdd({ providerId, onDone }: { providerId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="text-right">
      <PhotoAdd
        label="Ekle"
        busy={busy}
        onPick={(file) => {
          void (async () => {
            setBusy(true);
            setErr("");
            try {
              await uploadPortfolioPhoto(providerId, file);
              onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Yüklenemedi.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
      {err && <p className="mt-1 text-[11px] text-[var(--clay)]">{err}</p>}
    </div>
  );
}
