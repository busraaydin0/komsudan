export const TOPUP_METHODS = [
  { id: "kart", label: "Banka / kredi kartı", hint: "Simülasyon — anında bakiye" },
  { id: "havale", label: "Havale / EFT", hint: "Simülasyon — anında onay" },
  { id: "papara", label: "Papara", hint: "Simülasyon — anında bakiye" },
  { id: "hediye", label: "Hediye bakiyesi", hint: "Pilot: kod gerekmez" },
] as const;

export type TopupMethodId = (typeof TOPUP_METHODS)[number]["id"];

export const TOPUP_PRESETS = [100, 250, 500, 1000] as const;

export const INSUFFICIENT_BALANCE_MESSAGE =
  "Bakiye yetersiz. Sipariş alınmadı. Hesap’tan yükleme yöntemi seçip bakiye ekle.";

export const PAYOUT_METHODS = [
  { id: "iban", label: "IBAN / havale", hint: "Simülasyon — anında çıkar" },
  { id: "papara", label: "Papara", hint: "Simülasyon — anında çıkar" },
] as const;

export type PayoutMethodId = (typeof PAYOUT_METHODS)[number]["id"];

export const INSUFFICIENT_PAYOUT_MESSAGE =
  "Çekim alınmadı. Bakiyen yetersiz; ya tüm çekilebilir tutarı çek ya da daha az yaz.";
