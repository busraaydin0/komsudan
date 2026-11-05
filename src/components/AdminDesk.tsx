"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminKpi,
  fetchAdminMonthly,
  fetchAdminProviders,
  postAdminSuspend,
  type AdminKpi,
  type AdminMonthlyProfile,
  type AdminProviderItem,
} from "@/lib/api";
import { istanbulYearMonth } from "@/lib/capacity/istanbul";
import { monthLabel } from "@/lib/laundry/orderMonthGroup";
import { tl } from "@/lib/pricing";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function AdminDesk() {
  const [month, setMonth] = useState(istanbulYearMonth);
  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [kpi, setKpi] = useState<AdminKpi | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminMonthlyProfile | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([fetchAdminProviders(month), fetchAdminKpi(month)]);
      setProviders(list);
      setKpi(summary);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yönetim verisi alınamadı.");
    } finally {
      setReady(true);
    }
  }, [month]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selected) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchAdminMonthly(selected, month)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Profil alınamadı.");
      });
    return () => {
      cancelled = true;
    };
  }, [selected, month]);

  async function toggleSuspend(item: AdminProviderItem) {
    const why = reason.trim();
    if (!why) {
      setErr("Askıya alma / açma için neden yaz.");
      return;
    }
    setBusy(true);
    try {
      await postAdminSuspend(item.id, { suspended: !item.suspended, reason: why });
      setReason("");
      setErr("");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem yapılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = providers.find((p) => p.id === selected) ?? null;

  return (
    <div className="min-h-full bg-[var(--paper)]">
      <header className="k-rise mx-auto flex max-w-lg items-center justify-between px-5 pr-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div>
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-2xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Yönetim
          </p>
          <p className="text-xs text-[var(--muted)]">Hizmet admini · Çukurambar pilotu</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-[calc(var(--tabbar)+1.5rem)]">
        <label className="k-rise mt-6 block text-xs text-[var(--muted)]">
          Ay
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full rounded-2xl bg-[var(--card)] px-4 py-3 text-sm ring-1 ring-[var(--line)]"
          />
        </label>

        {err ? <p className="mt-3 text-sm text-[var(--clay)]">{err}</p> : null}

        <h2 className="k-rise mt-6 font-[family-name:var(--font-display)] text-xl">Pilot KPI</h2>
        {!ready || !kpi ? (
          <div className="k-skel mt-3 h-28 rounded-3xl" />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <KpiCard label="Tekrar sipariş" value={pct(kpi.repeatOrderRate)} />
            <KpiCard label="İptal" value={pct(kpi.cancelRate)} />
            <KpiCard label="Cevapsız" value={pct(kpi.unansweredRate)} />
            <KpiCard label="Teslim farkı" value={`${kpi.avgDeliveryDeltaHours} sa`} />
            <KpiCard label="Toplam sipariş" value={String(kpi.totalOrders)} />
            <KpiCard label="Komisyon" value={tl(kpi.totalCommission)} />
          </div>
        )}

        <h2 className="k-rise mt-8 font-[family-name:var(--font-display)] text-xl">Hizmet verenler</h2>
        {!ready ? (
          <ul className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="k-skel h-16 rounded-3xl" />
            ))}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2">
            {providers.map((p) => {
              const on = selected === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(on ? null : p.id)}
                    className={`k-press flex w-full items-center justify-between rounded-3xl px-4 py-3 text-left ring-1 ${
                      on ? "bg-[var(--sand)] ring-[var(--teal)]" : "bg-[var(--card)] ring-[var(--line)]"
                    }`}
                  >
                    <span>
                      <span className="font-[family-name:var(--font-display)] text-lg">{p.name}</span>
                      {p.neighborhood ? (
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">{p.neighborhood}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {p.attention ? (
                        <span className="rounded-full bg-[var(--clay)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--clay)]">
                          dikkat
                        </span>
                      ) : null}
                      <span className="text-[10px] text-[var(--muted)]">
                        {p.suspended ? "askıda" : p.paused ? "duraklatılmış" : "açık"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {chosen && profile ? (
          <section className="k-rise mt-5 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
            <p className="font-[family-name:var(--font-display)] text-xl">{profile.name}</p>
            <p className="text-xs text-[var(--muted)]">{monthLabel(profile.month)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Sipariş" value={profile.orderCount} />
              <Stat label="Tamamlanan" value={profile.completed} />
              <Stat label="İptal" value={profile.cancelled} />
              <Stat label="Cevapsız" value={profile.unanswered} />
              <Stat label="Gecikme" value={profile.delayed} />
              <Stat label="Geciken acil" value={profile.delayedExpress} />
              <Stat label="Puan" value={profile.averageRating || "—"} />
              <Stat label="Şikayet" value={profile.disputeCount} />
              <Stat label="Gelir" value={tl(profile.revenue)} />
              <Stat label="Komisyon" value={tl(profile.commission)} />
              <Stat label="Doluluk" value={pct(profile.averageOccupancy)} />
            </dl>
            <label className="mt-4 block text-xs text-[var(--muted)]">
              Neden (zorunlu)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)]"
                placeholder="Askıya alma veya açma gerekçesi"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleSuspend(chosen)}
              className="k-press mt-3 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm text-[var(--paper)] disabled:opacity-50"
            >
              {chosen.suspended ? "Askıyı kaldır" : "Askıya al"}
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--card)] p-3 ring-1 ring-[var(--line)]">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-xl tabular-nums">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
