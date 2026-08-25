import type { DropPoint, LngLat, Provider, ServicePackage } from "./types";

export const PILOT = {
  id: "cankaya-cukurambar",
  city: "Ankara",
  label: "Çankaya · Çukurambar",
  /** OSM: Çukurambar Mahallesi centroid */
  center: { lng: 32.80286, lat: 39.90313 } satisfies LngLat,
  zoom: 15.7,
  radiusKm: 3,
  bounds: {
    west: 32.786,
    south: 39.894,
    east: 32.815,
    north: 39.913,
  },
};

export const PACKAGES: ServicePackage[] = [
  { id: "yikama", title: "Sadece yıkama", blurb: "Yıka, kurut, poşetle", pricePerPiece: 9 },
  { id: "katlama", title: "Yıkama + katlama", blurb: "Düzenli katlanmış teslim", pricePerPiece: 13 },
  { id: "tam", title: "Yıkama + ütü + katlama", blurb: "Tam paket", pricePerPiece: 18 },
];

const slots = [
  "Bugün 18:00–19:00",
  "Bugün 19:00–20:00",
  "Yarın 09:00–10:00",
  "Yarın 12:00–13:00",
  "Yarın 18:00–19:00",
];

export const PROVIDERS: Provider[] = [
  {
    id: "elif",
    name: "Elif Y.",
    neighborhood: "Çukurambar",
    loc: { lng: 32.79902, lat: 39.90163 },
    rating: 4.9,
    reviews: 86,
    packages: PACKAGES,
    capacity: 40,
    remaining: 24,
    hasDryer: true,
    express: true,
    trust: "kurucu",
    drops: ["kapi", "nokta"],
    slots,
    bio: "Kurucu hizmet veren. Makine kurutucu var, aynı gün bitirebiliyor.",
  },
  {
    id: "ayse",
    name: "Ayşe K.",
    neighborhood: "Söğütözü",
    loc: { lng: 32.7902, lat: 39.9076 },
    rating: 4.7,
    reviews: 41,
    packages: PACKAGES.filter((p) => p.id !== "tam").concat([
      { ...PACKAGES[2], pricePerPiece: 17 },
    ]),
    capacity: 28,
    remaining: 18,
    hasDryer: false,
    express: false,
    trust: "guvenilir",
    drops: ["kapi", "nokta"],
    slots: slots.slice(2),
    bio: "Kurutma ipte; yağmurlu günde ertesi sabaha kayabilir.",
  },
  {
    id: "merve",
    name: "Merve T.",
    neighborhood: "Kızılırmak",
    loc: { lng: 32.8091, lat: 39.9055 },
    rating: 4.8,
    reviews: 63,
    packages: PACKAGES.map((p) =>
      p.id === "tam" ? { ...p, pricePerPiece: 20 } : p,
    ),
    capacity: 36,
    remaining: 10,
    hasDryer: true,
    express: true,
    trust: "kurucu",
    drops: ["kapi", "nokta"],
    slots,
    bio: "Ütü ağırlıklı. Gömlek ve iş kıyafeti için tercih ediliyor.",
  },
  {
    id: "fatma",
    name: "Fatma D.",
    neighborhood: "Çukurambar",
    loc: { lng: 32.8014, lat: 39.8969 },
    rating: 4.6,
    reviews: 29,
    packages: PACKAGES,
    capacity: 22,
    remaining: 22,
    hasDryer: true,
    express: false,
    trust: "guvenilir",
    drops: ["nokta"],
    slots: slots.slice(1),
    bio: "Kapı teslimi henüz açık değil — nötr noktada bırak / al.",
  },
  {
    id: "zeynep",
    name: "Zeynep A.",
    neighborhood: "Çukurambar",
    loc: { lng: 32.7964, lat: 39.8998 },
    rating: 4.5,
    reviews: 12,
    packages: PACKAGES.filter((p) => p.id !== "tam"),
    capacity: 18,
    remaining: 18,
    hasDryer: false,
    express: false,
    trust: "yeni",
    drops: ["nokta"],
    slots: slots.slice(2),
    bio: "İlk siparişlerde yalnızca nötr nokta. Yıkama ve katlama.",
  },
  {
    id: "hatice",
    name: "Hatice S.",
    neighborhood: "Kızılırmak",
    loc: { lng: 32.8096, lat: 39.9018 },
    rating: 4.8,
    reviews: 54,
    packages: PACKAGES,
    capacity: 32,
    remaining: 14,
    hasDryer: true,
    express: true,
    trust: "guvenilir",
    drops: ["kapi", "nokta"],
    slots,
    bio: "Nevresim ve havlu gibi hacimli işlerde kapasitesi yüksek.",
  },
  {
    id: "nurcan",
    name: "Nurcan B.",
    neighborhood: "Çukurambar",
    loc: { lng: 32.8004, lat: 39.9087 },
    rating: 4.4,
    reviews: 18,
    packages: PACKAGES,
    capacity: 20,
    remaining: 12,
    hasDryer: true,
    express: false,
    trust: "yeni",
    drops: ["nokta"],
    slots: slots.slice(0, 3),
    bio: "Yeni katıldı. Kimlik doğrulaması tamam, sicil beyanı var.",
  },
  {
    id: "gulsen",
    name: "Gülşen R.",
    neighborhood: "Çukurambar",
    loc: { lng: 32.8043, lat: 39.9049 },
    rating: 4.9,
    reviews: 101,
    packages: PACKAGES.map((p) => ({ ...p, pricePerPiece: p.pricePerPiece - 2 })),
    capacity: 48,
    remaining: 32,
    hasDryer: true,
    express: true,
    trust: "kurucu",
    drops: ["kapi", "nokta"],
    slots,
    bio: "En çok tekrar sipariş alan kurucu. Çocuklu aileler tercih ediyor.",
  },
];

export const DROP_POINTS: DropPoint[] = [
  {
    id: "muhtarlik",
    name: "Çukurambar Muhtarlık",
    hint: "Öğretmenler Caddesi, giriş dolabı 08:00–21:00",
    loc: { lng: 32.80274, lat: 39.90363 },
  },
  {
    id: "cadde",
    name: "1427. Cadde",
    hint: "Restoran hattı, kafe önü teslim",
    loc: { lng: 32.8041, lat: 39.8996 },
  },
  {
    id: "park",
    name: "Kızılırmak Parkı",
    hint: "Park girişi, kafe terası",
    loc: { lng: 32.8102, lat: 39.9068 },
  },
  {
    id: "site",
    name: "Öğretmenler site kapısı",
    hint: "Güvenlik kulübesi, isim söylemen yeterli",
    loc: { lng: 32.7989, lat: 39.9051 },
  },
];

export function providerById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}

export function dropById(id: string) {
  return DROP_POINTS.find((d) => d.id === id);
}

export function trustLabel(tier: Provider["trust"]) {
  if (tier === "kurucu") return "Kurucu";
  if (tier === "guvenilir") return "Kapı açık";
  return "Nötr nokta";
}
