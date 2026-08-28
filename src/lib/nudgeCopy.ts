/** Duolingo / Trendyol tarzı hatırlatma metinleri. Aynı cümle peş peşe gelmesin. */
export const NUDGE_COPIES: { title: string; body: string }[] = [
  {
    title: "Çamaşırlar birikti mi?",
    body: "Komşudan hallet. Kapıda bırak, katlanmış al.",
  },
  {
    title: "Sepet dolu duruyor.",
    body: "Yıkamayı yarına bırakma. Komşudan bugün yetişir.",
  },
  {
    title: "Komşu makinesi boş.",
    body: "Çukurambar’da yer var. Birikenleri Komşudan hallet.",
  },
  {
    title: "Ütü yığını mı bu?",
    body: "Tam paketi seç, ütüsü de bizde. Komşudan gönder.",
  },
  {
    title: "Poşet kapıda beklesin.",
    body: "Eve kimse girmez. Çamaşır biriktiyse Komşudan.",
  },
  {
    title: "Bu hafta yıkama yoktu.",
    body: "Dolap sıkışmadan Komşudan bir tur at.",
  },
  {
    title: "Yarın dolmasın.",
    body: "Bugün bırakırsan akşama katlanmış teslim.",
  },
  {
    title: "Makine sırası açıldı.",
    body: "Çamaşırlar birikti mi? Haritadan komşu seç.",
  },
  {
    title: "Küçük torba da yeter.",
    body: "Sepet dolmadıysa bile Komşudan gönderebilirsin.",
  },
  {
    title: "Katlanmış gelsin.",
    body: "Sen işine bak, çamaşırı Komşudan hallet.",
  },
  {
    title: "Aynı gün yetişir.",
    body: "Kurutuculu komşu var. Biriktiyse bugün bırak.",
  },
  {
    title: "Hatırlatma: çamaşır günü",
    body: "Sepete bir göz at. Dolduysa Komşudan hallet.",
  },
  {
    title: "Çamaşır gününü erteleme.",
    body: "Biriktiyse Komşudan hallet, akşama teslim.",
  },
  {
    title: "Dolap taşmasın.",
    body: "Kirli yığını Komşudan çöz. Kapıda bırakırsın.",
  },
];

export function pickNudgeCopy(excludeTitle?: string | null) {
  const pool = excludeTitle
    ? NUDGE_COPIES.filter((item) => item.title !== excludeTitle)
    : NUDGE_COPIES;
  const list = pool.length ? pool : NUDGE_COPIES;
  return list[Math.floor(Math.random() * list.length)]!;
}
