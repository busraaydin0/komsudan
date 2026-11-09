"use client";

import { useEffect, useState } from "react";
import { readJson, unwrapEnvelope } from "@/lib/http/client";
import { halfUnitsToMachines, machinesToHalfUnits } from "@/lib/laundryModel";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type CapacityForm = {
  halfUnitsPerDay: number;
  workingDays: number[];
  maxUnitsPerOrder: number;
  expressQuota: number;
};

async function fetchCapacity(): Promise<CapacityForm> {
  const data = unwrapEnvelope(
    await readJson<{
      data?: { capacity: CapacityForm & { configured?: boolean } };
      capacity?: CapacityForm & { configured?: boolean };
    }>(await fetch("/api/providers/me/capacity", { credentials: "same-origin" })),
  );
  const c = data.capacity;
  if (!c) throw new Error("Bilgiler alınamadı.");
  return {
    halfUnitsPerDay: c.halfUnitsPerDay,
    workingDays: c.workingDays,
    maxUnitsPerOrder: c.maxUnitsPerOrder,
    expressQuota: c.expressQuota ?? 0,
  };
}

async function saveCapacity(body: CapacityForm) {
  unwrapEnvelope(
    await readJson<{ data?: { capacity: CapacityForm } }>(
      await fetch("/api/providers/me/capacity", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

export function ProviderCapacityPanel({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState<CapacityForm>({
    halfUnitsPerDay: 6,
    workingDays: [1, 2, 3, 4, 5, 6],
    maxUnitsPerOrder: 10,
    expressQuota: 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [expressOver, setExpressOver] = useState(false);

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
      setOk("Kaydedildi.");
      onSaved?.();
    } catch {
      setErr("Kaydedilemedi, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  const machinesPerDay = halfUnitsToMachines(form.halfUnitsPerDay);

  return (
    <div className="k-rise mt-6 rounded-3xl bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
      <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">Çamaşır makinen</p>
      <p className="mt-1 text-xs leading-snug text-[var(--muted)]">
        Bir gün kaç makine çamaşır yıkayabilirsen onu yaz. Küçük sipariş yarım makine, orta bir makine, büyük iki
        makine sayılır.
      </p>
      <label className="mt-4 block text-sm">
        Bir günde kaç makine yıkarsın?
        <input
          type="number"
          min={1}
          max={12}
          step={0.5}
          value={machinesPerDay}
          onChange={(e) => {
            const m = Number(e.target.value);
            if (!Number.isFinite(m)) return;
            const half = machinesToHalfUnits(m);
            setExpressOver(form.expressQuota > half);
            setForm((f) => ({
              ...f,
              halfUnitsPerDay: half,
              expressQuota: Math.min(f.expressQuota, half),
            }));
          }}
          className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 ring-1 ring-[var(--line)]"
        />
      </label>
      <p className="mt-1 text-xs leading-snug text-[var(--muted)]">
        Örnek: 3 yazarsan günde 3 orta boy sipariş alırsın.
      </p>
      <p className="mt-3 text-sm font-medium">Hangi günler yıkarsın?</p>
      <p className="mt-1 text-xs leading-snug text-[var(--muted)]">Sadece seçtiğin günler sipariş gelir.</p>
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
        Acil işler için kaç makine ayıralım?
        <input
          type="number"
          min={0}
          max={machinesPerDay}
          step={0.5}
          value={halfUnitsToMachines(form.expressQuota)}
          onChange={(e) => {
            const m = Number(e.target.value);
            if (!Number.isFinite(m)) return;
            const units = machinesToHalfUnits(m);
            setExpressOver(units > form.halfUnitsPerDay);
            setForm((f) => ({
              ...f,
              expressQuota: Math.max(0, Math.min(units, f.halfUnitsPerDay)),
            }));
          }}
          className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 ring-1 ring-[var(--line)]"
        />
      </label>
      <p className="mt-1 text-xs leading-snug text-[var(--muted)]">
        Acil işler bir gün içinde yetişmesi gereken işlerdir, fazladan ücret ödenir. Buraya yazdığın makineler
        sadece acil işlere ayrılır. Hiç acil iş almak istemiyorsan 0 bırak. Acil işe ayırdığın makine boş kalırsa da
        normal siparişe verilmez.
      </p>
      {expressOver ? (
        <p className="mt-1 text-xs leading-snug text-[var(--clay)]">
          Acil için ayırdığın makine, günlük makineden fazla olamaz.
        </p>
      ) : null}
      <label className="mt-4 block text-sm">
        Tek siparişte en fazla kaç makine alırsın?
        <select
          value={form.maxUnitsPerOrder}
          onChange={(e) => setForm((f) => ({ ...f, maxUnitsPerOrder: Number(e.target.value) }))}
          className="mt-1 w-full rounded-xl bg-[var(--paper)] px-3 py-2 ring-1 ring-[var(--line)]"
        >
          {[
            { n: 1, label: "½ makine" },
            { n: 2, label: "1 makine" },
            { n: 4, label: "2 makine" },
            { n: 6, label: "3 makine" },
            { n: 8, label: "4 makine" },
            { n: 10, label: "5 makine" },
          ].map(({ n, label }) => (
            <option key={n} value={n}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs leading-snug text-[var(--muted)]">Bundan büyük sipariş sana gelmez.</p>
      {err ? <p className="mt-2 text-xs text-[var(--clay)]">{err}</p> : null}
      {ok ? <p className="mt-2 text-xs text-[var(--teal)]">{ok}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="k-press mt-4 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
      >
        Kaydet
      </button>
    </div>
  );
}
