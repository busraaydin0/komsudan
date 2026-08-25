function challenge() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return a;
}

export function canUsePasskey() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function registerPasskey(userId: string, phone: string, name: string) {
  if (!canUsePasskey()) throw new Error("Bu tarayıcı cihaz kilidini desteklemiyor.");
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "Komşudan", id: location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: phone,
        displayName: name || phone,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred?.id) throw new Error("Yüz veya parmak izi iptal edildi.");
  return cred.id;
}

export async function unlockPasskey() {
  if (!canUsePasskey()) throw new Error("Bu tarayıcı cihaz kilidini desteklemiyor.");
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      userVerification: "required",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred?.id) throw new Error("Yüz veya parmak izi iptal edildi.");
  return cred.id;
}

export function pilotPasskeyId(userId: string) {
  return `pilot-device:${userId}`;
}
