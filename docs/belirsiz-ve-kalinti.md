# Belirsiz liste + kalıntı taraması

Kaynak: `docs/daraltma-envanteri.md` D bölümü. Silinen dosyalar geri alınmadı. `appointments` tablosu ve `loyalty.ts` duruyor.

## D listesi — ne oldu

| Dosya / konu | Karar |
| --- | --- |
| `src/lib/db/appointments.ts` | **Duruyor.** Hiçbir servis import etmiyor. Çamaşır siparişi `orders.slot` string kullanır, bu tabloya yazmaz. `0011_appointments.sql` + `migrate.ts` CREATE duruyor. İleride randevu takvimi için kullanılabilir. |
| `src/lib/homeVisit.ts` | **Silindi.** Tip B SM (`ready` false). |
| `src/lib/homeVisit.test.ts` | **Silindi.** |
| `src/lib/fulfillment.ts` | **Ayıklandı.** Yalnız `deliveryStrategy`. `strategyFor` her zaman onu döner. `foodStrategy` / `homeVisitStrategy` / `isHomeVisitFulfillment` yok. |
| `src/lib/visitAddress.ts` + test | **Duruyor (belirsiz).** `orderService` artık bağlamıyor. Tam adres yalnız `home_visit` + confirmed+. Çamaşır kapı/nokta. |
| `src/lib/timeWindow.ts` + test | **Ayıklandı, dosya duruyor.** `musluk` süresi silindi. `durationMinutesFor` her zaman 60 dk. Slot tekerleği çamaşırda kullanılıyor. |
| `src/lib/loyalty.ts` | **Duruyor.** Silinmedi. Kullanım aşağıda. |
| `src/lib/geo.ts`, `src/lib/geo/distance.ts` | **Dokunulmadı.** Haversine; kategori metni yok. |
| `src/lib/moderation/*` | **Dokunulmadı.** Sipariş mesajı; kategori kuralı yok. |
| `src/lib/legal.ts` | **Ayıklandı, yapı duruyor.** `ADDRESS_SHARE_NOTICE` ve `CRIMINAL_RECORD_DECLARATION` silindi. `INDEPENDENT_TRADESPERSON_CLAUSE` duruyor (şu an import eden yok). |
| `src/lib/noticeCopy.ts` | **Zaten çamaşır.** `productName` alanı DB kolonundan geliyor, şablon kullanmıyor. |
| `src/lib/avatar.ts` | **Dokunulmadı.** İsim baş harfi / seed URL; kategori yok. |
| `provider_profiles.kyc_status` / `criminal_record_declared` | **Kolon duruyor.** Tamir beyanı için eklenmişti; şema düşürme ayrı iş. |

### `appointments` — neden silinmedi

Tablo çamaşıra bağlı değil. Sipariş oluşturma randevu satırı yazmıyor. İleride kapı teslim / slot takvimi aynı tabloyu kullanabilir. `getAppointmentForOrder` / `insertAppointment` yalnız kendi dosyasında.

### Loyalty — nerede kullanılıyor (silinmedi)

Pilotta sadakat kapatılacak; şimdi indirim hâlâ hesaplanıyor.

| Yer | Ne yapıyor |
| --- | --- |
| `src/lib/loyalty.ts` | Kademe: Komşu %0 / Güvenilir %5 (≥3 teslim) / Sadık %10 (≥8). `loyaltyFromDelivered`, `loyaltyRate`. |
| `src/lib/services/orderService.ts` | `createLaundryOrder` → `loyaltyRate(deliveredCount(userId))` quote’a girer. |
| `src/lib/pricing.ts` | `estimate` / `estimateFor` / `quote` `loyaltyRate` ile tutarı düşürür. |
| `src/lib/categories/customer.ts` | `quoteForProvider` aynı oranı PWA önizlemesine taşır. |
| `src/app/api/me/route.ts` | Session `loyalty: loyaltyFromDelivered(...)`. |
| `src/app/api/account/route.ts` | Hesap cevabı. |
| `src/app/api/auth/session/route.ts` | Login session. |
| `src/app/api/auth/passkey/route.ts` | Passkey session. |
| `src/components/AppShell.tsx` | `loyaltyRate` / `loyaltyLabel` → `CustomerApp`. |
| `src/components/CustomerApp.tsx` | Checkout metni: `%N indirim`. |
| `src/components/AccountScreen.tsx` | Damga / kademe kartı. |

Kapatmak için: `loyaltyRate`’i 0’a sabitlemek, session’dan `loyalty` çıkarmak, Account kartını gizlemek. Bu adımda yapılmadı.

## Bu adımda temizlenen gerçek kalıntı

- `homeVisit.ts` / `homeVisit.test.ts`
- `status.ts` davet (food) SM dalı; `status.test.ts` food senaryosu
- `CreateOrderInput` menü / kişi / alerji / randevu / ev adresi alanları
- `orderService` “menü ürünü yok” davet koruması
- `README.md` musluk / Tip A–B ürün notları
- `0010_washes.sql` yorumundaki “Araba yıkama” (tablo duruyor)
- `0011_appointments.sql` “eski Tip B” yorumu

## Grep sınıflandırması

Komut: `rg -ni "davet|dikis|tamir|teknoloji|araba|kurye|bahce|kargo|cikti|kislik|hali|odev|dil\\b|mezar|talk|grave|garden|carpet|lesson|preserve|repair|sewing"` (`node_modules`, `.git`, `data/*.db` hariç).

### Yanlış eşleşme (silinmedi)

| Eşleşme | Neden |
| --- | --- |
| `registry.test.ts` `davet` / `dikis` / `tamir` / `musluk` | Kapalı id’nin reddedildiğini doğrular. |
| `preferenceService.test.ts` `["camasir", "davet"]` | `davet` tercihten düşer. |
| `laundryBootstrap.test.ts` `provider_repairs`…`provider_graves` | Bu tabloların **olmaması** assert. |
| `fulfillment.test.ts` `home_visit` argümanı | Çamaşırın yine `deliveryStrategy` döndüğünü doğrular. |
| `docs/daraltma-envanteri.md` | Eski envanter; tarihçe. |
| `docs/db-camasir-daraltma.md` | SQL daraltma raporu. |
| `.cursor/rules/backend-hedef.mdc`, `genisleme.mdc` | Yol haritası metni. Bu adımda kural dosyası yazılmadı. |
| `package-lock.json` `preserve` / `supports-preserve-symlinks-flag` | npm paket adı. |

### Gerçek kalıntı (temizlendi)

Yukarıdaki “Bu adımda temizlenen” listesi. Diskte kategori API route’ları (`/me/talks`, `/me/graves` vb.) yok; yalnız `washes` + çamaşır `offer` / `profile` / `drop-points` / `availability`.

### Belirsiz — silinmedi, duruyor

| Ne | Neden |
| --- | --- |
| `src/lib/db/appointments.ts` + `appointments` tablosu | Takvim için tutuldu. |
| `src/lib/visitAddress.ts` + test | Home-visit adresi; sipariş yolu kopuk. |
| `src/lib/loyalty.ts` ve çağrıları | Pilotta kapatılacak; şimdi bağlı. |
| `WashServiceEditor.tsx` + `provider_washes` + `/api/providers/me/washes` | Önceki adımda yıkama kartı korundu. `categoryId !== "araba"` kapısı ölü: kayıtta `araba` yok, editör hiçbir zaman açılmaz, `addMyWash` 400 döner. |
| `src/lib/wash.ts`, `src/lib/db/washes.ts` | Aynı yığın. |
| `FulfillmentType` / `FulfillmentMode` içinde `home_visit` | `service_categories.fulfillment_mode` ve `orders.fulfillment_type` kolonları duruyor. `strategyFor` yok sayıyor. |
| `orders.product_id`, `product_name`, `guest_count`, `allergy_note`, `visit_*`, `address_share_consent` | `ensureColumns` ekliyor; sipariş insert’i null yazıyor. Kolon DROP ayrı iş. |
| `provider_profiles.kyc_status`, `criminal_record_declared` | Kullanılmayan tamir KYC kolonları. |
| `CategoryDef.usesFoodSm` | Her zaman `false`; kayıt alanı duruyor. |
| `customer.ts` `guests` / `productId` / boş katalog yardımcıları | PWA `pieces`’i `guests` diye iletiyor; çamaşır `catalogKey === "packages"`. |
| `src/lib/legal.ts` | Import yok; platform cümlesi duruyor. |

Yerel `data/komsudan.db` silinmedi. Eski kategori tabloları dosyada kalmış olabilir; sıfırlamak için önceki rapordaki backup+rm.
