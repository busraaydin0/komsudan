/** Sipariş ve hatırlatma metinleri kategoriye göre. Aynı cümle peş peşe gelmesin. */

export type NoticeKind = "created" | "accepted" | "ready" | "completed" | "rejected" | "cancelled" | "pickup";

export type NoticeCtx = {
  packageId?: string | null;
  pieces: number;
  productName?: string | null;
  orderId: string;
  pickupCode?: string | null;
};

type Line = { title: string; body: string };
type Fill = { qty: string; orderId: string; name: string; code: string; rawCode: string };
type Template = { title: string; body: (c: Fill) => string };

const LAUNDRY_PACKS = new Set(["camasir", "yikama", "katlama", "tam"]);

export function noticeCategory(packageId?: string | null): string {
  const id = (packageId ?? "").trim();
  if (!id || LAUNDRY_PACKS.has(id)) return "camasir";
  return id;
}

function qtyLabel(cat: string, n: number, productName?: string | null): string {
  const name = productName?.trim() || "";
  switch (cat) {
    case "davet":
      return name ? `${n} kişilik ${name}` : `${n} kişilik davet`;
    case "dikis":
      return name ? `${n} adet ${name}` : `${n} adet dikiş`;
    case "tamir":
      return name ? `${n} adet ${name}` : `${n} tamir`;
    case "teknoloji":
      return name ? `${n} adet ${name}` : `${n} teknoloji işi`;
    case "araba":
      return name ? `${n} araç · ${name}` : `${n} araç`;
    case "kurye":
      return name ? `${n} paket · ${name}` : `${n} kurye işi`;
    case "bahce":
      return name ? `${n} iş · ${name}` : `${n} bahçe işi`;
    case "kargo":
      return name ? `${n} paket · ${name}` : `${n} kargo`;
    case "cikti":
      return name ? `${n} sayfa ${name}` : `${n} sayfa çıktı`;
    case "kislik":
      return name ? `${n} ${name}` : `${n} birim kışlık`;
    case "hali":
      return name ? `${n} adet ${name}` : `${n} adet halı`;
    case "odev":
      return name ? `${n} ders · ${name}` : `${n} ders`;
    case "dil":
      return name ? `${n} görüşme · ${name}` : `${n} görüşme`;
    case "mezar":
      return name ? `${n} işlem · ${name}` : `${n} işlem`;
    default:
      return name ? `${n} parça · ${name}` : `${n} parça`;
  }
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function fill(t: Template, ctx: NoticeCtx, cat: string): Line {
  const code = ctx.pickupCode ? ` Teslim kodun: ${ctx.pickupCode}.` : "";
  return {
    title: t.title,
    body: t.body({
      qty: qtyLabel(cat, ctx.pieces, ctx.productName),
      orderId: ctx.orderId,
      name: ctx.productName?.trim() || qtyLabel(cat, ctx.pieces, ctx.productName),
      code,
      rawCode: ctx.pickupCode?.trim() || "",
    }),
  };
}

const ORDER: Record<string, Record<NoticeKind, Template[]>> = {
  camasir: {
    created: [
      { title: "Yeni çamaşır", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Poşet yolda", body: (c) => `${c.qty} sipariş. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Çamaşır kabul edildi", body: (c) => `${c.orderId} alındı. Yıkama sırasına girdi.` },
      { title: "Makine sırası", body: (c) => `${c.qty} kabul. Yıkamaya alındı.` },
    ],
    ready: [
      { title: "Çamaşır hazır", body: (c) => `${c.orderId} katlanmış, teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Poşet hazır", body: (c) => `${c.qty} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Çamaşır teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Poşet alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Çamaşır reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Çamaşır iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  davet: {
    created: [
      { title: "Yeni davet siparişi", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Sofra siparişi", body: (c) => `${c.qty}. Menüden bak, kabul et.` },
    ],
    accepted: [
      { title: "Davet kabul edildi", body: (c) => `${c.orderId} alındı. Mutfağa girdi.` },
      { title: "Hazırlığa alındı", body: (c) => `${c.qty} kabul. Pişirme sırası.` },
    ],
    ready: [
      { title: "Yemek hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Sofra bekliyor", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Davet teslim", body: (c) => `${c.orderId} teslim edildi. Afiyet olsun, ödeme alındı.` },
      { title: "Yemek alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Davet reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Davet iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  dikis: {
    created: [
      { title: "Yeni dikiş", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "İğne işi geldi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Dikiş kabul edildi", body: (c) => `${c.orderId} alındı. Dikim sırasına girdi.` },
      { title: "Masaya alındı", body: (c) => `${c.qty} kabul. Dikime girdi.` },
    ],
    ready: [
      { title: "Dikiş hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "İşi bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Dikiş teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Parça alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Dikiş reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Dikiş iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  tamir: {
    created: [
      { title: "Yeni tamir", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Atölye işi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Tamir kabul edildi", body: (c) => `${c.orderId} alındı. Atölye sırasına girdi.` },
      { title: "Tezgâha alındı", body: (c) => `${c.qty} kabul. Tamire girdi.` },
    ],
    ready: [
      { title: "Tamir hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Onarım bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Tamir teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Parça alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Tamir reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Tamir iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  teknoloji: {
    created: [
      { title: "Yeni teknoloji işi", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Cihaz siparişi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "İş kabul edildi", body: (c) => `${c.orderId} alındı. Kuruluma girdi.` },
      { title: "Sıraya alındı", body: (c) => `${c.qty} kabul. İşleme girdi.` },
    ],
    ready: [
      { title: "Cihaz hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Kurulum bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "İş teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Cihaz alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "İş reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "İş iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  araba: {
    created: [
      { title: "Yeni araç işi", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Yıkama sırası", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Araç kabul edildi", body: (c) => `${c.orderId} alındı. Yıkama sırasına girdi.` },
      { title: "Plaka sırada", body: (c) => `${c.qty} kabul. Yıkamaya alındı.` },
    ],
    ready: [
      { title: "Araç hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Yıkama bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Araç teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Anahtar alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Araç işi reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Araç işi iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  kurye: {
    created: [
      { title: "Yeni kurye işi", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Paket bekliyor", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Kurye kabul edildi", body: (c) => `${c.orderId} alındı. Almaya çıkıyor.` },
      { title: "Yola çıktı", body: (c) => `${c.qty} kabul. Paket sıraya girdi.` },
    ],
    ready: [
      { title: "Paket hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Bırakılacak", body: (c) => `${c.qty} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Kurye teslim", body: (c) => `${c.orderId} bırakıldı. Ödeme alındı.` },
      { title: "Paket vardı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Kurye reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Kurye iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  bahce: {
    created: [
      { title: "Yeni bahçe işi", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Çim / budama", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Bahçe kabul edildi", body: (c) => `${c.orderId} alındı. Günü ayırdı.` },
      { title: "Takvime girdi", body: (c) => `${c.qty} kabul. Bahçeye sıraya alındı.` },
    ],
    ready: [
      { title: "Bahçe işi bitti", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "İş tamam", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Bahçe teslim", body: (c) => `${c.orderId} bitti. Ödeme alındı.` },
      { title: "Bahçe kapandı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Bahçe reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Bahçe iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  kargo: {
    created: [
      { title: "Yeni kargo", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Şube işi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Kargo kabul edildi", body: (c) => `${c.orderId} alındı. Şube sırasına girdi.` },
      { title: "Paketi aldı", body: (c) => `${c.qty} kabul. Yola girdi.` },
    ],
    ready: [
      { title: "Kargo hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Bırakılacak", body: (c) => `${c.qty} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Kargo teslim", body: (c) => `${c.orderId} bırakıldı. Ödeme alındı.` },
      { title: "Paket vardı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Kargo reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Kargo iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  cikti: {
    created: [
      { title: "Yeni çıktı", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Yazdırma işi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Çıktı kabul edildi", body: (c) => `${c.orderId} alındı. Baskı sırasına girdi.` },
      { title: "Yazıcıya gitti", body: (c) => `${c.qty} kabul. Basılıyor.` },
    ],
    ready: [
      { title: "Çıktı hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Sayfalar bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Çıktı teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Sayfa alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Çıktı reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Çıktı iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  kislik: {
    created: [
      { title: "Yeni kışlık", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Kavanoz siparişi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Kışlık kabul edildi", body: (c) => `${c.orderId} alındı. Hazırlığa girdi.` },
      { title: "Tencere sırası", body: (c) => `${c.qty} kabul. Yapıma alındı.` },
    ],
    ready: [
      { title: "Kışlık hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Kavanoz bekliyor", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Kışlık teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Kavanoz alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Kışlık reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Kışlık iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  hali: {
    created: [
      { title: "Yeni halı", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Yıkama işi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Halı kabul edildi", body: (c) => `${c.orderId} alındı. Yıkama sırasına girdi.` },
      { title: "Kilim sırada", body: (c) => `${c.qty} kabul. Temizliğe alındı.` },
    ],
    ready: [
      { title: "Halı hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Kurudu", body: (c) => `${c.qty} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Halı teslim", body: (c) => `${c.orderId} teslim edildi. Ödeme alındı.` },
      { title: "Halı alındı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Halı reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Halı iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  odev: {
    created: [
      { title: "Yeni ödev eşliği", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Ders talebi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Ders kabul edildi", body: (c) => `${c.orderId} alındı. Takvime girdi.` },
      { title: "Saat ayrıldı", body: (c) => `${c.qty} kabul. Eşlik sıraya girdi.` },
    ],
    ready: [
      { title: "Ders hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Eşlik bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Ders teslim", body: (c) => `${c.orderId} bitti. Ödeme alındı.` },
      { title: "Ödev kapandı", body: (c) => `${c.qty} tamam. Ödeme alındı.` },
    ],
    rejected: [{ title: "Ders reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Ders iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  dil: {
    created: [
      { title: "Yeni dil pratiği", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Görüşme talebi", body: (c) => `${c.qty}. Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Görüşme kabul edildi", body: (c) => `${c.orderId} alındı. Saate yazıldı.` },
      { title: "Pratik teyit", body: (c) => `${c.qty} kabul. Görüşme sıraya girdi.` },
    ],
    ready: [
      { title: "Görüşme hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Pratik bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Görüşme bitti", body: (c) => `${c.orderId} tamam. Ödeme alındı.` },
      { title: "Pratik kapandı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Görüşme reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Görüşme iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
  mezar: {
    created: [
      { title: "Yeni mezar bakımı", body: (c) => `${c.qty} geldi. Kabul veya red için Hizmet’e bak.` },
      { title: "Ziyaret talebi", body: (c) => `${c.qty}. Mezarlık işi Hizmet’ten bak.` },
    ],
    accepted: [
      { title: "Bakım kabul edildi", body: (c) => `${c.orderId} alındı. Mezarlığa yazıldı.` },
      { title: "Ziyaret teyit", body: (c) => `${c.qty} kabul. Sıraya girdi.` },
    ],
    ready: [
      { title: "Bakım hazır", body: (c) => `${c.orderId} teslime hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
      { title: "Ziyaret bitti", body: (c) => `${c.qty} hazır.${c.code} (SMS simülasyonu, gerçek SMS yok.)` },
    ],
    completed: [
      { title: "Bakım bitti", body: (c) => `${c.orderId} tamam. Ödeme alındı.` },
      { title: "Ziyaret kapandı", body: (c) => `${c.qty} teslim bitti. Ödeme alındı.` },
    ],
    rejected: [{ title: "Bakım reddedildi", body: (c) => `${c.orderId} kabul edilmedi. Ön otorizasyon çözüldü.` }],
    cancelled: [{ title: "Bakım iptal", body: (c) => `${c.orderId} iptal. Ön otorizasyon çözüldü, para çekilmedi.` }],
    pickup: [{ title: "Yeni teslim kodu", body: (c) => `Beş hatalı deneme oldu. Yeni kod: ${c.rawCode || "—"} (SMS simülasyonu, gerçek SMS yok.)` }],
  },
};

const FALLBACK = ORDER.camasir!;

export function pickOrderNotice(kind: NoticeKind, ctx: NoticeCtx): Line {
  const cat = noticeCategory(ctx.packageId);
  const bank = ORDER[cat] ?? FALLBACK;
  const list = bank[kind]?.length ? bank[kind] : FALLBACK[kind];
  return fill(pick(list), ctx, cat);
}

export const NUDGES: Record<string, Line[]> = {
  camasir: [
    { title: "Çamaşırlar birikti mi?", body: "Komşudan hallet. Kapıda bırak, katlanmış al." },
    { title: "Sepet dolu duruyor.", body: "Yıkamayı yarına bırakma. Komşudan bugün yetişir." },
    { title: "Komşu makinesi boş.", body: "Çukurambar’da yer var. Birikenleri Komşudan hallet." },
    { title: "Ütü yığını mı bu?", body: "Tam paketi seç, ütüsü de bizde. Komşudan gönder." },
    { title: "Poşet kapıda beklesin.", body: "Eve kimse girmez. Çamaşır biriktiyse Komşudan." },
    { title: "Hatırlatma: çamaşır günü", body: "Sepete bir göz at. Dolduysa Komşudan hallet." },
  ],
  davet: [
    { title: "Bu hafta sofra var mı?", body: "Kısır, pasta, kurabiye — komşudan ısmarla." },
    { title: "Misafir kapıda.", body: "Menüyü bugün kes. Kapıda veya noktada teslim." },
    { title: "Mutfak yorulmasın.", body: "Daveti Komşudan hallet, sen sofrayı kur." },
    { title: "Tatlı eksik kalmasın.", body: "Komşu fırını boş. Pasta veya kurabiye bak." },
  ],
  dikis: [
    { title: "Pantolon paçası mı?", body: "Komşu iğnesi hazır. Ölçü bırak, dikilmiş al." },
    { title: "Düğme koptu.", body: "Küçük dikiş de yeter. Haritadan komşu seç." },
    { title: "Fermuar sıkıştı mı?", body: "Atölyeye gitme. Komşudan diktir." },
    { title: "Kumaş bekliyor.", body: "Paça, daraltma, yama — Komşudan hallet." },
  ],
  tamir: [
    { title: "Bir şey bozuldu mu?", body: "Komşu atölyesi açık. Parçayı bırak, tamir al." },
    { title: "Vida gevşedi.", body: "Küçük tamir de yeter. Haritadan bak." },
    { title: "Çekmece sıkıştı mı?", body: "Eve kimse girmez. Atölyede tamir, kapıda teslim." },
    { title: "Tamir yığını.", body: "Komşudan hallet, sen işine bak." },
  ],
  teknoloji: [
    { title: "Bilgisayar ağırlaştı mı?", body: "Format, kurulum — komşudan hallet." },
    { title: "Yazıcı konuşmuyor.", body: "Komşu bakıyor. Cihazı bırak veya yerinde." },
    { title: "Güncelleme korkutuyor.", body: "Kurulumu Komşudan yaptır, sen işine bak." },
    { title: "Ekran takılıyor.", body: "Haritadan teknoloji komşusu seç." },
  ],
  araba: [
    { title: "Araba tozlandı mı?", body: "Komşu yıkar, sen anahtarı bırak." },
    { title: "Camlar bulanık.", body: "Yıkamayı yarına bırakma. Komşudan bak." },
    { title: "Hafta sonu misafir.", body: "Aracı bugün yıkat, kapıda teslim." },
    { title: "Jant unutuldu.", body: "Komşu sırası açıldı. Haritadan seç." },
  ],
  kurye: [
    { title: "Paket gidecek mi?", body: "Komşu alır, yakında bırakır. Eve kimse girmez." },
    { title: "Elin dolu.", body: "Kuryeyi Komşudan hallet, sen işine bak." },
    { title: "Aynı mahalle yetişir.", body: "Bugün bırakırsan yakında teslim." },
    { title: "Poşet bekliyor.", body: "Haritadan kurye komşusu seç." },
  ],
  bahce: [
    { title: "Çim uzadı mı?", body: "Komşu bahçeye bakar. Budama, çim — haritadan seç." },
    { title: "Saksı susuz kaldı.", body: "Bahçe işini Komşudan hallet." },
    { title: "Budama zamanı.", body: "Komşu makası hazır. Günü ayırt." },
    { title: "Bahçe yorulmasın.", body: "Çim ve yaprak Komşudan." },
  ],
  kargo: [
    { title: "Kargo şubede mi?", body: "Komşu alır, noktaya veya adrese bırakır." },
    { title: "Fiş cebinde unutuldu.", body: "Şube kuyruğuna girme. Komşudan hallet." },
    { title: "Paket bekliyor.", body: "Haritadan kargo komşusu seç." },
    { title: "Ağır kutu.", body: "Komşu taşır. Eve kimse girmez." },
  ],
  cikti: [
    { title: "Çıktı lazım mı?", body: "A4 komşuda basılır. Adresten veya noktada al." },
    { title: "Ödev basılacak.", body: "Yazıcı arama. Komşudan sayfa ısmarla." },
    { title: "Renkli mi, siyah mı?", body: "Komşu evde basar. Bugün yetişir." },
    { title: "Kuyruk uzamasın.", body: "Çıktıyı Komşudan hallet." },
  ],
  kislik: [
    { title: "Salça vakti.", body: "Komşu kavanozu doldurur. Kışlığı şimdiden ayırt." },
    { title: "Dondurucu boş mu?", body: "Tarhana, salça, dondurucu — komşudan bak." },
    { title: "Kış gelmeden.", body: "Kışlığı yarına bırakma. Komşudan ısmarla." },
    { title: "Kavanoz eksik.", body: "Haritadan kışlık komşusu seç." },
  ],
  hali: [
    { title: "Halı tozlandı mı?", body: "Komşu yıkar. Adresten al-ver, eve kimse girmez." },
    { title: "Kilim kokusu.", body: "Yıkamayı bahara bırakma. Komşudan bak." },
    { title: "Misafir geliyor.", body: "Halıyı bugün ver, kuruyunca al." },
    { title: "Yolluk unutuldu.", body: "Haritadan halı komşusu seç." },
  ],
  odev: [
    { title: "Ödev birikti mi?", body: "Komşu eşlik eder. Evde, ortak alanda veya online." },
    { title: "Sınav yaklaşıyor.", body: "Takip ve tekrar Komşudan. Eve kimse girmez." },
    { title: "Okuma saati.", body: "Bugün bir ders ayırt. Haritadan bak." },
    { title: "Defter açık kaldı.", body: "Ödev eşliğini Komşudan hallet." },
  ],
  dil: [
    { title: "Speaking paslandı mı?", body: "Komşuyla pratik. Evde, ortak alanda veya online." },
    { title: "Kelime unutuluyor.", body: "Görüşmeyi yarına bırakma. Komşudan bak." },
    { title: "Sınav konuşması.", body: "Pratiği Komşudan hallet. Eve kimse girmez." },
    { title: "Ağız açılmıyor.", body: "Haritadan dil komşusu seç. Bir görüşme yeter." },
  ],
  mezar: [
    { title: "Mezarlık bekliyor mu?", body: "Temizlik ve çiçek mezarlıkta. Eve kimse girmez." },
    { title: "Çiçek soldu.", body: "Bakımı yarına bırakma. Komşudan bak." },
    { title: "Ziyaret uzak.", body: "Fotoğrafı Komşudan iste. Sen evde kal." },
    { title: "Bayram öncesi.", body: "Haritadan mezar bakımı seç. Parseli not düş." },
  ],
};

export const NUDGE_COPIES: Line[] = Object.values(NUDGES).flat();

export function pickNudgeCopy(excludeTitle?: string | null, categoryIds?: string[]) {
  const wanted = (categoryIds?.length ? categoryIds : Object.keys(NUDGES)).map(noticeCategory);
  const cats = [...new Set(wanted.filter((id) => NUDGES[id]))];
  const pools = (cats.length ? cats : ["camasir"]).map((id) => NUDGES[id] ?? NUDGES.camasir!);
  const order = pools
    .map((pool, i) => ({ pool, i: Math.random() }))
    .sort((a, b) => a.i - b.i)
    .map((row) => row.pool);
  for (const pool of order) {
    const list = excludeTitle ? pool.filter((item) => item.title !== excludeTitle) : pool;
    if (list.length) return pick(list);
  }
  return NUDGES.camasir![0]!;
}
