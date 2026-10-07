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

Seed hizmet veren telefonları: `src/lib/db/seed.ts` (ör. Elif `5321100001`).

## Deploy

Kalıcı `next start`. SQLite tek dosya; Vercel/serverless kullanılmaz.
