# Komşudan — mimari (çamaşır pilot)

Tek ürün: **Çamaşır Yıkama**, Çukurambar pilotu. Eve girilmez; teslim **kapı** (`drop: "kapi"`). Tutar ve sipariş durumu istemciden alınmaz.

## Katmanlar

```
src/app/api/**/route.ts  →  src/lib/validation  →  src/lib/services  →  src/lib/db
```

| Dizin | Sorumluluk |
|--------|------------|
| `src/app/api/` | HTTP, auth, zod, JSON zarfı (`lib/http/response`). İş kuralı ve SQL yok. |
| `src/lib/validation/` | Zod şemaları, `parseBody`. |
| `src/lib/services/` | Sipariş SM, fiyat, sağlayıcı, ödeme, katalog, foto, bildirim. |
| `src/lib/db/` | `better-sqlite3`, migration, sorgular. |
| `src/lib/auth/` | JWT, OTP, `requireAuth`, `routeAccount`. |
| `src/lib/moderation/` | Mesaj moderasyonu. |
| `src/lib/laundry/` | Pilot sabitleri: paket (`yikama` / `katlama` / `tam`), boy, ek, pilot alanı. **Kategori registry yok.** |
| `src/components/` | PWA; büyük ekranlar `components/laundry/**`. |
| `src/lib/types.ts` | Paylaşılan tipler. |

`src/server/` kullanılmaz (tarihsel; silindi).

Cevap zarfı: `{ "data": … }` veya `{ "error": { "code", "message" } }`.

## Veri modeli (özet)

Migration zinciri: `db/migrations/0001_….sql` (şema), `0002` (kapasite düzeltmesi), `0003` (eski çok-kategori tablo/kayıt temizliği), `0004` (cüzdan kademeleri). İlk açılışta migrate + seed (`src/lib/db/seed.ts`, `seedCatalogData.ts`).

- **users** — telefon, rol, onboarding, tercihler (`preferred_category_ids` pilot için `["camasir"]`).
- **providers** — `id` + JSON `payload` (liste kartı); **provider_profiles**, **service_packages**, **provider_prices**, **provider_addon_prices**, kapasite günleri.
- **orders** — durum, boy, makine birimi, fiyat, ödeme durumu, handoff alanları.
- **order_items** — boy + ek satırları.
- **appointments** — alım/teslim pencereleri.
- **payments**, **wallets**, **wallet_ledger**, **wallet_pending_earnings** — simüle authorize/capture + kademeli bakiye.
  `wallets.balance` kullanılabilir, `reserved` sipariş rezervi, `pending` teslim sonrası bekleyen kazanç. Hold: balance→reserved; iptal: reserved→balance; teslimde müşteri reserved düşer, hizmet veren `pending` + net (%10 komisyon düşülmüş). 24 saat sonra `pending`→`balance` (`wallet_pending_earnings.available_at`). Her hareket `wallet_ledger`.
- **reviews**, **disputes**, **messages**, **notifications**, **order_photos**.

SQLite: WAL, `foreign_keys=ON`, migrate/seed yalnızca process ilk açılışında.

## Sipariş durum makinesi

Kaynak: `src/lib/status.ts`, geçişler `canTransition` + `src/lib/services/orderService.ts` (`applyStatus`).

Durumlar (İngilizce id, UI Türkçe; spec eşlemesi `docs/URUN_REFERANS_v0.3.md` §3): `pending` → `accepted` → `dropped_off` (PICKUP) → `washing` → `ironing` → `ready` → `completed`; yan: `rejected`, `cancelled`, `disputed`.

`ready` hem READY hem RETURNING’dir; teslim kodu bu aşamada aktif.

`admin_pending`: kodsuz teslim için ek durum, yeni yaşam döngüsü değil, terminal değil (`ready` → `admin_pending` → `completed` | `disputed`; süper admin kararına kadar bekleme).

Paket `tam` için ütü adımı (`ironing`) takip çizgisinde görünür.

## Kararlar

| Konu | Karar |
|------|--------|
| Deploy | Kalıcı `next start`; Vercel/serverless yok (SQLite tek dosya). |
| Ölçek | İleride Turso/Postgres; SQL yalnız `src/lib/db/`. |
| Kategori | Sabit çamaşır; `/api/categories` ve `service_categories` tablosu yok. |
| Fiyat | Sunucuda `provider_prices` + `quoteLaundry`; istemci tutar göndermez. Acil zam `EXPRESS_BUMP` (0.40) yalnız `orders.express`; paket `express_surcharge_pct` fiyatı etkilemez. |
| Acil (3a) | Müşteri anahtarı; katalog `express`; alım bugün; teslim alım+24 sa; cevap 15 dk; takvim `express` query. Kontenjan/18:00/iade 3b. |
| Keşif | Harita + `/api/catalog`; onboarding rol/konum/offer. |
| OTP | Geliştirmede `demoCode`; prod’da gerçek SMS henüz yok. |
| TypeScript | `strict: true`; `any` / `@ts-ignore` yok (knip + `npm run check`). |

Performans ölçümü: `docs/performans.md`, `npm test -- src/lib/perf/benchmark.test.ts`.
