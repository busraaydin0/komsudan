# Komşudan

Çukurambar (Ankara) komşu hizmet PWA’sı. Pilot: çamaşırı **kapıda** veya **gel al noktasında** bırak; komşu yıkayıp katlar. Eve kimse girmez.

Klasör adı `katla`, npm paketi `komsudan`. Arayüz Türkçe.

Repo: [github.com/busraaydin0/komsudan](https://github.com/busraaydin0/komsudan) · dal `main`

---

## Klonlayan ne görür?

**Aynı kodu** çalıştırırsın (harita, kategoriler, saat tekerleği, API). **Sahibinin canlı veritabanını değil.**

Git’te yok (ve olmamalı):

- `data/*.db` — senin siparişlerin, gerçek kullanıcıların
- `data/uploads/`
- `.env` sırları

İlk `npm run dev` boş SQLite açar (`data/komsudan.db`). Migration + seed: örnek komşular, gel al noktaları, yorumlar. OTP geliştirmede yanıtta `demoCode` döner.

---

## Çalıştırma

Node 20+ önerilir. Native derleme için `better-sqlite3` (Xcode / build tools).

```bash
git clone https://github.com/busraaydin0/komsudan.git
cd komsudan
cp .env.example .env
# .env içinde JWT_SECRET’i uzun rastgele bir dize yap
npm install
npm run dev
```

Tarayıcı: [http://localhost:3000](http://localhost:3000) — 3000 doluysa Next **3001** açar.

Kalıcı sunucu (Vercel/serverless **yok**; SQLite tek dosyaya yazar):

```bash
npm run build
npm run start
```

Test: `npm test`

---

## Uygulama sekmeleri

| URL | Ne |
|---|---|
| `/` | Harita, yakındakiler |
| `/?tab=siparis` | Sipariş |
| `/?tab=mesaj` | Mesajlar |
| `/?tab=hizmet` | Hizmet masası (kart + gelen iş) |
| `/?tab=hesap` | Hesap, bildirim |

`/hizmet` → `/?tab=hizmet`.

Harita: 2D / 3D. Yuvarlak pin = hizmet veren. Kesik kare = gel al noktası.

Giriş: telefon + SMS kodu. Dev’de kod JSON’da `demoCode`. Sipariş için ad, kimlik ve cihaz kilidi (passkey) gerekir. Keşifte “arıyorum / veriyorum” ve alan seçilir.

Seed hizmet veren telefonları (profil `id` = kullanıcı `id`): Elif `5321100001`, Ayşe `5321100002`, … kod: `src/lib/db/seed.ts`.

```bash
curl -s -X POST http://localhost:3000/api/auth/otp/request \
  -H 'content-type: application/json' \
  -d '{"phone":"5321100002"}'
# data.demoCode ile:
curl -s -X POST http://localhost:3000/api/auth/otp/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"5321100002","code":"......"}'
```

---

## Ürün notları

- **Fiyat ve durum client’tan gelmez.** Tutar sunucuda.
- Teslim yeri kullanıcıya **Gel al noktası** diye yazılır. API değeri hâlâ `drop: "nokta"`.
- Saat: 09:00–19:00, 15 dk adım, süre 60 dk. Kaydırmalı tekerlek. `Bugün 10:15–11:15`.
- **Musluk ayrı kategori değil.** Tamir kartının `home_visit` alt-tipi. `homeVisitStrategy.ready` **false** — eve giden sipariş elle açılmadan kabul edilmez.
- Tip A (`delivery`): evde/atölyede hazırla, kapı veya gel al. Çamaşır, davet, dikiş… mezar.
- Tip B (`home_visit`): eve git. Faz 8; randevu `start_at`/`end_at` + çakışma henüz yok.

Ödeme: siparişte authorize / teslimde capture (simülasyon). Bildirim: uygulama içi; gerçek SMS/push yok.

---

## Mimari

Next.js **16.3.2** App Router + React 19 + TypeScript + Tailwind 4 + MapLibre + `better-sqlite3` + zod + jose.

PWA şimdi; sonra RN / Flutter aynı **JSON API**’yi yer. Backend’i tek seferde yeniden yazma.

| Katman | Yer | Kural |
|---|---|---|
| HTTP | `src/app/api/**/route.ts` | parse, auth, zod. İş kuralı yok. SQL yok. |
| Servis | `src/lib/services/` | sipariş, fiyat, sağlayıcı, ödeme |
| DB | `src/lib/db/` | client, migrate, sorgu |
| Auth | `src/lib/auth/` | JWT, OTP, `requireAuth` |
| SQL | `db/migrations/0001_….sql` | numaralı, git’te |

Cevap zarfı: `{ "data": {} }` veya `{ "error": { "code", "message" } }`.

Pilot köprü: parça/birim fiyatı + Türkçe statü (`onay_bekliyor`). Hedefte kg + İngilizce lifecycle (`pending`). İkisi birden dönebilir.

**Deploy:** kalıcı `next start`. Ölçek: Turso veya Postgres; SQL yalnız `src/lib/db/`.

---

## Faz (1 Eylül 2026)

Bitti: 0–5 çekirdek, **6 ödeme**, **6.5 kategori**, **6.6 keşif**, **7 davet**, diğer Tip A kartlar, dispute/mesaj/pino parçaları.

**Sırada: Faz 8 home-visit** (3b randevu zamanı + overlap). `ready`’yi rastgele açma.

Orijinal “7 review / 8 dispute” **Faz 9+**.

---

## Bilerek yapma

- Fiyatı, status’u, teslim kodunu client’tan alma
- Route’a SQL veya state machine koyma
- `data/*.db` veya `.env` commit
- Vercel / serverless
- Musluk’u yeniden kategori açma
- Faz atlama

Commit mesajı Türkçe, neden odaklı.
