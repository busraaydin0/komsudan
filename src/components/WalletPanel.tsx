"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWallet, postWalletTopup } from "@/lib/api";
import { tl } from "@/lib/pricing";
import type { WalletActivity, WalletSnapshot } from "@/lib/types";
import { TOPUP_METHODS, TOPUP_PRESETS } from "@/lib/walletMethods";

function kindLabel(kind: string) {
  if (kind === "topup") return "Yükleme";
  if (kind === "hold") return "Sipariş";
  if (kind === "release") return "İade";
  return kind;
}

export function WalletPanel() {
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [activity, setActivity] = useState<WalletActivity[]>([]);
  const [presets, setPresets] = useState<number[]>([...TOPUP_PRESETS]);
  const [method, setMethod] = useState<(typeof TOPUP_METHODS)[number]["id"]>("kart");
  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const data = await fetchWallet();
    setWallet(data.wallet);
    setActivity(data.activity);
    setPresets(data.presets);
  }, []);

  useEffect(() => {
    void load().catch(() => setWallet(null));
  }, [load]);

  const chosen = custom.trim() ? Number(custom.replace(",", ".")) : amount;
  const valid = Number.isFinite(chosen) && chosen >= 50 && chosen <= 10000 && Number.isInteger(chosen);

  async function submit() {
    setErr("");
    setOk("");
    if (!valid) {
      setErr("50–10.000 ₺ arası tam tutar yaz.");
      return;
    }
    setBusy(true);
    try {
      const data = await postWalletTopup(method, chosen);
      setWallet(data.wallet);
      setActivity(data.activity);
      setOk(`${tl(chosen)} yüklendi.`);
      setCustom("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yükleme alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="k-rise rounded-3xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
      <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--muted)] uppercase">Bakiye</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tabular-nums">
        {wallet ? tl(wallet.balance) : "—"}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Sipariş ya alınır (1) ya alınmaz (0). Yetersiz bakiyede hata çıkar, sipariş yazılmaz.
      </p>

      <h3 className="mt-5 text-sm font-medium">Yükleme yöntemi</h3>
      <div className="mt-2 grid gap-2">
        {TOPUP_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-2xl px-3 py-2.5 text-left ring-1 ${
              method === m.id ? "bg-[var(--sand)] ring-[var(--clay)]" : "ring-[var(--line)]"
            }`}
          >
            <span className="block text-sm">{m.label}</span>
            <span className="text-xs text-[var(--muted)]">{m.hint}</span>
          </button>
        ))}
      </div>

      <h3 className="mt-5 text-sm font-medium">Tutar</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setAmount(n);
              setCustom("");
            }}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              !custom && amount === n ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {tl(n)}
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        inputMode="numeric"
        placeholder="Başka tutar (₺)"
        className="mt-2 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
      />
      {err ? <p className="mt-2 text-sm text-[var(--clay)]">{err}</p> : null}
      {ok ? <p className="mt-2 text-sm text-[var(--teal)]">{ok}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-3 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm text-[var(--paper)] disabled:opacity-50"
      >
        {busy ? "Yükleniyor…" : "Bakiyeyi yükle"}
      </button>

      {activity.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3">
          {activity.slice(0, 6).map((row) => (
            <li key={row.id} className="flex justify-between text-xs text-[var(--muted)]">
              <span>{kindLabel(row.kind)}</span>
              <span className="tabular-nums">
                {row.amount > 0 ? "+" : ""}
                {tl(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
