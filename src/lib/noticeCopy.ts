/** Sipariş ve hatırlatma metinleri. Çamaşır kayıt defterinden. */

import { clampPublicCategoryIds } from "./categories/registry";

export type NoticeKind = "created" | "accepted" | "ready" | "completed" | "rejected" | "cancelled" | "pickup";

export type NoticeCtx = {
  packageId?: string | null;
  pieces: number;
  productName?: string | null;
  orderId: string;
  pickupCode?: string | null;
};

type Line = { title: string; body: string };
type Fill = { qty: string; orderId: string; code: string; rawCode: string };
type Template = { title: string; body: (c: Fill) => string };

const LAUNDRY_PACKS = new Set(["camasir", "yikama", "katlama", "tam"]);

export function noticeCategory(packageId?: string | null): string {
  const id = (packageId ?? "").trim();
  if (!id || LAUNDRY_PACKS.has(id)) return "camasir";
  return "camasir";
}

function qtyLabel(n: number): string {
  return `${n} parça`;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function fill(t: Template, ctx: NoticeCtx): Line {
  const code = ctx.pickupCode ? ` Teslim kodun: ${ctx.pickupCode}.` : "";
  const qty = qtyLabel(ctx.pieces);
  return {
    title: t.title,
    body: t.body({
      qty,
      orderId: ctx.orderId,
      code,
      rawCode: ctx.pickupCode?.trim() || "",
    }),
  };
}

const CAMASIR: Record<NoticeKind, Template[]> = {
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
};

const ORDER: Record<string, Record<NoticeKind, Template[]>> = { camasir: CAMASIR };

export function pickOrderNotice(kind: NoticeKind, ctx: NoticeCtx): Line {
  const cat = noticeCategory(ctx.packageId);
  const bank = ORDER[cat] ?? CAMASIR;
  return fill(pick(bank[kind]), ctx);
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
};

export const NUDGE_COPIES: Line[] = NUDGES.camasir!;

export function pickNudgeCopy(excludeTitle?: string | null, categoryIds?: string[]) {
  const cats = clampPublicCategoryIds(categoryIds);
  const pool = cats.flatMap((id) => NUDGES[id] ?? NUDGES.camasir!);
  const list = excludeTitle ? pool.filter((item) => item.title !== excludeTitle) : pool;
  return pick(list.length ? list : NUDGES.camasir!);
}
