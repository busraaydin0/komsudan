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

Tek migration: `db/migrations/0001_schema.sql`. İlk açılışta migrate + seed (`src/lib/db/seed.ts`, `seedCatalogData.ts`).

- **users** — telefon, rol, onboarding, tercihler (`preferred_category_ids` pilot için `["camasir"]`).
- **providers** — `id` + JSON `payload` (liste kartı); **provider_profiles**, **service_packages**, **provider_prices**, **provider_addon_prices**, kapasite günleri.
- **orders** — durum, boy, makine birimi, fiyat, ödeme durumu, handoff alanları.
- **order_items** — boy + ek satırları.
- **appointments** — alım/teslim pencereleri.
- **payments**, **wallets**, **wallet_ledger** — simüle authorize/capture + bakiye tutanağı.
- **reviews**, **disputes**, **messages**, **notifications**, **order_photos**.

SQLite: WAL, `foreign_keys=ON`, migrate/seed yalnızca process ilk açılışında.

## Sipariş durum makinesi

Kaynak: `src/lib/status.ts`, geçişler `canTransition` + `src/lib/services/orderService.ts` (`applyStatus`).

Durumlar (İngilizce id, UI Türkçe): `pending` → `accepted` → `dropped_off` / `washing` → `ironing` → `ready` → `completed`; terminal: `rejected`, `cancelled`, `disputed`, `admin_pending`.

Paket `tam` için ütü adımı (`ironing`) takip çizgisinde görünür.

## Kararlar

| Konu | Karar |
|------|--------|
| Deploy | Kalıcı `next start`; Vercel/serverless yok (SQLite tek dosya). |
| Ölçek | İleride Turso/Postgres; SQL yalnız `src/lib/db/`. |
| Kategori | Sabit çamaşır; `/api/categories` ve `service_categories` tablosu yok. |
| Fiyat | Sunucuda `provider_prices` + `quoteLaundry`; istemci tutar göndermez. |
| Keşif | Harita + `/api/catalog`; onboarding rol/konum/offer. |
| OTP | Geliştirmede `demoCode`; prod’da gerçek SMS henüz yok. |
| TypeScript | `strict: true`; `any` / `@ts-ignore` yok (knip + `npm run check`). |

Performans ölçümü: `docs/performans.md`, `npm test -- src/lib/perf/benchmark.test.ts`.
