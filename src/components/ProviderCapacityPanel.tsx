"use client";

import { useEffect, useState } from "react";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type CapacityForm = {
  halfUnitsPerDay: number;
  workingDays: number[];
  maxUnitsPerOrder: number;
};

async function fetchCapacity(): Promise<CapacityForm> {
  const res = await fetch("/api/providers/me/capacity", { credentials: "same-origin" });
  const data = (await res.json()) as { capacity?: CapacityForm & { configured?: boolean }; error?: string };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Kapasite alınamadı.");
  const c = data.capacity!;
  return {
    halfUnitsPerDay: c.halfUnitsPerDay,
    workingDays: c.workingDays,
    maxUnitsPerOrder: c.maxUnitsPerOrder,
  };
}

async function saveCapacity(body: CapacityForm) {
  const res = await fetch("/api/providers/me/capacity", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
}

export function ProviderCapacityPanel({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState<CapacityForm>({
    halfUnitsPerDay: 6,
    workingDays: [1, 2, 3, 4, 5, 6],
    maxUnitsPerOrder: 4,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    void fetchCapacity()
      .then(setForm)
      .catch(() => {});
  }, []);

  function toggleDay(iso: number) {
    setForm((f) => {
      const has = f.workingDays.includes(iso);
      const next = has ? f.workingDays.filter((d) => d !== iso) : [...f.workingDays, iso].sort();
      return { ...f, workingDays: next.length ? next : f.workingDays };
    });
  }

  async function save() {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await saveCapacity(form);
      setOk("Kapasite kaydedildi. Müşteriler takvim dolulukunu görür.");
      onSaved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  const machinesPerDay = form.halfUnitsPerDay / 2;

  return (
    <div className="k-rise mt-6 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">Makine kapasitesi</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Günlük yarım-makine birimi. Orta boy = 2 birim, büyük = 4 birim.
      </p>
      <label className="mt-4 block text-sm">
        Günlük makine (≈ yarım-makine × 2)
        <input
          type="number"
          min={1}
          max={12}
          step={0.5}
          value={machinesPerDay}
          onChange={(e) => {
            const m = Number(e.target.value);
            if (!Number.isFinite(m)) return;
            setForm((f) => ({ ...f, halfUnitsPerDay: Math.round(m * 2) }));
          }}
          className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 ring-1 ring-[var(--line)]"
        />
      </label>
      <p className="mt-3 text-sm font-medium">Çalışma günleri</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DAY_LABELS.map((label, i) => {
          const iso = i + 1;
          const on = form.workingDays.includes(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggleDay(iso)}
              className={`k-chip rounded-full px-3 py-1 text-xs ring-1 ${on ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]" : "ring-[var(--line)]"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-sm">
        Tek sipariş üst sınırı (birim, max 4 = Büyük)
        <select
          value={form.maxUnitsPerOrder}
          onChange={(e) => setForm((f) => ({ ...f, maxUnitsPerOrder: Number(e.target.value) }))}
          className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 ring-1 ring-[var(--line)]"
        >
          {[1, 2, 4].map((n) => (
            <option key={n} value={n}>
              {n} birim
            </option>
          ))}
        </select>
      </label>
      {err ? <p className="mt-2 text-xs text-[var(--clay)]">{err}</p> : null}
      {ok ? <p className="mt-2 text-xs text-[var(--teal)]">{ok}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="k-press mt-4 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
      >
        {busy ? "Kaydediliyor…" : "Kapasiteyi kaydet"}
      </button>
    </div>
  );
}
