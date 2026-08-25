"use client";

import { useState } from "react";
import type { Account } from "@/lib/types";
import { patchAccount, postPasskey, requestOtp, verifyOtp } from "@/lib/api";
import { permissionAsked } from "@/lib/permissions";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { pilotPasskeyId, registerPasskey } from "@/lib/passkey";

type Step = "phone" | "otp" | "identity" | "passkey" | "permissions";

function nextStep(account: Account | null): Step | "done" {
  if (!account) return "phone";
  if (!account.identityVerified) return "identity";
  if (!account.passkeyEnabled) return "passkey";
  if (!permissionAsked()) return "permissions";
  return "done";
}

export function LoginGate({
  account,
  onReady,
}: {
  account: Account | null;
  onReady: () => Promise<void> | void;
}) {
  const start = nextStep(account);
  const [step, setStep] = useState<Step>(start === "done" ? "phone" : start);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(account?.name ?? "");
  const [sms, setSms] = useState("");
  const [demo, setDemo] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(account);

  async function sendCode() {
    setErr("");
    setBusy(true);
    try {
      const res = await requestOtp(phone);
      setSms(res.sms);
      setDemo(res.demoCode);
      setStep("otp");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kod gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setErr("");
    setBusy(true);
    try {
      const a = await verifyOtp(phone, code);
      setMe(a);
      const n = nextStep(a);
      if (n === "done") await onReady();
      else setStep(n);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kod doğrulanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function checkIdentity() {
    setErr("");
    setBusy(true);
    try {
      const res = await patchAccount({ name, identity: true });
      setMe(res.account);
      const n = nextStep(res.account);
      if (n === "done") await onReady();
      else setStep(n);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kimlik doğrulanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function lockDevice(kind: "face" | "pilot") {
    if (!me) return;
    setErr("");
    setBusy(true);
    try {
      const id =
        kind === "face"
          ? await registerPasskey(me.id, me.phone, name || me.name)
          : pilotPasskeyId(me.id);
      await postPasskey(id);
      if (!permissionAsked()) setStep("permissions");
      else await onReady();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cihaz kilidi alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--paper)] px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-3xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Komşudan
        </p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-xl leading-snug">
          Önceliğimiz, kendinizi evinizde gibi güvende hissetmeniz.
        </p>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Çukurambar. Çamaşır kapıda veya noktada; eve kimse girmez.
        </p>

        <ol className="mt-8 flex gap-2 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
          {(["Telefon", "SMS", "Kimlik", "Yüz", "İzin"] as const).map((label, i) => {
            const order: Step[] = ["phone", "otp", "identity", "passkey", "permissions"];
            const on = order.indexOf(step) >= i;
            return (
              <li key={label} className={on ? "text-[var(--teal)]" : undefined}>
                {label}
              </li>
            );
          })}
        </ol>

        <div className="k-rise mt-6 rounded-3xl bg-[var(--card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[var(--line)]">
          {step === "phone" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">Giriş</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Numara, kimlik ve yüz kilidi bunun için. Komşun işler, sen evindeki gibi durursun.
              </p>
              <label className="mt-4 block text-xs text-[var(--muted)]">Cep telefonu</label>
              <input
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5XX XXX XX XX"
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-3 text-base ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendCode()}
                className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                {busy ? "Gönderiliyor…" : "SMS kodu al"}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">SMS kodu</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{sms || "Kod telefonuna gitti."}</p>
              {demo && (
                <p className="mt-3 rounded-2xl bg-[var(--sand)] px-3 py-3 font-[family-name:var(--font-display)] text-2xl tracking-[0.35em] tabular-nums">
                  {demo}
                </p>
              )}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 haneli kod"
                className="mt-4 w-full rounded-2xl bg-[var(--paper)] px-3 py-3 text-base tracking-[0.3em] ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void checkCode()}
                className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white"
              >
                {busy ? "Kontrol…" : "Doğrula"}
              </button>
              <button
                type="button"
                className="mt-3 w-full text-xs text-[var(--muted)]"
                onClick={() => {
                  setStep("phone");
                  setErr("");
                }}
              >
                Numarayı değiştir
              </button>
            </>
          )}

          {step === "identity" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">Kimlik</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Teslim kodu ve kapı bırakma için adın doğrulanır. Pilot: e-Devlet / NFC simülasyonu.
                TC kimlik numaranı saklamıyoruz.
              </p>
              <label className="mt-4 block text-xs text-[var(--muted)]">Ad soyad</label>
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adın ve soyadın"
                className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-3 text-base ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void checkIdentity()}
                className="k-press k-cta mt-4 w-full rounded-full bg-[var(--ink)] py-3 text-sm font-medium text-[var(--paper)]"
              >
                {busy ? "Doğrulanıyor…" : "Kimliğimi doğrula"}
              </button>
            </>
          )}

          {step === "passkey" && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">Yüz ve kilit</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Face ID, Touch ID veya cihaz PIN’i. Yüz görüntüsü sunucuya gitmez; kilidi telefonun
                açar.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void lockDevice("face")}
                className="k-press k-cta mt-4 w-full rounded-full bg-[var(--teal)] py-3 text-sm font-medium text-white"
              >
                {busy ? "Bekleniyor…" : "Yüz veya parmak izi"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void lockDevice("pilot")}
                className="mt-3 w-full text-xs text-[var(--muted)]"
              >
                Bu cihazda Face ID yok — pilot onay
              </button>
            </>
          )}

          {step === "permissions" && (
            <PermissionPrompt variant="inline" onDone={() => void onReady()} />
          )}

          {err && <p className="mt-3 text-sm text-[var(--clay)]">{err}</p>}
        </div>
        <p className="mt-auto pt-6 text-center text-[11px] text-[var(--muted)]">
          Çamaşır kapıda veya nötr noktada. Eve kimse girmez.
        </p>
      </div>
    </div>
  );
}
