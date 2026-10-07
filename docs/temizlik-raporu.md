# Çamaşır-only temizlik raporu (2026-10-08)

Araçlar: `npx knip`, `npx depcheck`, geçici `noUnusedLocals` / `noUnusedParameters` + `npx tsc --noEmit`.

## Knip — kullanılmayan dosyalar (8)

| Dosya | Karar |
|-------|--------|
| `public/sw.js` | **Belirsiz** — PWA service worker; knip entry dışı kalabilir. |
| `src/components/TimeScrollPicker.tsx` | **Sil** — import yok (grep doğruladı). |
| `src/lib/categories/index.ts` | **Sil** — `@/lib/categories` import yok. |
| `src/lib/legal.ts` | **Sil** — import yok. |
| `src/lib/nudgeCopy.ts` | **Sil** — yalnız re-export; tüketim `noticeCopy`. |
| `src/lib/services/pricingService.ts` | **Sil** — yalnız re-export. |
| `src/server/orders.ts` | **Sil** — import yok. |
| `src/server/reviews.ts` | **Sil** — import yok. |

## Knip — kullanılmayan export’lar (özet)

**Silinecek / sadeleştirilecek (hedef madde 2):**

- `src/lib/loyalty.ts` — tüm dosya + `loyaltyRate`, session `loyalty`, UI, pricing.
- `orders.pickup_code` yardımcıları: `setPickupCode`, `bumpCodeAttempts`, `rotatePickupCode` (handoff sonrası ölü).
- `notifyPickupCodeRotated` — eski 6 haneli akış.
- `dropCreateSchema` — gel-al noktası kalktı.
- `timeWindow.ts`: `defaultPilotSlot`, `defaultSlotChoice`, `isAllowedOrderSlot`, `formatPilotSlot`, `parsePilotSlot`, `isFreeOrderSlot`, `APPOINTMENT_BUFFER_MINUTES`, `durationMinutesFor(kind)` kalıntısı.

**Belirsiz (şimdilik tut):**

- `ALLOWED_TRANSITIONS`, `LIFECYCLES` — dokümantasyon / ileride API; servis `fulfillment` kullanıyor.
- `handoffService` export’ları — test dışı çağrı az; P2 çekirdek.
- `public/sw.js`, portfolio API export’ları — pilot PWA kapsamı dışı knip.

## Depcheck

```
Unused devDependencies: @tailwindcss/postcss, @types/react-dom, tailwindcss
```

**Belirsiz** — PostCSS/Tailwind v4 build zincirinde kullanılıyor; depcheck false positive.

## tsc (noUnusedLocals / noUnusedParameters, geçici)

```
CustomerApp.tsx — fill, bar
ProviderDesk.tsx — ADDON_KINDS, ADDON_VARIANTS, setPickupAddons
computeSchedule.ts — now
```

Temizlik sırasında düzeltilecek.

## Kesin silinecekler (madde 2)

| Hedef | Durum |
|-------|--------|
| `loyalty.ts` + kullanımları | Diskte var → silinecek. |
| `visitAddress.ts` + test | **Zaten yok** (önceki daraltma). |
| `legal.ts` kullanılmayan | Dosya import edilmiyor → sil. |
| `timeWindow` ziyaret kalıntıları | Pilot slot / buffer / kind süre → sadeleştir. |
| `kyc_status`, `criminal_record_declared` | Yalnız `migrate.ts` addColumn → kaldır (SQLite kolon drop ayrı). |
| Gel-al noktası | Tablolar 0016’da düşürülmüş; `dropPointId` API/types/schema kalıntısı → temizle. |
| `0010_washes.sql` | Migration dosyası yok; `ensureColumns` içinde `DROP provider_washes` kalıyor → yorum/netleştir. |

## Metin taraması (madde 3)

| Desen | Bulgu |
|-------|--------|
| QR, mühür, torba, tartım, kişilik yer | **Yok** (`src/`). |
| kg | Yalnız DB alan adı `price_per_kg` (şema); kullanıcı metni değil. |
| parça / parça yeri | `OnboardingFlow`, `LaundryProfile` (`₺/parça`), `CustomerApp`, `data.ts`, `registry.test` → v0.3 diline çevir. |

## Bağımlılıklar (madde 4)

Kullanılmayan **production** paket yok (knip/depcheck). Dev paket silme **yapılmadı** (belirsiz).

## Ölü kod — grep + knip birlikte

| Öğe | knip | grep import | Karar |
|-----|------|-------------|--------|
| `loyalty.ts` | unused file exports | çok | Sil |
| `legal.ts` | unused file | 0 | Sil |
| `TimeScrollPicker` | unused | 0 | Sil |
| `categories/index.ts` | unused | 0 | Sil |
