# Komşudan

Çukurambar (Ankara) komşu çamaşır PWA’sı. Pilot: **Çamaşır Yıkama** — kapıda bırak, komşu yıkayıp katlar. Eve kimse girmez.

Klasör adı `katla`, npm paketi `komsudan`. Kod İngilizce, arayüz Türkçe.

## Kurulum

Node 20+. `better-sqlite3` için yerel derleme araçları (macOS: Xcode CLT).

```bash
git clone https://github.com/busraaydin0/komsudan.git
cd komsudan
cp .env.example .env   # JWT_SECRET uzun rastgele dize
npm install
npm run dev
```

Tarayıcı: [http://localhost:3000](http://localhost:3000)

## Komutlar

| Komut | Açıklama |
|--------|-----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim (kalıcı Node; serverless değil) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (`strict`) |
| `npm run knip` | Kullanılmayan dosya/export |
| `npm run check` | lint + typecheck + test + knip |
| `npm run demo:reset` | Yerel DB’yi yedekleyip temiz demo veri kurar (`NODE_ENV!=production`) |

## Klasör yapısı

```
src/app/api/          JSON API (App Router)
src/app/              PWA sayfaları
src/components/       UI (büyük parçalar: components/laundry/**)
src/lib/auth/         JWT, OTP, middleware
src/lib/db/           SQLite, migration, sorgular
src/lib/services/     İş kuralları
src/lib/validation/   Zod
src/lib/laundry/      Pilot sabitleri (paket, boy, ek)
src/lib/types.ts      Paylaşılan tipler
db/migrations/        Numaralı SQL (0001_schema.sql)
docs/mimari.md        Katmanlar, veri modeli, durum makinesi
docs/performans.md    Ölçüm tablosu
```

Detay: [docs/mimari.md](docs/mimari.md)

## Veritabanı sıfırlama

Git’te yok: `data/komsudan.db`, `data/uploads/`, `.env`.

İlk `npm run dev`: boş DB + migrate + seed (örnek komşular).

Şema değişince veya bozuk DB’de (yıkıcı — tüm yerel siparişler silinir):

```bash
rm -f data/komsudan.db data/komsudan.db-wal data/komsudan.db-shm
npm run dev
```

İsteğe bağlı yedek: `cp data/komsudan.db data/komsudan.db.bak`

## Pilot kuralları

- Tutar ve sipariş **durumu** istemciden gelmez; sunucu hesaplar.
- Teslim: yalnız **kapı** (`drop: "kapi"`).
- Kategori registry yok; ürün sabitleri `src/lib/laundry/`.
- OTP geliştirmede yanıtta `demoCode`.

Seed telefonları (`src/lib/db/seed.ts`): hizmet verenler ör. Elif `5321100001`; Hizmet Admini `5321100099`.

## Demo

Jüri / savunma için 8–10 dakikalık tur. **Production’da çalışmaz.**

```bash
# .env içinde öneri (bekleyen kazanç 60 sn):
# WALLET_PENDING_WAIT_MS=60

npm run demo:reset
npm run dev
```

`demo:reset` mevcut `data/komsudan.db` dosyasını `data/backups/` altına kopyalar, sonra siler ve seed + örnek siparişleri kurar.

### Giriş

Geliştirmede OTP yanıtında `demoCode` görünür (ekranda da yazılır). Kod 5 dakika geçerli.

| Rol | Telefon | Ne görülür |
|-----|---------|------------|
| Müşteri | `5321100090` | Harita, sipariş, cüzdan (~2500 ₺), örnek işler |
| Hizmet veren (Elif) | `5321100001` | Hizmet masası, gelen işler |
| Hizmet Admini | `5321100099` | **Yönetim** sekmesi, KPI, askı |

Kimlik + cihaz kilidi: demo hesaplarda işaretli. İlk açılışta izin penceresi çıkarsa “şimdilik geç”. Keşif müşteride kayıtlı; yeniden sorulursa “hizmet almak” + Çukurambar.

### 8–10 dk senaryo

1. **Müşteri** `5321100090` ile gir. OTP’yi ekrandan yaz. Harita: Çukurambar iğneleri.
2. **Acil teslim** anahtarını aç: liste daralır (acil açık verenler). Bir karta bas → sipariş sheet’i (paket, boy, pencere, tutar).
3. **Sipariş** sekmesi: pending / acil örnekleri. **Hesap** → cüzdan bakiyesi.
4. Çıkış. **Elif** `5321100001` ile gir. **Hizmet** masası: kabul / yıkama / hazır işler. Hazır siparişte teslim kodu müşteri ekranındadır (`5678` demo ready).
5. Çıkış. **Hizmet Admini** `5321100099`. Alttan **Yönetim**: KPI (geçmiş ay dolu), veren listesi, Elif kartı, “dikkat” rozeti. Askıya al (neden yaz) → müşteri listesinde Elif kaybolur; açınca döner.
6. İsteğe bağlı: müşteride yeni sipariş bırak, Elif kabul et, teslimde bekleyen kazanç `WALLET_PENDING_WAIT_MS` sonra bakiyeye geçer.

Bilinen sınırlar: acil kontenjan / 18:00 dönüş / 24 sa iade (3b) yok; kapıda renk grubu onayı yok; gerçek ödeme/çekim yok; otomatik askı yok.

## Deploy

Kalıcı `next start`. SQLite tek dosya; Vercel/serverless kullanılmaz.
