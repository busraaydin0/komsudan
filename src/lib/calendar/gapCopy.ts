/** Takvim boş/kilitli durumları — müşteriye neden. */

export const CALENDAR_COPY = {
  closed: "Bu gün çalışmıyor",
  full: "Bu veren bugün dolu",
  expressNone: "Acil için bugün uygun pencere yok",
  size: "Seçtiğin boy bu günlere sığmıyor",
  leadToday: "Bugün için uygun pencere kalmadı",
  pickupFirst: "Önce alım penceresi seç",
} as const;

export type CalendarCopyKey = keyof typeof CALENDAR_COPY;
