# Çamaşır dışı 14 kategori — daraltma envanteri

Tarih: 2026-10-07. Kod değişmedi; bu dosya tarama notu.

Kapsam: `davet`, `dikis`, `tamir`, `teknoloji`, `araba`, `kurye`, `bahce`, `kargo`, `cikti`, `kislik`, `hali`, `odev`, `dil`, `mezar`.

Etiketler: **sil** (kategoriye özel dosya) · **ayıkla** (çamaşır da var, 14’lük dallar kesilecek) · **dokunma** (çamaşır/çekirdek; kategori yok) · **belirsiz** (Tip B / paylaşılan altyapı; silmek çamaşırı da etkileyebilir).

Numaralı `db/migrations/*.sql` runtime’da `src/lib/db/migrate.ts` `ensureColumns` ile yeniden uygulanıyor. SQL dosyasını silmek mevcut DB’den tablo düşürmez; `migrate.ts` içindeki `CREATE TABLE` / `INSERT` / `addColumn` durursa tablo yine oluşur.

---

## A. Silinecek adaylar (kategoriye özel dosyalar)

Kullanım (C) her satırın sonunda: grep ile bulunan import / çağrı yerleri.

### A1. Editörler — yalnız `ProviderDesk.tsx` import ediyor

| Etiket | Dosya | Kategori | Başka kullanım |
| --- | --- | --- | --- |
| sil | `src/components/FoodMenuEditor.tsx` | davet | `ProviderDesk.tsx` |
| sil | `src/components/SewingServiceEditor.tsx` | dikis | `ProviderDesk.tsx` |
| sil | `src/components/RepairServiceEditor.tsx` | tamir | `ProviderDesk.tsx` |
| sil | `src/components/TechServiceEditor.tsx` | teknoloji | `ProviderDesk.tsx` |
| sil | `src/components/WashServiceEditor.tsx` | araba | `ProviderDesk.tsx` |
| sil | `src/components/CourierServiceEditor.tsx` | kurye | `ProviderDesk.tsx` |
| sil | `src/components/GardenServiceEditor.tsx` | bahce | `ProviderDesk.tsx` |
| sil | `src/components/CargoServiceEditor.tsx` | kargo | `ProviderDesk.tsx` |
| sil | `src/components/PrintServiceEditor.tsx` | cikti | `ProviderDesk.tsx` |
| sil | `src/components/PreserveServiceEditor.tsx` | kislik | `ProviderDesk.tsx` |
| sil | `src/components/CarpetServiceEditor.tsx` | hali | `ProviderDesk.tsx` |
| sil | `src/components/LessonServiceEditor.tsx` | odev | `ProviderDesk.tsx` |
| sil | `src/components/TalkServiceEditor.tsx` | dil | `ProviderDesk.tsx` |
| sil | `src/components/GraveServiceEditor.tsx` | mezar | `ProviderDesk.tsx` |

Çamaşır editörü `LaundryProfile.tsx` **dokunma**.

### A2. Domain lib (`src/lib/*.ts`)

Ortak tüketiciler: kendi `*ServiceEditor` / `FoodMenuEditor`, `src/lib/categories/customer.ts`, `src/lib/services/orderService.ts`, `src/components/CustomerApp.tsx`. Ek yerler ayrı yazıldı.

| Etiket | Dosya | Kategori | Başka kullanım |
| --- | --- | --- | --- |
| sil | `src/lib/food.ts` | davet | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/sewing.ts` | dikis | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/repair.ts` | tamir | editor, customer.ts, orderService, CustomerApp, `providerService.ts` (`lockRepairSubtype`), `src/lib/db/repairs.ts` |
| sil | `src/lib/repair.test.ts` | tamir | vitest; yalnız `repair.ts` |
| sil | `src/lib/tech.ts` | teknoloji | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/wash.ts` | araba | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/courier.ts` | kurye | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/garden.ts` | bahce | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/cargo.ts` | kargo | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/print.ts` | cikti | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/preserve.ts` | kislik | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/carpet.ts` | hali | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/lesson.ts` | odev | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/talk.ts` | dil | editor, customer.ts, orderService, CustomerApp |
| sil | `src/lib/grave.ts` | mezar | editor, customer.ts, orderService, CustomerApp |

### A3. DB katmanı (`src/lib/db/`)

Ortak tüketiciler: `providerService.ts` (CRUD), `orderService.ts` (`get*` sipariş), `src/lib/db/catalog.ts` (`extrasForCategory`), `src/server/photos.ts` (`set*Photo`). Foto route’ları kendi `get*` + `toPublic*` import ediyor.

| Etiket | Dosya | Tablo / kategori | Ek kullanım |
| --- | --- | --- | --- |
| sil | `src/lib/db/products.ts` | `provider_products` / davet | `seed.ts` `upsertProduct`; `.../products/[id]/photo/route.ts` |
| sil | `src/lib/db/services.ts` | `provider_services` / dikis | `seed.ts`; `.../services/[id]/photo/route.ts` |
| sil | `src/lib/db/repairs.ts` | `provider_repairs` / tamir | `seed.ts`; photo route; `tamirHomeVisit.test.ts` |
| sil | `src/lib/db/tech.ts` | `provider_tech` / teknoloji | `seed.ts`; photo route |
| sil | `src/lib/db/washes.ts` | `provider_washes` / araba | `seed.ts`; photo route |
| sil | `src/lib/db/couriers.ts` | `provider_couriers` / kurye | `seed.ts`; photo route |
| sil | `src/lib/db/gardens.ts` | `provider_gardens` / bahce | `seed.ts`; photo route |
| sil | `src/lib/db/cargos.ts` | `provider_cargos` / kargo | `seed.ts`; photo route |
| sil | `src/lib/db/prints.ts` | `provider_prints` / cikti | `seed.ts`; photo route |
| sil | `src/lib/db/preserves.ts` | `provider_preserves` / kislik | `seed.ts`; photo route |
| sil | `src/lib/db/carpets.ts` | `provider_carpets` / hali | `seed.ts`; photo route |
| sil | `src/lib/db/lessons.ts` | `provider_lessons` / odev | `seed.ts`; photo route |
| sil | `src/lib/db/talks.ts` | `provider_talks` / dil | `seed.ts`; photo route |
| sil | `src/lib/db/graves.ts` | `provider_graves` / mezar | `seed.ts`; photo route |
| sil | `src/lib/services/tamirHomeVisit.test.ts` | tamir dropoff / musluk | `getRepair`, `createOrder`, `repairCreateSchema` |

### A4. HTTP — `src/app/api/providers/me/<kategori>/**`

Her kategoride 3 dosya: koleksiyon `route.ts`, `[id]/route.ts`, `[id]/photo/route.ts`. Hepsi `providerService` list/add/patch/remove + `server/photos` `set*Photo`.

| Etiket | Kategori | Dizin |
| --- | --- | --- |
| sil | davet | `src/app/api/providers/me/products/` (3 route) |
| sil | dikis | `src/app/api/providers/me/services/` (3) |
| sil | tamir | `src/app/api/providers/me/repairs/` (3) |
| sil | teknoloji | `src/app/api/providers/me/tech/` (3) |
| sil | araba | `src/app/api/providers/me/washes/` (3) |
| sil | kurye | `src/app/api/providers/me/couriers/` (3) |
| sil | bahce | `src/app/api/providers/me/gardens/` (3) |
| sil | kargo | `src/app/api/providers/me/cargos/` (3) |
| sil | cikti | `src/app/api/providers/me/prints/` (3) |
| sil | kislik | `src/app/api/providers/me/preserves/` (3) |
| sil | hali | `src/app/api/providers/me/carpets/` (3) |
| sil | odev | `src/app/api/providers/me/lessons/` (3) |
| sil | dil | `src/app/api/providers/me/talks/` (3) |
| sil | mezar | `src/app/api/providers/me/graves/` (3) |

Çamaşırla paylaşılan (silme): `offer/route.ts` (**ayıkla**), `profile/`, `availability/`, `drop-points/` (**dokunma**).

### A5. Numaralı migration SQL

| Etiket | Dosya | Ne yaratıyor |
| --- | --- | --- |
| sil | `db/migrations/0010_davet.sql` | `service_categories` satırı davet |
| sil | `db/migrations/0011_davet_products.sql` | `CREATE TABLE provider_products` (migrate.ts’te CREATE yok, yalnız `addColumn`) |
| sil | `db/migrations/0012_davet_product_card.sql` | `provider_products` kart kolonları |
| sil | `db/migrations/0013_dikis.sql` | kategori + `provider_services` |
| sil | `db/migrations/0014_tamir.sql` | kategori + `provider_repairs` |
| sil | `db/migrations/0015_teknoloji.sql` | kategori + `provider_tech` |
| sil | `db/migrations/0016_araba.sql` | kategori + `provider_washes` |
| sil | `db/migrations/0017_kurye.sql` | kategori + `provider_couriers` |
| sil | `db/migrations/0018_bahce.sql` | kategori + `provider_gardens` |
| sil | `db/migrations/0019_kargo.sql` | kategori + `provider_cargos` |
| sil | `db/migrations/0020_cikti.sql` | kategori + `provider_prints` |
| sil | `db/migrations/0021_kislik.sql` | kategori + `provider_preserves` |
| sil | `db/migrations/0022_hali.sql` | kategori + `provider_carpets` |
| sil | `db/migrations/0023_odev.sql` | kategori + `provider_lessons` |
| sil | `db/migrations/0024_dil.sql` | kategori + `provider_talks` |
| sil | `db/migrations/0025_mezar.sql` | kategori + `provider_graves` |
| sil | `db/migrations/0029_tamir_home_visit.sql` | `musluk` sil, `appointments` tablosu, tamir home_visit notu |

`0008_categories.sql` yalnız `camasir` insert — **dokunma**. `appointments` hem 0029 hem `migrate.ts` içinde; tablo dosyası silinince kod tarafı D’de.

### A6. `migrate.ts` içine gömülü bloklar (dosya silinmez → **ayıkla**)

Dosya: `src/lib/db/migrate.ts` (**ayıkla**). Kesilecek gömülü parçalar:

- `INSERT`/`UPDATE service_categories` davet…mezar (satır ~189–312); sonda `is_active` zaten camasir=1 diğer=0
- `CREATE TABLE` + index: `provider_services`, `provider_repairs`, `provider_tech`, `provider_washes`, `provider_couriers`, `provider_gardens`, `provider_cargos`, `provider_prints`, `provider_preserves`, `provider_carpets`, `provider_lessons`, `provider_talks`, `provider_graves`
- `addColumn` orders: `product_id`, `product_name`, `guest_count`, `allergy_note`, `fulfillment_type`, `visit_*`, `address_share_consent` (çamaşır siparişi bunları null bırakıyor; kolon silmek ayrı migration)
- `addColumn provider_repairs.fulfillment_type`
- `addColumn provider_profiles.kyc_status`, `criminal_record_declared` (tamir beyanı; `CRIMINAL_RECORD_DECLARATION` hiç import edilmiyor)
- `CREATE TABLE appointments`
- `addColumn provider_products.*` (9 kolon)

`provider_products` için `CREATE TABLE` migrate.ts’te yok; canlı tablo 0011 veya eski koşudan.

### A7. Seed / statik sağlayıcı kayıtları (dosyalar **ayıkla**, satırlar sil adayı)

`src/lib/data.ts` `PROVIDERS` (~53 kayıt): 8 çamaşır (categoryId yok → camasir): `elif`, `ayse`, `merve`, `zeynep`, `gulsen`, `selin`, `burak`, `leyla`.

Çamaşır dışı (~45):

| Kategori | Seed id |
| --- | --- |
| davet (6) | fatma, hatice, nurcan, sevim, dilek, cemile |
| dikis (3) | guler, nuran, tulay |
| tamir (3) | hasan, metin, ozkan |
| teknoloji (3) | emre, caner, baris |
| araba (3) | okan, serkan, volkan |
| kurye (3) | deniz, kaan, yusuf |
| bahce (3) | selda, tarik, nilay |
| kargo (3) | hakan + 2 |
| cikti (3) | 3 kayıt |
| kislik (3) | 3 kayıt |
| hali (3) | 3 kayıt |
| odev (3) | 3 kayıt |
| dil (3) | 3 kayıt |
| mezar (3) | 3 kayıt |

`src/lib/db/seed.ts` (**ayıkla**): `upsertProduct`…`upsertGrave` döngüleri ve 14 `./products`…`./graves` importu. Çamaşır yolu `upsertPackage` kalır. `SEEDED_AVATARS` içinde fatma/hatice/nurcan — ayıkla.

---

## B. Çamaşır ile karışık (ayıklanacak, silinmeyecek)

| Etiket | Dosya | Çamaşır dışı dallar |
| --- | --- | --- |
| ayıkla | `src/lib/categories/registry.ts` | 14 `CATEGORY_IDS` + `CATALOG` + `CATALOG_CATEGORY_IDS`; `musluk→tamir` alias; `usesFoodSm`; editor/table/catalogKey 14’lük. `PUBLIC_CATEGORY_IDS` / `camasir` kalır. |
| ayıkla | `src/lib/categories/index.ts` | 14 id re-export; `PublicCategoryId` kalır. |
| ayıkla | `src/lib/categories/registry.test.ts` | “15 kategori”, kapasite map 14 id, zod mezar, musluk→tamir. Pilot-camasir testi kalır. |
| ayıkla | `src/lib/categories/customer.ts` | 14 domain import; `HELLO`/`NOTE`; `isUnitCatalog`; davet alerji; tamir/teknoloji canOrder; `placeOrderInput` 14 switch; `homeVisitStrategy`. Çamaşır: `estimateFor` / paket yolu. |
| ayıkla | `src/lib/services/orderService.ts` | `createDavetOrder`…`createMezarOrder` (14); `createTamirOrder` randevu/adres; 14 `get*`/`dropsFor*`. Kalır: `createLaundryOrder`. |
| ayıkla | `src/lib/services/providerService.ts` | `ensureCatalogOffer`; `lockRepairSubtype`; `list/add/patch/removeMy{Product…Grave}` (~14×4). Kalır: `ensureLaundryOffer`, paket, slot, drop, `listNearby` (clamp zaten camasir). |
| ayıkla | `src/components/CustomerApp.tsx` | 14 `from @/lib/{food…grave}`; listede `categoryId === davet…mezar` kartları (~1034–1475); checkout `davet`…`mezar` bayrakları (~1663+); alerji, musluk `ADDRESS_SHARE_NOTICE`, `TimeScrollPicker` randevu. Kalır: çamaşır paket/kurutma/harita. |
| ayıkla | `src/components/ProviderDesk.tsx` | 14 editor mount (~203–226); sipariş kartı `packageId === "davet"` kişilik metin. Kalır: `LaundryProfile`, gelen sipariş, cüzdan. |
| ayıkla | `src/components/OnboardingFlow.tsx` | `offerCat === davet…mezar` ipuçları (~361–425); `isCatalogCategoryId` offer POST; `INDEPENDENT_TRADESPERSON_CLAUSE` tamir. Liste API’den tek camasir; ölü dallar. |
| dokunma | `src/components/AccountScreen.tsx` | Kategori id yok. “hizmet alanı” keşif geri dönüşü genel. |
| dokunma | `src/components/MapCanvas.tsx` | Kategori yok; `seatTone`. |
| ayıkla | `src/lib/types.ts` | `ProviderProduct`…`ProviderGrave` (~14 tip); `Provider` extras; `Order`/`CreateOrderInput` `productId`, `guestCount`, `allergyNote`, `appointment*`, `visit*`, `fulfillmentType`. Kalır: paket, kurutma, sipariş çekirdeği. |
| ayıkla | `src/lib/validation/provider.schema.ts` | `productCreateSchema`…`gravePatchSchema` (14 çift); `serviceOfferSchema` camasir dışı `categoryId` enum. Kalır: `laundryOfferSchema`, `profilePatchSchema` paket, `slotCreateSchema`, `dropCreateSchema`. |
| ayıkla | `src/lib/validation/order.schema.ts` | `guestCount`, `allergyNote`, `productId`, `appointment*`, `visit*`, `addressShareConsent`; patch action `confirm`/`start_travel`/`start_work` (Tip B). Kalır: `packageId` yikama/katlama/tam, `pieces`, `drop`, `slot`. |
| dokunma | `src/lib/validation/category.schema.ts` | Genel `category_id` parse; id listesi yok. |
| dokunma | `src/lib/validation/preferences.schema.ts` | Genel string dizi. |
| ayıkla | `src/lib/api.ts` | `postMyProduct`…`deleteMyGrave` (~14×4 client). Kalır: session, sipariş, `postMyOffer` (çamaşır), katalog, cüzdan, mesaj. |
| ayıkla | `src/lib/db/migrate.ts` | A6. Kalır: çamaşır kolonları, auth, orders çekirdek, wallets. |
| ayıkla | `src/lib/db/seed.ts` | 14 upsert. Kalır: çamaşır paket seed. |
| ayıkla | `src/lib/data.ts` | ~45 kategori kaydı + ilgili `Provider*` import. Kalır: `PILOT`, `PACKAGES`, 8 çamaşır, `NEIGHBORHOODS`, drop noktaları. |
| ayıkla | `src/lib/noticeCopy.ts` | `ORDER` + `NUDGES` 14 kategori bloğu + `qtyLabel` switch. Kalır: `camasir`. |
| ayıkla | `src/lib/nudgeCopy.ts` | Yalnız `noticeCopy` re-export; 14’lük metin orada. |
| ayıkla | `src/lib/status.ts` | `usesFoodSm(packageId)` → davet-tipi kısaltılmış SM (yıkama/ütü yok). |
| ayıkla | `src/lib/status.test.ts` | `nextStatus(..., "davet")`. |
| ayıkla | `src/lib/fulfillment.ts` | `foodStrategy`; `strategyFor` `isCatalogCategoryId` → food; `homeVisitStrategy`. Kalır: `deliveryStrategy` çamaşır. |
| ayıkla | `src/lib/fulfillment.test.ts` | tamir dropoff/home_visit, foodStrategy. |
| ayıkla | `src/lib/pricing.ts` | `GUESTS_*`, `estimateFood`. Kalır: parça fiyatı, min sipariş, express. |
| ayıkla | `src/lib/legal.ts` | `INDEPENDENT_TRADESPERSON_CLAUSE` (Onboarding tamir); `ADDRESS_SHARE_NOTICE` (CustomerApp musluk). `CRIMINAL_RECORD_DECLARATION` hiç import edilmiyor. |
| ayıkla | `src/lib/db/catalog.ts` | `extrasForCategory` 14 tablo hydrate. |
| ayıkla | `src/lib/db/orders.ts` | `product_id`, `guest_count`, `allergy_note`, `fulfillment_type`, `visit_*`. |
| ayıkla | `src/lib/db/providers.ts` | `category_id` çamaşırda da var; 14 silinince kolon kalır. `listProfilesInBox` kategori filtresi. |
| ayıkla | `src/lib/db/categories.ts` | `listActiveCategories` public filtre; satırlar migrate’de durur. |
| ayıkla | `src/server/photos.ts` | `setProductPhoto`…`setGravePhoto` (14). Kalır: sipariş/portföy/avatar/yorum foto. |
| ayıkla | `src/server/catalog.ts` | `clampPublicCategoryIds` (zaten camasir); `toProvider` extras `db/catalog`. |
| ayıkla | `src/lib/auth/types.ts` | `preferredCategoryIds` public filtre; 14 id okumada düşer. |
| ayıkla | `src/lib/services/preferenceService.ts` | public id + `musluk→tamir` sonra düşer. |
| ayıkla | `src/lib/services/preferenceService.test.ts` | musluk alias beklentisi. |
| ayıkla | `src/app/api/providers/me/offer/route.ts` | `ensureServiceOffer` → katalog id’de 400; çamaşır kurutma/paket. |
| dokunma | `src/components/LaundryProfile.tsx` | `isCatalogCategoryId` ile kendini gizler; çamaşır kartı. |
| dokunma | `src/components/TimeScrollPicker.tsx` | Saat tekeri; çamaşır `SlotWheel` kullanıyor. |
| dokunma | `src/components/AppShell.tsx` | Keşif/onboarding kabuğu; kategori listesi yok. |

---

## C. Silme adayları — import özeti

Başka yerden **yalnızca bu karışık dosyalar** tutuyor; onlar ayıklanınca A dosyaları köksüz kalır.

| Silme kümesi | Tutulduğu yer (grep) |
| --- | --- |
| 14 editor | yalnızca `ProviderDesk.tsx` |
| 14 `src/lib/{food…grave}.ts` | editor + `customer.ts` + `orderService.ts` + `CustomerApp.tsx`; `repair.ts` ayrıca `providerService.ts`, `db/repairs.ts` |
| 14 `src/lib/db/{products…graves}.ts` | `providerService.ts`, `orderService.ts`, `db/catalog.ts`, `server/photos.ts`, `seed.ts`, ilgili `.../photo/route.ts`; `repairs.ts` + `tamirHomeVisit.test.ts` |
| 42 me/\<kategori\> route | Next App Router; client `api.ts` `fetch/post/patch/deleteMy*` |
| 17 migration SQL | git tarihi; runtime `migrate.ts` kopyası |
| `repair.test.ts` | vitest, `repair.ts` |
| `tamirHomeVisit.test.ts` | vitest, tamir sipariş / schema |

Döngü yok: editor → domain lib → db; route → providerService → db. Çamaşır paket tablosu `service_packages` / `db/providers.ts` bu kümeye girmiyor.

---

## D. Belirsiz

| Etiket | Dosya | Neden |
| --- | --- | --- |
| belirsiz | `src/lib/db/appointments.ts` | Yalnız `orderService` tamir home_visit randevu insert/get. Çamaşır slot string kullanır, bu tabloya yazmaz. 0029 + migrate CREATE. Tip B geri gelirse gerekir. |
| belirsiz | `src/lib/homeVisit.ts` | Tip B SM (`ready` false). `fulfillment.ts` re-export; `orderService` geçiş. Çamaşır `status.ts` delivery SM. |
| belirsiz | `src/lib/homeVisit.test.ts` | Yalnız homeVisit SM. |
| belirsiz | `src/lib/visitAddress.ts` | Tam adres yalnız `home_visit` + confirmed+. `orderService` toPublic. Çamaşır kapı/nokta; mahalle zaten var. |
| belirsiz | `src/lib/visitAddress.test.ts` | Yalnız visitAddress. |
| belirsiz | `src/lib/timeWindow.ts` | Çamaşır `SlotWheel` / `TimeScrollPicker` / `isAllowedOrderSlot` kullanır. İçinde `CATEGORY_DEFAULT_DURATION_MINUTES.musluk = 60`. Ayıkla eğilimi: musluk sabitini sil, dosyayı tut. |
| belirsiz | `src/lib/timeWindow.test.ts` | “musluk süresi 60 dk” + genel 15 dk adım. |
| dokunma | `src/lib/loyalty.ts` | Kategori yok; teslim sayısı. `orderService`, `/me`, session. |
| dokunma | `src/lib/geo.ts` | Haversine; kategori yok. |
| dokunma | `src/lib/geo/distance.ts` | `geo` re-export; `providerService` nearby. |
| dokunma | `src/lib/moderation/messageModeration.ts` | Sipariş mesajı; kategori yok. |
| dokunma | `src/lib/moderation/messageModeration.test.ts` | |
| dokunma | `src/lib/moderation/personalInfo.ts` | |
| dokunma | `src/lib/moderation/offPlatform.ts` | |
| dokunma | `src/lib/moderation/spam.ts` | |
| dokunma | `src/lib/moderation/profanity.ts` | |
| dokunma | `src/lib/moderation/normalize.ts` | |
| belirsiz | `provider_profiles.kyc_status` / `criminal_record_declared` (`migrate.ts`) | Tamir Faz 8 beyanı; `legal.CRIMINAL_RECORD_DECLARATION` kullanılmıyor. Kolon silmek ayrı iş. |

---

## Toplam

| Etiket | Benzersiz dosya | Nasıl |
| --- | --- | --- |
| sil | 103 | 14 editor + 15 domain (14 lib + `repair.test`) + 14 db lib + `tamirHomeVisit.test` + 42 route + 17 SQL |
| ayıkla | 34 | B tablosundaki `ayıkla` satırları (`migrate.ts` / `seed.ts` / `data.ts` dahil) |
| dokunma | 18 | B: AccountScreen, MapCanvas, LaundryProfile, TimeScrollPicker, AppShell, `category.schema`, `preferences.schema`, `0008_categories.sql`. D: loyalty, geo, geo/distance, 7 moderation |
| belirsiz | 7 | appointments, homeVisit + test, visitAddress + test, timeWindow + test |

**Envanterde adı geçen benzersiz dosya: 162.**

`0029_tamir_home_visit.sql` **sil**; `src/lib/db/appointments.ts` **belirsiz** (aynı tablo, iki etiket). `provider_profiles` kyc kolonları dosya değil, D notu. `migrate.ts` CREATE blokları A6’da listelendi ama dosya B’de **ayıkla**.
