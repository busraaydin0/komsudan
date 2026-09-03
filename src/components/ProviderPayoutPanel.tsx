"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWallet, postWalletPayout } from "@/lib/api";
import { tl } from "@/lib/pricing";
import type { WalletActivity, WalletSnapshot } from "@/lib/types";
import { INSUFFICIENT_PAYOUT_MESSAGE, PAYOUT_METHODS } from "@/lib/walletMethods";

function kindLabel(kind: string) {
  if (kind === "earn") return "Tahsil";
  if (kind === "payout") return "Çekim";
  if (kind === "topup") return "Yükleme";
  if (kind === "hold") return "Sipariş";
  if (kind === "release") return "İade";
  return kind;
}

export function ProviderPayoutPanel() {
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [activity, setActivity] = useState<WalletActivity[]>([]);
  const [method, setMethod] = useState<(typeof PAYOUT_METHODS)[number]["id"]>("iban");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const data = await fetchWallet();
    setWallet(data.wallet);
    setActivity(data.activity);
  }, []);

  useEffect(() => {
    void load().catch(() => setWallet(null));
  }, [load]);

  const balance = wallet?.balance ?? 0;
  const amount = custom.trim() ? Number(custom.replace(",", ".")) : balance;
  const canWithdraw: 0 | 1 =
    wallet == null ? 0 : Number.isInteger(amount) && amount > 0 && amount <= balance ? 1 : 0;

  async function submit() {
    setErr("");
    setOk("");
    if (canWithdraw === 0) {
      setErr(INSUFFICIENT_PAYOUT_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const data = await postWalletPayout(method, amount);
      setWallet(data.wallet);
      setActivity(data.activity);
      setOk(`${tl(amount)} çekildi (simülasyon).`);
      setCustom("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Çekim alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="k-rise mt-4 rounded-3xl bg-[var(--card)] p-5 ring-1 ring-[var(--line)]">
      <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--muted)] uppercase">Çekilebilir</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tabular-nums">
        {wallet ? tl(wallet.balance) : "—"}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Teslim tahsilinde komisyon düşülür, kalan bakiyeye yazılır. Çekim 1 ise çıkar, 0 ise hata görünür.
      </p>

      <h3 className="mt-5 text-sm font-medium">Nereye</h3>
      <div className="mt-2 grid gap-2">
        {PAYOUT_METHODS.map((m) => (
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCustom("")}
          className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
            !custom ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
          }`}
        >
          Tümünü çek
        </button>
      </div>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        inputMode="numeric"
        placeholder="Daha az tutar (₺)"
        className="mt-2 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
      />
      {custom.trim() && canWithdraw === 0 ? (
        <p className="mt-2 text-sm text-[var(--clay)]">{INSUFFICIENT_PAYOUT_MESSAGE}</p>
      ) : err ? (
        <p className="mt-2 text-sm text-[var(--clay)]">{err}</p>
      ) : null}
      {ok ? <p className="mt-2 text-sm text-[var(--teal)]">{ok}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-3 w-full rounded-2xl bg-[var(--ink)] py-3 text-sm text-[var(--paper)] disabled:opacity-50"
      >
        {busy ? "Gönderiliyor…" : canWithdraw === 1 ? `Çek · ${tl(amount)}` : "Çekim yok"}
      </button>

      {activity.filter((r) => r.kind === "earn" || r.kind === "payout").length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3">
          {activity
            .filter((r) => r.kind === "earn" || r.kind === "payout")
            .slice(0, 8)
            .map((row) => (
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
